import { and, eq, inArray } from "drizzle-orm";
import {
    db,
    externalEntityMap,
    externalIntegrations,
    externalSyncConflicts,
    externalSyncState,
    labels,
    lists,
    taskLabels,
    tasks,
} from "@/db";
import { decryptToken } from "./crypto";
import { createTodoistClient, fetchTodoistSnapshot } from "./service";
import { mapLocalTaskToTodoist, mapTodoistTaskToLocal } from "./mapper";
import type { Task } from "@doist/todoist-api-typescript";
import { applyListLabelMapping, buildDefaultProjectAssignments } from "./mapping";

type SyncResult = {
    status: "ok" | "error";
    error?: string;
    conflictCount?: number;
};

type MappingState = {
    projects: { projectId: string; listId: number | null }[];
    labels: { labelId: string; listId: number | null }[];
};

export async function syncTodoistForUser(userId: string): Promise<SyncResult> {
    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "todoist")),
    });

    if (!integration) {
        return { status: "error", error: "Todoist integration not connected." };
    }

    const accessToken = await decryptToken({
        ciphertext: integration.accessTokenEncrypted,
        iv: integration.accessTokenIv,
        tag: integration.accessTokenTag,
        keyId: integration.accessTokenKeyId,
    });

    const client = createTodoistClient(accessToken);
    const previousSyncState = await db.query.externalSyncState.findFirst({
        where: and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")),
    });
    const lastSyncedAt = previousSyncState?.lastSyncedAt ?? null;
    const syncInProgress = previousSyncState?.status === "syncing"
        && !!previousSyncState.updatedAt
        && Date.now() - previousSyncState.updatedAt.getTime() < 5 * 60_000;

    if (syncInProgress) {
        return { status: "error", error: "Todoist sync already in progress." };
    }

    await db
        .insert(externalSyncState)
        .values({
            userId,
            provider: "todoist" as const,
            status: "syncing",
            error: null,
        })
        .onConflictDoUpdate({
            target: [externalSyncState.userId, externalSyncState.provider],
            set: { status: "syncing", error: null },
        });

    try {
        const snapshot = await fetchTodoistSnapshot(client, { lastSyncedAt });

        const [existingLists, entityMappings] = await Promise.all([
            db.select().from(lists).where(eq(lists.userId, userId)),
            db
                .select()
                .from(externalEntityMap)
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "todoist"))),
        ]);

        const projectMappings = entityMappings.filter((mapping) => mapping.entityType === "list");
        const listLabelMappings = entityMappings.filter((mapping) => mapping.entityType === "list_label");
        const labelMappings = entityMappings.filter((mapping) => mapping.entityType === "label");
        const taskMappings = entityMappings.filter((mapping) => mapping.entityType === "task");
        const hasProjectMappingRules = projectMappings.length > 0;
        const hasMappedProjects = projectMappings.some((mapping) => mapping.localId !== null);
        const hasLabelMappings = listLabelMappings.length > 0;
        const hasScopedMappings = hasProjectMappingRules || hasLabelMappings;
        const mappedProjectIds = new Set(
            projectMappings
                .filter((mapping) => mapping.localId !== null)
                .map((mapping) => mapping.externalId)
        );
        const mappedLabelIds = new Set(
            listLabelMappings
                .filter((mapping) => mapping.localId !== null)
                .map((mapping) => mapping.externalId)
        );
        const snapshotLabelIds = new Set(snapshot.labels.map((label) => label.id));
        const snapshotLabelNameToId = new Map<string, string>();
        for (const label of snapshot.labels) {
            const normalizedName = normalizeLabelName(label.name);
            if (!snapshotLabelNameToId.has(normalizedName)) {
                snapshotLabelNameToId.set(normalizedName, label.id);
            }
        }
        const remoteTasksInScope = hasScopedMappings
            ? snapshot.tasks.filter((task) =>
                isTodoistTaskInScope(task, mappedProjectIds, mappedLabelIds, snapshotLabelIds, snapshotLabelNameToId)
            )
            : snapshot.tasks;

        const projectAssignments = projectMappings.length
            ? projectMappings.map((mapping) => ({
                projectId: mapping.externalId,
                listId: mapping.localId,
            }))
            : hasLabelMappings
                ? []
            : await ensureProjectAssignments({
                userId,
                projects: snapshot.projects,
                existingLists,
            });

        const mappingState: MappingState = {
            projects: projectAssignments,
            labels: listLabelMappings.map((mapping) => ({
                labelId: mapping.externalId,
                listId: mapping.localId,
            })),
        };

        const [localTasks, localLabels] = await Promise.all([
            db.select().from(tasks).where(eq(tasks.userId, userId)),
            db.select().from(labels).where(eq(labels.userId, userId)),
        ]);
        const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));
        const localTaskIds = localTasks.map((task) => task.id);
        const localTaskLabelMap = await fetchTaskLabels(localTaskIds);
        const localLabelToExternal = new Map(
            labelMappings
                .filter((mapping) => mapping.localId !== null)
                .map((mapping) => [mapping.localId as number, mapping.externalId])
        );
        const labelMappingByLocalId = new Map<number, (typeof externalEntityMap.$inferSelect)>();
        for (const mapping of labelMappings) {
            if (mapping.localId !== null) {
                labelMappingByLocalId.set(mapping.localId, mapping);
            }
        }
        const conflictKeys = await getExistingConflictKeys(userId);
        const remoteTaskMap = new Map(remoteTasksInScope.map((task) => [task.id, task]));

        const labelIdMap = new Map<string, number>();
        for (const mapping of labelMappings) {
            if (mapping.localId) {
                labelIdMap.set(mapping.externalId, mapping.localId);
            }
        }

        const remoteLabelsById = new Map(snapshot.labels.map((label) => [label.id, label]));
        const remoteLabelsByNormalizedName = new Map<string, (typeof snapshot.labels)[number]>();
        for (const label of snapshot.labels) {
            const normalized = normalizeLabelName(label.name);
            if (!remoteLabelsByNormalizedName.has(normalized)) {
                remoteLabelsByNormalizedName.set(normalized, label);
            }
        }

        const scopedLocalLabelIds = collectScopedLocalLabelIds({
            localTasks,
            localTaskLabelMap,
            mappingState,
            hasScopedMappings,
        });
        for (const mappedLocalLabelId of localLabelToExternal.keys()) {
            scopedLocalLabelIds.add(mappedLocalLabelId);
        }

        for (const localLabel of localLabels) {
            if (hasScopedMappings && !scopedLocalLabelIds.has(localLabel.id)) {
                continue;
            }

            const mappedExternalId = localLabelToExternal.get(localLabel.id);
            if (mappedExternalId) {
                const remoteLabel = remoteLabelsById.get(mappedExternalId);
                if (!remoteLabel) {
                    const recreatedLabel = await client.createLabel({
                        name: localLabel.name,
                        order: localLabel.position,
                    });
                    if (!recreatedLabel?.id) {
                        continue;
                    }

                    const mappingRow = labelMappingByLocalId.get(localLabel.id);
                    if (mappingRow) {
                        await db
                            .update(externalEntityMap)
                            .set({ externalId: recreatedLabel.id })
                            .where(eq(externalEntityMap.id, mappingRow.id));

                        await db
                            .update(externalEntityMap)
                            .set({ externalId: recreatedLabel.id })
                            .where(
                                and(
                                    eq(externalEntityMap.userId, userId),
                                    eq(externalEntityMap.provider, "todoist"),
                                    eq(externalEntityMap.entityType, "list_label"),
                                    eq(externalEntityMap.externalId, mappingRow.externalId)
                                )
                            );

                        for (const listLabelMapping of mappingState.labels) {
                            if (listLabelMapping.labelId === mappingRow.externalId) {
                                listLabelMapping.labelId = recreatedLabel.id;
                            }
                        }
                        if (mappedLabelIds.has(mappingRow.externalId)) {
                            mappedLabelIds.delete(mappingRow.externalId);
                            mappedLabelIds.add(recreatedLabel.id);
                        }
                    } else {
                        await db.insert(externalEntityMap).values({
                            userId,
                            provider: "todoist" as const,
                            entityType: "label" as const,
                            localId: localLabel.id,
                            externalId: recreatedLabel.id,
                        });
                    }

                    localLabelToExternal.set(localLabel.id, recreatedLabel.id);
                    labelIdMap.set(recreatedLabel.id, localLabel.id);
                    remoteLabelsById.set(recreatedLabel.id, recreatedLabel);
                    remoteLabelsByNormalizedName.set(normalizeLabelName(recreatedLabel.name), recreatedLabel);
                    continue;
                }

                const remoteOrder = remoteLabel.order ?? 0;
                const localOrder = localLabel.position ?? 0;
                if (remoteLabel.name !== localLabel.name || remoteOrder !== localOrder) {
                    const updatedLabel = await client.updateLabel(mappedExternalId, {
                        name: localLabel.name,
                        order: localLabel.position,
                    });
                    remoteLabelsById.set(mappedExternalId, updatedLabel);
                    remoteLabelsByNormalizedName.set(normalizeLabelName(updatedLabel.name), updatedLabel);
                }
                continue;
            }

            const normalizedName = normalizeLabelName(localLabel.name);
            const existingRemoteLabel = remoteLabelsByNormalizedName.get(normalizedName);
            if (existingRemoteLabel && !labelIdMap.has(existingRemoteLabel.id)) {
                await db.insert(externalEntityMap).values({
                    userId,
                    provider: "todoist" as const,
                    entityType: "label" as const,
                    localId: localLabel.id,
                    externalId: existingRemoteLabel.id,
                });
                localLabelToExternal.set(localLabel.id, existingRemoteLabel.id);
                labelIdMap.set(existingRemoteLabel.id, localLabel.id);
                continue;
            }

            const createdRemoteLabel = await client.createLabel({
                name: localLabel.name,
                order: localLabel.position,
            });
            if (!createdRemoteLabel?.id) {
                continue;
            }

            await db.insert(externalEntityMap).values({
                userId,
                provider: "todoist" as const,
                entityType: "label" as const,
                localId: localLabel.id,
                externalId: createdRemoteLabel.id,
            });
            localLabelToExternal.set(localLabel.id, createdRemoteLabel.id);
            labelIdMap.set(createdRemoteLabel.id, localLabel.id);
            remoteLabelsById.set(createdRemoteLabel.id, createdRemoteLabel);
            remoteLabelsByNormalizedName.set(normalizeLabelName(createdRemoteLabel.name), createdRemoteLabel);
        }

        const scopedRemoteLabelIds = hasScopedMappings
            ? hasMappedProjects
                ? new Set([
                    ...mappedLabelIds,
                    ...remoteTasksInScope.flatMap((task) => task.labels ?? []),
                ])
                : new Set(mappedLabelIds)
            : null;

        for (const label of remoteLabelsById.values()) {
            if (scopedRemoteLabelIds && !scopedRemoteLabelIds.has(label.id)) {
                continue;
            }
            if (labelIdMap.has(label.id)) {
                continue;
            }

            const created = await db.insert(labels).values({
                userId,
                name: label.name,
                position: label.order ?? 0,
            }).returning();

            const localLabel = created[0];
            if (!localLabel) {
                continue;
            }

            await db.insert(externalEntityMap).values({
                userId,
                provider: "todoist" as const,
                entityType: "label" as const,
                localId: localLabel.id,
                externalId: label.id,
            });
            labelIdMap.set(label.id, localLabel.id);
        }

        const remoteLabelIdSet = new Set<string>();
        const remoteLabelNameToId = new Map<string, string>();
        const externalLabelToName = new Map<string, string>();
        for (const label of remoteLabelsById.values()) {
            remoteLabelIdSet.add(label.id);
            externalLabelToName.set(label.id, label.name);
            const normalizedName = normalizeLabelName(label.name);
            if (!remoteLabelNameToId.has(normalizedName)) {
                remoteLabelNameToId.set(normalizedName, label.id);
            }
        }

        const existingTaskMap = new Map(taskMappings.map((mapping) => [mapping.externalId, mapping.localId]));
        const pendingTasks = remoteTasksInScope.filter((task) => !existingTaskMap.has(task.id));
        const [rootTasks, childTasks] = splitTasksByParent(pendingTasks);

        await detectTaskConflicts({
            userId,
            todoistTasks: remoteTasksInScope,
            taskMappings,
            localTaskMap,
            localTaskLabelMap,
            localLabelToExternal,
            conflictKeys,
            mappingState,
            lastSyncedAt,
            hasScopedMappings,
            remoteLabelIdSet,
            remoteLabelNameToId,
        });

        await createTodoistTasks({
            userId,
            tasks: rootTasks,
            mappingState,
            labelIdMap,
            taskMappings: existingTaskMap,
            remoteLabelIdSet,
            remoteLabelNameToId,
        });

        await createTodoistTasks({
            userId,
            tasks: childTasks,
            mappingState,
            labelIdMap,
            taskMappings: existingTaskMap,
            remoteLabelIdSet,
            remoteLabelNameToId,
        });

        await pushLocalTasks({
            userId,
            client,
            mappingState,
            taskMappings: existingTaskMap,
            conflictKeys,
            localTaskLabelMap,
            localLabelToExternal,
            hasScopedMappings,
            externalLabelToName,
        });

        await removeDeletedTasks({
            client,
            taskMappings,
            localTaskMap,
            remoteTasks: snapshot.tasks,
        });

        await updateMappedTasks({
            client,
            taskMappings,
            localTaskMap,
            remoteTaskMap,
            mappingState,
            conflictKeys,
            localTaskLabelMap,
            localLabelToExternal,
            hasScopedMappings,
            lastSyncedAt,
            externalLabelToName,
        });

        await updateRemoteTasks({
            userId,
            taskMappings,
            localTaskMap,
            remoteTaskMap,
            mappingState,
            conflictKeys,
            localLabelToExternal,
            hasScopedMappings,
            lastSyncedAt,
            remoteLabelIdSet,
            remoteLabelNameToId,
        });

        await db
            .update(externalSyncState)
            .set({ status: "idle", error: null, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")));

        const conflictCount = await db
            .select({ count: externalSyncConflicts.id })
            .from(externalSyncConflicts)
            .where(
                and(
                    eq(externalSyncConflicts.userId, userId),
                    eq(externalSyncConflicts.provider, "todoist"),
                    eq(externalSyncConflicts.status, "pending")
                )
            );

        return { status: "ok", conflictCount: conflictCount.length };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Todoist sync error";
        await db
            .update(externalSyncState)
            .set({ status: "error", error: message })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")));

        return { status: "error", error: message };
    }
}

