import { and, eq } from "drizzle-orm";
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

async function pushLocalTasks(params: {
    userId: string;
    client: ReturnType<typeof createTodoistClient>;
    mappingState: { projects: { projectId: string; listId: number | null }[]; labels: { labelId: string; listId: number | null }[] };
    taskMappings: Map<string, number | null>;
}) {
    const { userId, client, mappingState, taskMappings } = params;
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
    });

    await createLocalTasksInTodoist({
        tasks: childTasks,
        mappingState,
        localMapping,
        client,
        userId,
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
}) {
    const { tasks: localTasks, mappingState, localMapping, client, userId } = params;

    for (const task of localTasks) {
        if (localMapping.has(task.id)) {
            continue;
        }

        const payload = mapLocalTaskToTodoist(task, mappingState);
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
