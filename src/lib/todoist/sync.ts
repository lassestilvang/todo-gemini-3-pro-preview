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
import type { TodoistTask } from "./types";
import { buildDefaultProjectAssignments } from "./mapping";

type SyncResult = {
    status: "ok" | "error";
    error?: string;
    conflictCount?: number;
};

export async function syncTodoistForUser(userId: string): Promise<SyncResult> {
    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "todoist")),
    });

    if (!integration) {
        return { status: "error", error: "Todoist integration not connected." };
    }

    const accessToken = decryptToken({
        ciphertext: integration.accessTokenEncrypted,
        iv: integration.accessTokenIv,
        tag: integration.accessTokenTag,
    });

    const client = createTodoistClient(accessToken);

    await db
        .insert(externalSyncState)
        .values({
            userId,
            provider: "todoist",
            status: "syncing",
            lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [externalSyncState.userId, externalSyncState.provider],
            set: { status: "syncing", lastSyncedAt: new Date() },
        });

    try {
        const snapshot = await fetchTodoistSnapshot(client);

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

        const projectAssignments = projectMappings.length
            ? projectMappings.map((mapping) => ({
                  projectId: mapping.externalId,
                  listId: mapping.localId,
              }))
            : await ensureProjectAssignments({
                  userId,
                  projects: snapshot.projects,
                  existingLists,
              });

        const mappingState = {
            projects: projectAssignments,
            labels: listLabelMappings.map((mapping) => ({
                labelId: mapping.externalId,
                listId: mapping.localId,
            })),
        };

        const localTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
        const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));
        const localTaskIds = localTasks.map((task) => task.id);
        const localTaskLabelMap = await fetchTaskLabels(localTaskIds);
        const localLabelToExternal = new Map(labelMappings.map((mapping) => [mapping.localId, mapping.externalId]));
        const conflictKeys = await getExistingConflictKeys(userId);

        const labelIdMap = new Map<string, number>();
        for (const mapping of labelMappings) {
            if (mapping.localId) {
                labelIdMap.set(mapping.externalId, mapping.localId);
            }
        }

        for (const label of snapshot.labels) {
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
                provider: "todoist",
                entityType: "label",
                localId: localLabel.id,
                externalId: label.id,
            });
            labelIdMap.set(label.id, localLabel.id);
        }

        const existingTaskMap = new Map(taskMappings.map((mapping) => [mapping.externalId, mapping.localId]));
        const pendingTasks = snapshot.tasks.filter((task) => !existingTaskMap.has(task.id));
        const [rootTasks, childTasks] = splitTasksByParent(pendingTasks);

        await detectTaskConflicts({
            userId,
            todoistTasks: snapshot.tasks,
            taskMappings,
            localTaskMap,
            localTaskLabelMap,
            localLabelToExternal,
            conflictKeys,
        });

        await createTodoistTasks({
            userId,
            tasks: rootTasks,
            mappingState,
            labelIdMap,
            taskMappings: existingTaskMap,
        });

        await createTodoistTasks({
            userId,
            tasks: childTasks,
            mappingState,
            labelIdMap,
            taskMappings: existingTaskMap,
        });

        await pushLocalTasks({
            userId,
            client,
            mappingState,
            taskMappings: existingTaskMap,
            conflictKeys,
            localTaskLabelMap,
            localLabelToExternal,
        });

        await removeDeletedTasks({
            userId,
            client,
            taskMappings,
            localTaskMap,
        });

        await updateMappedTasks({
            userId,
            client,
            taskMappings,
            localTaskMap,
            mappingState,
            conflictKeys,
            localTaskLabelMap,
            localLabelToExternal,
        });

        await updateRemoteTasks({
            userId,
            client,
            taskMappings,
            localTaskMap,
            mappingState,
            conflictKeys,
            localLabelToExternal,
        });

        await db
            .update(externalSyncState)
            .set({ status: "idle", error: null, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")));

        const conflictCount = await db
            .select({ count: externalSyncConflicts.id })
            .from(externalSyncConflicts)
            .where(and(eq(externalSyncConflicts.userId, userId), eq(externalSyncConflicts.status, "pending")));

        return { status: "ok", conflictCount: conflictCount.length };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Todoist sync error";
        await db
            .update(externalSyncState)
            .set({ status: "error", error: message, lastSyncedAt: new Date() })
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
    const assignments = buildDefaultProjectAssignments(projects, existingLists);
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
                provider: "todoist",
                entityType: "list",
                localId: assignment.listId,
                externalId: assignment.projectId,
            }))
        );
    }

    return hydratedAssignments;
}