async function ensureProjectAssignments(params: {
    userId: string;
    projects: { id: string; name: string }[];
    existingLists: { id: number; name: string; position: number }[];
}) {
    const { userId, projects, existingLists } = params;
    void buildDefaultProjectAssignments(projects as never, existingLists);
    const lowerCaseListMap = new Map(existingLists.map((list) => [list.name.toLowerCase(), list]));
    let maxPosition = Math.max(0, ...existingLists.map((list) => list.position ?? 0));

    const hydratedAssignments = [] as { projectId: string; listId: number | null }[];

    for (const project of projects.slice(0, 5)) {
        const existingMatch = lowerCaseListMap.get(project.name.toLowerCase());
        const listId = existingMatch?.id ?? null;

        if (listId) {
            hydratedAssignments.push({ projectId: project.id, listId });
            continue;
        }

        const slug = slugify(project.name);
        const created = await db.insert(lists).values({
            userId,
            name: project.name,
            slug,
            position: maxPosition + 1,
        }).returning();
        maxPosition += 1;

        hydratedAssignments.push({ projectId: project.id, listId: created[0]?.id ?? null });
    }

    if (hydratedAssignments.length > 0) {
        await db.insert(externalEntityMap).values(
            hydratedAssignments.map((assignment) => ({
                userId,
                provider: "todoist" as const,
                entityType: "list" as const,
                localId: assignment.listId,
                externalId: assignment.projectId,
            }))
        );
    }

    return hydratedAssignments;
}

function isTodoistTaskInScope(
    task: Task,
    mappedProjectIds: Set<string>,
    mappedLabelIds: Set<string>,
    remoteLabelIdSet: Set<string>,
    remoteLabelNameToId: Map<string, string>
) {
    const projectInScope = mappedProjectIds.has(task.projectId);
    if (projectInScope) {
        return true;
    }

    const taskLabelExternalIds = resolveTaskLabelExternalIds(task, remoteLabelIdSet, remoteLabelNameToId);
    if (taskLabelExternalIds.length === 0) {
        return false;
    }

    for (const labelId of taskLabelExternalIds) {
        if (mappedLabelIds.has(labelId)) {
            return true;
        }
    }

    return false;
}

function hasLocalListMapping(listId: number | null, mappingState: MappingState) {
    if (!listId) {
        return false;
    }

    return mappingState.projects.some((mapping) => mapping.listId === listId) ||
        mappingState.labels.some((mapping) => mapping.listId === listId);
}

function collectScopedLocalLabelIds(params: {
    localTasks: (typeof tasks.$inferSelect)[];
    localTaskLabelMap: Map<number, number[]>;
    mappingState: MappingState;
    hasScopedMappings: boolean;
}) {
    const { localTasks, localTaskLabelMap, mappingState, hasScopedMappings } = params;
    const scopedLocalLabelIds = new Set<number>();

    for (const task of localTasks) {
        if (hasScopedMappings && !hasLocalListMapping(task.listId ?? null, mappingState)) {
            continue;
        }
        const labelIds = localTaskLabelMap.get(task.id) ?? [];
        for (const labelId of labelIds) {
            scopedLocalLabelIds.add(labelId);
        }
    }

    return scopedLocalLabelIds;
}