async function removeDeletedTasks(params: {
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
}) {
    const { userId, client, taskMappings, localTaskMap } = params;
    const remoteTasks = (await client.getTasks()) as TodoistTask[];
    const remoteTaskIds = new Set(remoteTasks.map((task) => task.id));

    for (const mapping of taskMappings) {
        if (mapping.localId && !localTaskMap.has(mapping.localId)) {
            if (mapping.externalId) {
                await client.deleteTask(mapping.externalId);
            }
            await db.delete(externalEntityMap).where(eq(externalEntityMap.id, mapping.id));
            continue;
        }

        if (!mapping.localId && mapping.externalId && !remoteTaskIds.has(mapping.externalId)) {
            await db.delete(externalEntityMap).where(eq(externalEntityMap.id, mapping.id));
        }
    }
}

function splitTasksByParent(tasks: TodoistTask[]) {
    const rootTasks: TodoistTask[] = [];
    const childTasks: TodoistTask[] = [];

    for (const task of tasks) {
        if (task.parent_id) {
            childTasks.push(task);
        } else {
            rootTasks.push(task);
        }
    }

    return [rootTasks, childTasks] as const;
}

async function createTodoistTasks(params: {
    userId: string;
    tasks: TodoistTask[];
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    labelIdMap: Map<string, number>;
    taskMappings: Map<string, number | null>;
}) {
    const { userId, tasks: incomingTasks, mappingState, labelIdMap, taskMappings } = params;

    for (const task of incomingTasks) {
        if (taskMappings.has(task.id)) {
            continue;
        }

        const payload = mapTodoistTaskToLocal(task, mappingState);
        const labelIds = (task.labels ?? []).map((labelId) => labelIdMap.get(labelId)).filter((id): id is number => Boolean(id));
        const parentMapping = task.parent_id ? taskMappings.get(task.parent_id) : null;

        const [createdTask] = await db.insert(tasks).values({
            userId,
            listId: payload.listId ?? null,
            title: payload.title ?? task.content,
            description: payload.description ?? null,
            isCompleted: payload.isCompleted ?? false,
            completedAt: payload.completedAt ?? null,
            dueDate: payload.dueDate ?? null,
            dueDatePrecision: payload.dueDatePrecision ?? null,
            isRecurring: payload.isRecurring ?? false,
            recurringRule: payload.recurringRule ?? null,
            parentId: parentMapping ?? null,
            position: 0,
        }).returning();

        if (!createdTask) {
            continue;
        }

        taskMappings.set(task.id, createdTask.id);
        await db.insert(externalEntityMap).values({
            userId,
            provider: "todoist",
            entityType: "task",
            localId: createdTask.id,
            externalId: task.id,
            externalParentId: task.parent_id ?? null,
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
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number | null, string>;
}) {
    const {
        userId,
        client,
        taskMappings,
        localTaskMap,
        mappingState,
        conflictKeys,
        localTaskLabelMap,
        localLabelToExternal,
    } = params;
    const mappedTasks = taskMappings.filter((mapping) => mapping.localId && mapping.externalId);

    for (const mapping of mappedTasks) {
        const localTask = localTaskMap.get(mapping.localId as number);
        if (!localTask) {
            continue;
        }

        const conflictKey = buildConflictKey("task", localTask.id, mapping.externalId);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const labelIds = localTaskLabelMap.get(localTask.id) ?? [];
        const payload = mapLocalTaskToTodoist(localTask, mappingState, {
            labelIds,
            labelIdToExternal: localLabelToExternal,
        });
        await client.updateTask(mapping.externalId, payload);
        if (localTask.isCompleted) {
            await client.closeTask(mapping.externalId);
        } else {
            await client.reopenTask(mapping.externalId);
        }
    }
}

async function updateRemoteTasks(params: {
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    conflictKeys: Set<string>;
    localLabelToExternal: Map<number | null, string>;
}) {
    const { userId, client, taskMappings, localTaskMap, mappingState, conflictKeys, localLabelToExternal } = params;
    const remoteTasks = (await client.getTasks()) as TodoistTask[];
    const taskMap = new Map(remoteTasks.map((task) => [task.id, task]));

    for (const mapping of taskMappings) {
        if (!mapping.localId) {
            continue;
        }

        const localTask = localTaskMap.get(mapping.localId);
        const remoteTask = taskMap.get(mapping.externalId);
        if (!localTask || !remoteTask) {
            continue;
        }

        const conflictKey = buildConflictKey("task", localTask.id, mapping.externalId);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const localPayload = mapTodoistTaskToLocal(remoteTask, mappingState);
        const resolvedListId = localPayload.listId ?? localTask.listId ?? null;
        const externalToLocalLabel = new Map<string, number>();
        for (const [localId, externalId] of localLabelToExternal.entries()) {
            if (localId) {
                externalToLocalLabel.set(externalId, localId);
            }
        }
        const labelIds = (remoteTask.labels ?? [])
            .map((labelId) => externalToLocalLabel.get(labelId) ?? null)
            .filter((id): id is number => Boolean(id));
        await db
            .update(tasks)
            .set({
                title: localPayload.title ?? localTask.title,
                description: localPayload.description ?? localTask.description,
                dueDate: localPayload.dueDate ?? localTask.dueDate,
                dueDatePrecision: localPayload.dueDatePrecision ?? localTask.dueDatePrecision,
                isCompleted: localPayload.isCompleted ?? localTask.isCompleted,
                completedAt: localPayload.isCompleted ? new Date() : null,
                listId: resolvedListId,
            })
            .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)));

        if (labelIds.length > 0) {
            await db.delete(taskLabels).where(eq(taskLabels.taskId, localTask.id));
            await db.insert(taskLabels).values(
                labelIds.map((labelId) => ({
                    taskId: localTask.id,
                    labelId,
                }))
            );
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
        .where(and(eq(externalSyncConflicts.userId, userId), eq(externalSyncConflicts.status, "pending")));

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
    todoistTasks: TodoistTask[];
    taskMappings: typeof externalEntityMap.$inferSelect[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number | null, string>;
    conflictKeys: Set<string>;
}) {
    const {
        userId,
        todoistTasks,
        taskMappings,
        localTaskMap,
        localTaskLabelMap,
        localLabelToExternal,
        conflictKeys,
    } = params;

    const todoistTaskMap = new Map(todoistTasks.map((task) => [task.id, task]));

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

        const conflictKey = buildConflictKey("task", localTaskId, todoistTask.id);
        if (conflictKeys.has(conflictKey)) {
            continue;
        }

        const localPayload = buildLocalTaskPayload(localTask, localTaskLabelMap, localLabelToExternal);
        const remotePayload = buildRemoteTaskPayload(todoistTask);

        if (!tasksMatch(localPayload, remotePayload)) {
            await db.insert(externalSyncConflicts).values({
                userId,
                provider: "todoist",
                entityType: "task",
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
    localLabelToExternal: Map<number | null, string>
) {
    const labelIds = localTaskLabelMap.get(task.id) ?? [];
    const externalLabels = labelIds
        .map((labelId) => localLabelToExternal.get(labelId) ?? null)
        .filter((labelId): labelId is string => Boolean(labelId));

    return {
        title: task.title,
        description: task.description ?? "",
        isCompleted: task.isCompleted ?? false,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        listId: task.listId ?? null,
        parentId: task.parentId ?? null,
        labels: externalLabels.sort(),
    };
}

function buildRemoteTaskPayload(task: TodoistTask) {
    return {
        title: task.content,
        description: task.description ?? "",
        isCompleted: task.is_completed ?? false,
        dueDate: task.due?.date ?? null,
        projectId: task.project_id ?? null,
        parentId: task.parent_id ?? null,
        labels: (task.labels ?? []).slice().sort(),
    };
}

function tasksMatch(
    localPayload: ReturnType<typeof buildLocalTaskPayload>,
    remotePayload: ReturnType<typeof buildRemoteTaskPayload>
) {
    if (localPayload.title !== remotePayload.title) return false;
    if (localPayload.description !== remotePayload.description) return false;
    if (localPayload.isCompleted !== remotePayload.isCompleted) return false;

    const localDue = localPayload.dueDate ? localPayload.dueDate.split("T")[0] : null;
    const remoteDue = remotePayload.dueDate ? remotePayload.dueDate.split("T")[0] : null;
    if (localDue !== remoteDue) return false;

    if (localPayload.parentId && !remotePayload.parentId) return false;
    if (!localPayload.parentId && remotePayload.parentId) return false;

    if (localPayload.labels.length !== remotePayload.labels.length) return false;
    for (let index = 0; index < localPayload.labels.length; index += 1) {
        if (localPayload.labels[index] !== remotePayload.labels[index]) {
            return false;
        }
    }

    return true;
}

async function pushLocalTasks(params: {
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    taskMappings: Map<string, number | null>;
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number | null, string>;
}) {
    const { userId, client, mappingState, taskMappings, conflictKeys, localTaskLabelMap, localLabelToExternal } = params;
    const localTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    const localMapping = new Map<number, string>();

    for (const [externalId, localId] of taskMappings) {
        if (localId) {
            localMapping.set(localId, externalId);
        }
    }

    const pendingTasks = localTasks.filter((task) => !localMapping.has(task.id));
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
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    localMapping: Map<number, string>;
    client: ReturnType<typeof createTodoistClient>;
    userId: string;
    conflictKeys: Set<string>;
    localTaskLabelMap: Map<number, number[]>;
    localLabelToExternal: Map<number | null, string>;
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
        });
        if (task.parentId) {
            const parentExternalId = localMapping.get(task.parentId);
            if (parentExternalId) {
                payload.parent_id = parentExternalId;
            }
        }

        const created = (await client.createTask(payload)) as TodoistTask;
        if (!created?.id) {
            continue;
        }

        localMapping.set(task.id, created.id);
        await db.insert(externalEntityMap).values({
            userId,
            provider: "todoist",
            entityType: "task",
            localId: task.id,
            externalId: created.id,
            externalParentId: created.parent_id ?? null,
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