function normalizeLabelName(value: string) {
    return value.trim().toLowerCase();
}

function resolveExternalLabelId(
    token: string,
    remoteLabelIdSet: Set<string>,
    remoteLabelNameToId: Map<string, string>
) {
    if (remoteLabelIdSet.has(token)) {
        return token;
    }

    const byName = remoteLabelNameToId.get(normalizeLabelName(token));
    return byName ?? token;
}

function resolveTaskLabelExternalIds(
    task: Task,
    remoteLabelIdSet: Set<string>,
    remoteLabelNameToId: Map<string, string>
) {
    const resolved = new Set<string>();
    for (const token of task.labels ?? []) {
        resolved.add(resolveExternalLabelId(token, remoteLabelIdSet, remoteLabelNameToId));
    }
    return Array.from(resolved);
}

async function removeDeletedTasks(params: {
    client: ReturnType<typeof createTodoistClient>;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    remoteTasks: Task[];
}) {
    const { client, taskMappings, localTaskMap, remoteTasks } = params;
    const remoteTaskIds = new Set(remoteTasks.map((task) => task.id));

    const externalIdsToDelete: string[] = [];
    const mappingIdsForExternalDelete: number[] = [];
    const mappingIdsForOrphanDelete: number[] = [];

    for (const mapping of taskMappings) {
        if (mapping.localId && !localTaskMap.has(mapping.localId)) {
            if (mapping.externalId) {
                externalIdsToDelete.push(mapping.externalId);
                mappingIdsForExternalDelete.push(mapping.id);
            } else {
                mappingIdsForOrphanDelete.push(mapping.id);
            }
            continue;
        }

        if (!mapping.localId && mapping.externalId && !remoteTaskIds.has(mapping.externalId)) {
            mappingIdsForOrphanDelete.push(mapping.id);
        }
    }

    // Always delete orphan mappings that don't require external API calls
    if (mappingIdsForOrphanDelete.length > 0) {
        await db.delete(externalEntityMap).where(inArray(externalEntityMap.id, mappingIdsForOrphanDelete));
    }

    if (externalIdsToDelete.length > 0) {
        // Parallelize external deletions to avoid N+1 API calls.
        // We handle 404 errors gracefully because if the task is already gone from Todoist,
        // we should still proceed with deleting our local mapping.
        await Promise.all(
            externalIdsToDelete.map(async (id) => {
                try {
                    await client.deleteTask(id);
                } catch (error) {
                    if (error instanceof Error && error.message.includes("404")) {
                        return;
                    }
                    throw error;
                }
            })
        );
        await db.delete(externalEntityMap).where(inArray(externalEntityMap.id, mappingIdsForExternalDelete));
    }
}

function splitTasksByParent(tasks: Task[]) {
    const rootTasks: Task[] = [];
    const childTasks: Task[] = [];

    for (const task of tasks) {
        if (task.parentId) {
            childTasks.push(task);
        } else {
            rootTasks.push(task);
        }
    }

    return [rootTasks, childTasks] as const;
}

async function createTodoistTasks(params: {
    userId: string;
    tasks: Task[];
    mappingState: MappingState;
    labelIdMap: Map<string, number>;
    taskMappings: Map<string, number | null>;
    remoteLabelIdSet: Set<string>;
    remoteLabelNameToId: Map<string, string>;
}) {
    const {
        userId,
        tasks: incomingTasks,
        mappingState,
        labelIdMap,
        taskMappings,
        remoteLabelIdSet,
        remoteLabelNameToId,
    } = params;

    for (const task of incomingTasks) {
        if (taskMappings.has(task.id)) {
            continue;
        }

        const resolvedExternalLabelIds = resolveTaskLabelExternalIds(task, remoteLabelIdSet, remoteLabelNameToId);
        const normalizedTask = { ...task, labels: resolvedExternalLabelIds } as Task;
        const payload = mapTodoistTaskToLocal(normalizedTask, mappingState);
        const labelIds = resolvedExternalLabelIds
            .map((labelId) => labelIdMap.get(labelId))
            .filter((id): id is number => Boolean(id));
        const parentMapping = task.parentId ? taskMappings.get(task.parentId) : null;

        const [createdTask] = await db.insert(tasks).values({
            userId,
            listId: payload.listId ?? null,
            title: payload.title ?? task.content,
            description: payload.description ?? null,
            priority: payload.priority ?? "none",
            isCompleted: payload.isCompleted ?? false,
            completedAt: payload.completedAt ?? null,
            dueDate: payload.dueDate ?? null,
            dueDatePrecision: payload.dueDatePrecision ?? null,
            deadline: payload.deadline ?? null,
            estimateMinutes: payload.estimateMinutes ?? null,
            isRecurring: payload.isRecurring ?? false,
            recurringRule: payload.recurringRule ?? null,
            parentId: parentMapping ?? null,
            createdAt: payload.createdAt ?? undefined,
            position: 0,
        }).returning();

        if (!createdTask) {
            continue;
        }

        taskMappings.set(task.id, createdTask.id);
        await db.insert(externalEntityMap).values({
            userId,
            provider: "todoist" as const,
            entityType: "task" as const,
            localId: createdTask.id,
            externalId: task.id,
            externalParentId: task.parentId ?? null,
        });

        if (labelIds.length > 0) {
            await db.insert(taskLabels).values(
                labelIds.map((labelId) => ({
                    taskId: createdTask.id,
                    labelId,
                }))
            );
        }
    }
}

async function updateMappedTasks(params: {
    client: ReturnType<typeof createTodoistClient>;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    remoteTaskMap: Map<string, Task>;
    mappingState: MappingState;
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number, string>;
    hasScopedMappings: boolean;
    lastSyncedAt: Date | null;
    externalLabelToName: Map<string, string>;
}) {
    const {
        client,
        taskMappings,
        localTaskMap,
        remoteTaskMap,
        mappingState,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
        hasScopedMappings,
        lastSyncedAt,
        externalLabelToName,
    } = params;
    const mappedTasks = taskMappings.filter((mapping) => mapping.localId && mapping.externalId);
    const localToExternalTaskMap = new Map(
        mappedTasks
            .filter((mapping) => mapping.localId && mapping.externalId)
            .map((mapping) => [mapping.localId as number, mapping.externalId])
    );

    for (const mapping of mappedTasks) {
        const localTask = localTaskMap.get(mapping.localId as number);
        if (!localTask) {
            continue;
        }
        if (hasScopedMappings && !hasLocalListMapping(localTask.listId ?? null, mappingState)) {
            continue;
        }

        const remoteTask = remoteTaskMap.get(mapping.externalId);
        if (!remoteTask) {
            continue;
        }

        if (lastSyncedAt) {
            const localChangedAfterLastSync = localTask.updatedAt > lastSyncedAt;
            const remoteUpdatedAt = parseTodoistTimestamp(remoteTask.updatedAt);
            const remoteChangedAfterLastSync = remoteUpdatedAt ? remoteUpdatedAt > lastSyncedAt : false;

            // Pull-only when remote changed and local did not.
            if (!localChangedAfterLastSync && remoteChangedAfterLastSync) {
                continue;
            }

            // Skip idempotent updates when nothing changed since the last successful sync.
            if (!localChangedAfterLastSync && !remoteChangedAfterLastSync) {
                continue;
            }
        }

        const conflictKey = buildConflictKey("task", localTask.id, mapping.externalId);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const labelIds = localTaskLabelMap.get(localTask.id) ?? [];
        const payload = mapLocalTaskToTodoist(localTask, mappingState, {
            labelIds,
            labelIdToExternal: localLabelToExternal,
            externalLabelToName,
        });
        const listMapping = applyListLabelMapping(localTask.listId ?? null, mappingState);
        const desiredProjectId = listMapping.projectId ?? null;
        const desiredParentExternalId = localTask.parentId
            ? (localToExternalTaskMap.get(localTask.parentId) ?? null)
            : null;

        let effectiveProjectId = remoteTask.projectId ?? null;
        let effectiveParentId = remoteTask.parentId ?? null;

        if (desiredParentExternalId && desiredParentExternalId !== effectiveParentId) {
            await client.moveTask(mapping.externalId, { parentId: desiredParentExternalId });
            effectiveParentId = desiredParentExternalId;
        } else if (!desiredParentExternalId && effectiveParentId) {
            const projectIdForRoot = desiredProjectId ?? effectiveProjectId;
            if (projectIdForRoot) {
                await client.moveTask(mapping.externalId, { projectId: projectIdForRoot });
                effectiveProjectId = projectIdForRoot;
                effectiveParentId = null;
            }
        }

        if (!desiredParentExternalId && desiredProjectId && desiredProjectId !== effectiveProjectId) {
            await client.moveTask(mapping.externalId, { projectId: desiredProjectId });
            effectiveProjectId = desiredProjectId;
        }

        const remoteTaskForCompare = {
            ...remoteTask,
            projectId: effectiveProjectId ?? remoteTask.projectId,
        };
        const shouldUpdateTask = shouldUpdateTodoistTask(remoteTaskForCompare, payload);
        const shouldToggleCompletion = (localTask.isCompleted ?? false) !== (remoteTask.checked ?? false);

        if (!shouldUpdateTask && !shouldToggleCompletion) {
            continue;
        }

        if (shouldUpdateTask) {
            await client.updateTask(mapping.externalId, payload);
        }

        if (shouldToggleCompletion) {
            if (localTask.isCompleted) {
                await client.closeTask(mapping.externalId);
            } else {
                await client.reopenTask(mapping.externalId);
            }
        }
    }
}

async function updateRemoteTasks(params: {
    userId: string;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    remoteTaskMap: Map<string, Task>;
    mappingState: MappingState;
    conflictKeys: Set<string>;
    localLabelToExternal: Map<number, string>;
    hasScopedMappings: boolean;
    lastSyncedAt: Date | null;
    remoteLabelIdSet: Set<string>;
    remoteLabelNameToId: Map<string, string>;
}) {
    const {
        userId,
        taskMappings,
        localTaskMap,
        remoteTaskMap,
        mappingState,
        conflictKeys,
        localLabelToExternal,
        hasScopedMappings,
        lastSyncedAt,
        remoteLabelIdSet,
        remoteLabelNameToId,
    } = params;

    const externalToLocalLabel = new Map<string, number>();
    for (const [localId, externalId] of localLabelToExternal.entries()) {
        if (localId) {
            externalToLocalLabel.set(externalId, localId);
        }
    }
    const externalToLocalTask = new Map<string, number>();
    for (const taskMapping of taskMappings) {
        if (taskMapping.localId) {
            externalToLocalTask.set(taskMapping.externalId, taskMapping.localId);
        }
    }
    const managedLocalLabelIds = Array.from(externalToLocalLabel.values());

    for (const mapping of taskMappings) {
        if (!mapping.localId) {
            continue;
        }

        const localTask = localTaskMap.get(mapping.localId);
        const remoteTask = remoteTaskMap.get(mapping.externalId);
        if (!localTask || !remoteTask) {
            continue;
        }
        if (hasScopedMappings && !hasLocalListMapping(localTask.listId ?? null, mappingState)) {
            continue;
        }

        const remoteUpdatedAt = parseTodoistTimestamp(remoteTask.updatedAt);
        if (lastSyncedAt && (!remoteUpdatedAt || remoteUpdatedAt <= lastSyncedAt)) {
            continue;
        }

        const conflictKey = buildConflictKey("task", localTask.id, mapping.externalId);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const resolvedExternalLabelIds = resolveTaskLabelExternalIds(remoteTask, remoteLabelIdSet, remoteLabelNameToId);
        const normalizedRemoteTask = { ...remoteTask, labels: resolvedExternalLabelIds } as Task;
        const localPayload = mapTodoistTaskToLocal(normalizedRemoteTask, mappingState);
        const resolvedListId = localPayload.listId ?? localTask.listId ?? null;
        const resolvedParentId = remoteTask.parentId
            ? (externalToLocalTask.get(remoteTask.parentId) ?? null)
            : null;
        const labelIds = resolvedExternalLabelIds
            .map((labelId) => externalToLocalLabel.get(labelId) ?? null)
            .filter((id): id is number => Boolean(id));

        const remoteCompletedAt = parseTodoistTimestamp(remoteTask.completedAt);
        await db
            .update(tasks)
            .set({
                title: localPayload.title ?? localTask.title,
                description: localPayload.description ?? localTask.description,
                priority: localPayload.priority ?? localTask.priority,
                dueDate: localPayload.dueDate ?? localTask.dueDate,
                dueDatePrecision: localPayload.dueDatePrecision ?? localTask.dueDatePrecision,
                deadline: localPayload.deadline ?? localTask.deadline,
                estimateMinutes: localPayload.estimateMinutes ?? localTask.estimateMinutes,
                isRecurring: localPayload.isRecurring ?? localTask.isRecurring,
                recurringRule: localPayload.recurringRule ?? localTask.recurringRule,
                isCompleted: localPayload.isCompleted ?? localTask.isCompleted,
                completedAt: localPayload.isCompleted ? (remoteCompletedAt ?? new Date()) : null,
                listId: resolvedListId,
                parentId: resolvedParentId,
            })
            .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)));

        if (managedLocalLabelIds.length > 0) {
            await db.delete(taskLabels).where(
                and(
                    eq(taskLabels.taskId, localTask.id),
                    inArray(taskLabels.labelId, managedLocalLabelIds)
                )
            );

            if (labelIds.length > 0) {
                await db.insert(taskLabels).values(
                    labelIds.map((labelId) => ({
                        taskId: localTask.id,
                        labelId,
                    }))
                );
            }
        }
    }
}

async function fetchTaskLabels(taskIds: number[]) {
    if (taskIds.length === 0) {
        return new Map<number, number[]>();
    }

    const rows = await db
        .select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
        .from(taskLabels)
        .where(inArray(taskLabels.taskId, taskIds));

    const map = new Map<number, number[]>();
    for (const row of rows) {
        const current = map.get(row.taskId) ?? [];
        current.push(row.labelId);
        map.set(row.taskId, current);
    }

    return map;
}

async function getExistingConflictKeys(userId: string) {
    const conflicts = await db
        .select({
            id: externalSyncConflicts.id,
            localId: externalSyncConflicts.localId,
            externalId: externalSyncConflicts.externalId,
            entityType: externalSyncConflicts.entityType,
        })
        .from(externalSyncConflicts)
        .where(
            and(
                eq(externalSyncConflicts.userId, userId),
                eq(externalSyncConflicts.provider, "todoist"),
                eq(externalSyncConflicts.status, "pending")
            )
        );

    const keys = new Set<string>();
    for (const conflict of conflicts) {
        keys.add(buildConflictKey(conflict.entityType, conflict.localId, conflict.externalId));
    }

    return keys;
}

function buildConflictKey(entityType: string, localId: number | null, externalId: string | null) {
    return `${entityType}:${localId ?? "none"}:${externalId ?? "none"}`;
}

async function detectTaskConflicts(params: {
    userId: string;
    todoistTasks: Task[];
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number, string>;
    conflictKeys: Set<string>;
    mappingState: MappingState;
    lastSyncedAt: Date | null;
    hasScopedMappings: boolean;
    remoteLabelIdSet: Set<string>;
    remoteLabelNameToId: Map<string, string>;
}) {
    const {
        userId,
        todoistTasks,
        taskMappings,
        localTaskMap,
        localTaskLabelMap,
        localLabelToExternal,
        conflictKeys,
        mappingState,
        lastSyncedAt,
        hasScopedMappings,
        remoteLabelIdSet,
        remoteLabelNameToId,
    } = params;

    if (!lastSyncedAt) {
        return;
    }

    const todoistTaskMap = new Map(todoistTasks.map((task) => [task.id, task]));
    const localTaskToExternal = new Map<number, string>();
    for (const mapping of taskMappings) {
        if (mapping.localId) {
            localTaskToExternal.set(mapping.localId, mapping.externalId);
        }
    }

    for (const mapping of taskMappings) {
        const localTaskId = mapping.localId;
        if (!localTaskId) {
            continue;
        }

        const todoistTask = todoistTaskMap.get(mapping.externalId);
        const localTask = localTaskMap.get(localTaskId);
        if (!todoistTask || !localTask) {
            continue;
        }
        if (hasScopedMappings && !hasLocalListMapping(localTask.listId ?? null, mappingState)) {
            continue;
        }

        const remoteUpdatedAt = parseTodoistTimestamp(todoistTask.updatedAt);
        if (!remoteUpdatedAt) {
            continue;
        }

        if (localTask.updatedAt <= lastSyncedAt || remoteUpdatedAt <= lastSyncedAt) {
            continue;
        }

        const conflictKey = buildConflictKey("task", localTaskId, todoistTask.id);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const localPayload = buildLocalTaskPayload(
            localTask,
            localTaskLabelMap,
            localLabelToExternal,
            localTaskToExternal,
            mappingState
        );
        const remotePayload = buildRemoteTaskPayload(
            todoistTask,
            resolveTaskLabelExternalIds(todoistTask, remoteLabelIdSet, remoteLabelNameToId)
        );

        if (!tasksMatch(localPayload, remotePayload)) {
            await db.insert(externalSyncConflicts).values({
                userId,
                provider: "todoist" as const,
                entityType: "task" as const,
                localId: localTaskId,
                externalId: todoistTask.id,
                conflictType: "task_mismatch",
                localPayload: JSON.stringify(localPayload),
                externalPayload: JSON.stringify(remotePayload),
            });
            conflictKeys.add(conflictKey);
        }
    }
}

function buildLocalTaskPayload(
    task: typeof tasks.$inferSelect,
    localTaskLabelMap: Map<number, number[]>,
    localLabelToExternal: Map<number, string>,
    localTaskToExternal: Map<number, string>,
    mappingState: MappingState
) {
    const labelIds = localTaskLabelMap.get(task.id) ?? [];
    const externalLabels = labelIds
        .map((labelId) => localLabelToExternal.get(labelId) ?? null)
        .filter((labelId): labelId is string => Boolean(labelId));

    if (task.listId) {
        const listMappedLabel = mappingState.labels.find((l) => l.listId === task.listId)?.labelId;
        if (listMappedLabel && !externalLabels.includes(listMappedLabel)) {
            externalLabels.push(listMappedLabel);
        }
    }

    return {
        title: task.title,
        description: task.description ?? "",
        priority: task.priority ?? "none",
        isCompleted: task.isCompleted ?? false,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        deadlineDate: task.deadline ? task.deadline.toISOString().split("T")[0] : null,
        estimateMinutes: task.estimateMinutes ?? null,
        isRecurring: task.isRecurring ?? false,
        recurringRule: task.recurringRule ?? null,
        listId: task.listId ?? null,
        parentExternalId: task.parentId ? (localTaskToExternal.get(task.parentId) ?? null) : null,
        labels: externalLabels.sort(),
    };
}

function buildRemoteTaskPayload(task: Task, externalLabelIds: string[]) {
    return {
        title: task.content,
        description: task.description ?? "",
        priority: toLocalPriority(task.priority),
        isCompleted: task.checked ?? false,
        dueDate: task.due?.date ?? null,
        deadlineDate: task.deadline?.date ?? null,
        estimateMinutes: parseTodoistDurationMinutes(task.duration?.amount ?? null, task.duration?.unit ?? null),
        isRecurring: task.due?.isRecurring ?? false,
        recurringRule: task.due?.isRecurring ? task.due?.string ?? null : null,
        projectId: task.projectId ?? null,
        parentExternalId: task.parentId ?? null,
        labels: externalLabelIds.slice().sort(),
    };
}

function tasksMatch(
    localPayload: ReturnType<typeof buildLocalTaskPayload>,
    remotePayload: ReturnType<typeof buildRemoteTaskPayload>
) {
    if (localPayload.title !== remotePayload.title) return false;
    if (localPayload.description !== remotePayload.description) return false;
    if (localPayload.priority !== remotePayload.priority) return false;
    if (localPayload.isCompleted !== remotePayload.isCompleted) return false;
    if (localPayload.deadlineDate !== remotePayload.deadlineDate) return false;
    if ((localPayload.estimateMinutes ?? null) !== (remotePayload.estimateMinutes ?? null)) return false;
    if (localPayload.isRecurring !== remotePayload.isRecurring) return false;
    if ((localPayload.recurringRule ?? "") !== (remotePayload.recurringRule ?? "")) return false;

    const localDue = localPayload.dueDate ? localPayload.dueDate.split("T")[0] : null;
    const remoteDue = remotePayload.dueDate ? remotePayload.dueDate.split("T")[0] : null;
    if (localDue !== remoteDue) return false;

    if (localPayload.parentExternalId !== remotePayload.parentExternalId) return false;

    if (localPayload.labels.length !== remotePayload.labels.length) return false;
    for (let index = 0; index < localPayload.labels.length; index += 1) {
        if (localPayload.labels[index] !== remotePayload.labels[index]) {
            return false;
        }
    }

    return true;
}

function parseTodoistTimestamp(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) {
        return null;
    }
    return parsed;
}

function parseTodoistDurationMinutes(amount: number | null, unit: "minute" | "day" | null) {
    if (!amount || !unit) {
        return null;
    }
    if (unit === "minute") {
        return amount;
    }
    if (unit === "day") {
        return amount * 24 * 60;
    }
    return null;
}

function toLocalPriority(priority: number | null | undefined) {
    if (!priority) {
        return "none" as const;
    }
    if (priority >= 4) {
        return "high" as const;
    }
    if (priority === 3) {
        return "medium" as const;
    }
    if (priority === 2) {
        return "low" as const;
    }
    return "none" as const;
}

function equalStringArrays(left: string[], right: string[]) {
    if (left.length !== right.length) {
        return false;
    }
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            return false;
        }
    }
    return true;
}

function shouldUpdateTodoistTask(remoteTask: Task, payload: ReturnType<typeof mapLocalTaskToTodoist>) {
    if (payload.content !== remoteTask.content) {
        return true;
    }

    if ((payload.description ?? "") !== (remoteTask.description ?? "")) {
        return true;
    }

    if (payload.priority !== undefined && payload.priority !== remoteTask.priority) {
        return true;
    }

    if (payload.projectId !== undefined && payload.projectId !== remoteTask.projectId) {
        return true;
    }

    if (payload.dueString !== undefined && payload.dueString !== (remoteTask.due?.string ?? null)) {
        return true;
    }

    if (payload.labels !== undefined) {
        const remoteLabels = (remoteTask.labels ?? []).slice().sort();
        const payloadLabels = payload.labels.slice().sort();
        if (!equalStringArrays(payloadLabels, remoteLabels)) {
            return true;
        }
    }

    if (payload.dueDatetime !== undefined) {
        if (payload.dueDatetime !== (remoteTask.due?.datetime ?? null)) {
            return true;
        }
    } else if (payload.dueDate !== undefined) {
        if (payload.dueDate !== (remoteTask.due?.date ?? null)) {
            return true;
        }
    }

    if (payload.deadlineDate !== undefined) {
        if (payload.deadlineDate !== (remoteTask.deadline?.date ?? null)) {
            return true;
        }
    }

    if (payload.duration !== undefined || payload.durationUnit !== undefined) {
        const remoteDuration = parseTodoistDurationMinutes(remoteTask.duration?.amount ?? null, remoteTask.duration?.unit ?? null);
        const payloadDuration = payload.duration ?? null;
        if (payloadDuration !== remoteDuration) {
            return true;
        }
    }

    return false;
}

async function pushLocalTasks(params: {
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    mappingState: MappingState;
    taskMappings: Map<string, number | null>;
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number, string>;
    hasScopedMappings: boolean;
    externalLabelToName: Map<string, string>;
}) {
    const {
        userId,
        client,
        mappingState,
        taskMappings,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
        hasScopedMappings,
        externalLabelToName,
    } = params;
    const localTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    const localMapping = new Map<number, string>();

    for (const [externalId, localId] of taskMappings) {
        if (localId) {
            localMapping.set(localId, externalId);
        }
    }

    const pendingTasks = localTasks.filter((task) => {
        if (localMapping.has(task.id)) {
            return false;
        }
        if (!hasScopedMappings) {
            return true;
        }
        return hasLocalListMapping(task.listId ?? null, mappingState);
    });
    const [rootTasks, childTasks] = splitLocalTasksByParent(pendingTasks);

    await createLocalTasksInTodoist({
        tasks: rootTasks,
        mappingState,
        localMapping,
        client,
        userId,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
        externalLabelToName,
    });

    await createLocalTasksInTodoist({
        tasks: childTasks,
        mappingState,
        localMapping,
        client,
        userId,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
        externalLabelToName,
    });
}

function splitLocalTasksByParent(localTasks: typeof tasks.$inferSelect[]) {
    const rootTasks: typeof tasks.$inferSelect[] = [];
    const childTasks: typeof tasks.$inferSelect[] = [];

    for (const task of localTasks) {
        if (task.parentId) {
            childTasks.push(task);
        } else {
            rootTasks.push(task);
        }
    }

    return [rootTasks, childTasks] as const;
}

async function createLocalTasksInTodoist(params: {
    tasks: typeof tasks.$inferSelect[];
    mappingState: MappingState;
    localMapping: Map<number, string>;
    client: ReturnType<typeof createTodoistClient>;
    userId: string;
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number, string>;
    externalLabelToName: Map<string, string>;
}) {
    const {
        tasks: localTasks,
        mappingState,
        localMapping,
        client,
        userId,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
        externalLabelToName,
    } = params;

    for (const task of localTasks) {
        if (localMapping.has(task.id)) {
            continue;
        }

        const conflictKey = buildConflictKey("task", task.id, null);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const labelIds = localTaskLabelMap.get(task.id) ?? [];
        const payload = mapLocalTaskToTodoist(task, mappingState, {
            labelIds,
            labelIdToExternal: localLabelToExternal,
            externalLabelToName,
        });
        if (task.parentId) {
            const parentExternalId = localMapping.get(task.parentId);
            if (parentExternalId) {
                payload.parentId = parentExternalId;
            }
        }

        const created = (await client.createTask(payload)) as Task;
        if (!created?.id) {
            continue;
        }

        if (task.isCompleted) {
            await client.closeTask(created.id);
        }

        localMapping.set(task.id, created.id);
        await db.insert(externalEntityMap).values({
            userId,
            provider: "todoist" as const,
            entityType: "task" as const,
            localId: task.id,
            externalId: created.id,
            externalParentId: created.parentId ?? null,
        });
    }
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
