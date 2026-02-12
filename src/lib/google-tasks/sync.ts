import { and, eq } from "drizzle-orm";
import {
    db,
    externalEntityMap,
    externalIntegrations,
    externalSyncConflicts,
    externalSyncState,
    lists,
    tasks,
} from "@/db";
import { mapGoogleTaskToLocal, mapLocalTaskToGoogle } from "./mapper";
import { createGoogleTasksClient, fetchGoogleTasksSnapshot, getGoogleTasksAccessToken } from "./service";
import type { GoogleTask } from "./types";

type SyncResult = {
    status: "ok" | "error";
    error?: string;
    conflictCount?: number;
};

export async function syncGoogleTasksForUser(userId: string): Promise<SyncResult> {
    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "google_tasks")),
    });

    if (!integration) {
        return { status: "error", error: "Google Tasks integration not connected." };
    }

    const syncState = await db.query.externalSyncState.findFirst({
        where: and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "google_tasks")),
    });
    const lastSyncedAt = syncState?.lastSyncedAt ?? null;
    const updatedMin = lastSyncedAt ? lastSyncedAt.toISOString() : undefined;

    const { accessToken } = await getGoogleTasksAccessToken(userId);
    const client = createGoogleTasksClient(accessToken);

    await db
        .insert(externalSyncState)
        .values({
            userId,
            provider: "google_tasks" as const,
            status: "syncing",
            lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [externalSyncState.userId, externalSyncState.provider],
            set: { status: "syncing", lastSyncedAt: new Date() },
        });

    try {
        const snapshot = await fetchGoogleTasksSnapshot(client, updatedMin);

        const [existingLists, localTasks, entityMappings, conflictKeys] = await Promise.all([
            db.select().from(lists).where(eq(lists.userId, userId)),
            db.select().from(tasks).where(eq(tasks.userId, userId)),
            db
                .select()
                .from(externalEntityMap)
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"))),
            getExistingConflictKeys(userId),
        ]);

        const listMappings = entityMappings.filter((mapping) => mapping.entityType === "list");
        const taskMappings = entityMappings.filter((mapping) => mapping.entityType === "task");

        const listExternalToLocal = new Map(listMappings.map((mapping) => [mapping.externalId, mapping.localId]));
        const listLocalToExternal = new Map(
            listMappings.filter((mapping) => mapping.localId !== null).map((mapping) => [mapping.localId as number, mapping.externalId])
        );
        const taskLocalToExternal = new Map(
            taskMappings.filter((mapping) => mapping.localId !== null).map((mapping) => [mapping.localId as number, mapping.externalId])
        );

        const localListMap = new Map(existingLists.map((list) => [list.id, list]));
        const localTaskMap = new Map(localTasks.map((task) => [task.id, task]));

        await syncTasklists({
            userId,
            client,
            tasklists: snapshot.tasklists,
            existingLists,
            listExternalToLocal,
            listLocalToExternal,
            localListMap,
        });

        const updatedListMappings = await db
            .select()
            .from(externalEntityMap)
            .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "list")));
        const updatedExternalToLocal = new Map(updatedListMappings.map((mapping) => [mapping.externalId, mapping.localId]));
        const updatedLocalToExternal = new Map(
            updatedListMappings.filter((mapping) => mapping.localId !== null).map((mapping) => [mapping.localId as number, mapping.externalId])
        );

        const remoteTaskIndex = buildRemoteTaskIndex(snapshot.tasksByList);

        await pullRemoteTasks({
            userId,
            remoteTasks: remoteTaskIndex,
            listExternalToLocal: updatedExternalToLocal,
            taskMappings,
            localTaskMap,
            lastSyncedAt,
            conflictKeys,
        });

        await pushLocalTasks({
            userId,
            client,
            localTasks,
            taskLocalToExternal,
            listLocalToExternal: updatedLocalToExternal,
            remoteTasks: remoteTaskIndex,
            lastSyncedAt,
            conflictKeys,
        });

        await db
            .update(externalSyncState)
            .set({ status: "idle", error: null, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "google_tasks")));

        const conflictCount = await db
            .select({ count: externalSyncConflicts.id })
            .from(externalSyncConflicts)
            .where(and(eq(externalSyncConflicts.userId, userId), eq(externalSyncConflicts.status, "pending")));

        return { status: "ok", conflictCount: conflictCount.length };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Google Tasks sync error";
        await db
            .update(externalSyncState)
            .set({ status: "error", error: message, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "google_tasks")));

        return { status: "error", error: message };
    }
}

function buildRemoteTaskIndex(tasksByList: Map<string, GoogleTask[]>) {
    const index = new Map<string, { task: GoogleTask; tasklistId: string }>();
    for (const [tasklistId, tasks] of tasksByList.entries()) {
        for (const task of tasks) {
            index.set(task.id, { task, tasklistId });
        }
    }
    return index;
}

async function syncTasklists(params: {
    userId: string;
    client: ReturnType<typeof createGoogleTasksClient>;
    tasklists: { id: string; title: string; updated?: string; etag?: string }[];
    existingLists: { id: number; name: string; position: number; slug: string }[];
    listExternalToLocal: Map<string, number | null>;
    listLocalToExternal: Map<number, string>;
    localListMap: Map<number, { id: number; name: string; position: number; slug: string }>;
}) {
    const { userId, client, tasklists, existingLists, listExternalToLocal, listLocalToExternal, localListMap } = params;
    let maxPosition = Math.max(0, ...existingLists.map((list) => list.position ?? 0));

    for (const remoteList of tasklists) {
        const mappedLocalId = listExternalToLocal.get(remoteList.id) ?? null;
        if (mappedLocalId) {
            const localList = localListMap.get(mappedLocalId);
            if (localList && localList.name !== remoteList.title) {
                await db
                    .update(lists)
                    .set({ name: remoteList.title })
                    .where(and(eq(lists.id, localList.id), eq(lists.userId, userId)));
            }
            continue;
        }

        const slug = slugify(remoteList.title);
        const created = await db
            .insert(lists)
            .values({ userId, name: remoteList.title, slug, position: maxPosition + 1 })
            .returning();
        maxPosition += 1;
        const localId = created[0]?.id ?? null;

        if (localId) {
            await db.insert(externalEntityMap).values({
                userId,
                provider: "google_tasks" as const,
                entityType: "list" as const,
                localId,
                externalId: remoteList.id,
            });
        }
    }

    const remoteListIds = new Set(tasklists.map((list) => list.id));
    for (const [localId, externalId] of listLocalToExternal.entries()) {
        if (!remoteListIds.has(externalId)) {
            await db.delete(lists).where(and(eq(lists.id, localId), eq(lists.userId, userId)));
            await db
                .delete(externalEntityMap)
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "list"), eq(externalEntityMap.localId, localId)));
        }
    }

    const unmappedLists = existingLists.filter((list) => !listLocalToExternal.has(list.id));
    for (const list of unmappedLists) {
        const created = await client.createTasklist({ title: list.name });
        await db.insert(externalEntityMap).values({
            userId,
            provider: "google_tasks" as const,
            entityType: "list" as const,
            localId: list.id,
            externalId: created.id,
        });
    }
}

async function pullRemoteTasks(params: {
    userId: string;
    remoteTasks: Map<string, { task: GoogleTask; tasklistId: string }>;
    listExternalToLocal: Map<string, number | null>;
    taskMappings: { id: number; externalId: string; localId: number | null }[];
    localTaskMap: Map<number, typeof tasks.$inferSelect>;
    lastSyncedAt: Date | null;
    conflictKeys: Set<string>;
}) {
    const { userId, remoteTasks, listExternalToLocal, taskMappings, localTaskMap, lastSyncedAt, conflictKeys } = params;

    const taskExternalToLocal = new Map(taskMappings.map((mapping) => [mapping.externalId, mapping.localId]));

    for (const [externalId, entry] of remoteTasks.entries()) {
        const { task, tasklistId } = entry;
        const listId = listExternalToLocal.get(tasklistId) ?? null;
        if (!listId) continue;

        const mappedLocalId = taskExternalToLocal.get(externalId) ?? null;
        const remoteUpdatedAt = task.updated ? new Date(task.updated) : null;

        if (task.deleted) {
            if (mappedLocalId) {
                await db.delete(tasks).where(and(eq(tasks.id, mappedLocalId), eq(tasks.userId, userId)));
                await db
                    .delete(externalEntityMap)
                    .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "task"), eq(externalEntityMap.externalId, externalId)));
            }
            continue;
        }

        if (mappedLocalId && localTaskMap.has(mappedLocalId)) {
            const localTask = localTaskMap.get(mappedLocalId)!;
            if (shouldCreateConflict(localTask, task, listId, lastSyncedAt, conflictKeys)) {
                await createConflict({
                    userId,
                    localTask,
                    task,
                    tasklistId,
                    listId,
                    conflictKeys,
                });
                continue;
            }

            if (remoteUpdatedAt && (!lastSyncedAt || remoteUpdatedAt > lastSyncedAt)) {
                const updates = mapGoogleTaskToLocal(task, listId);
                await db
                    .update(tasks)
                    .set({
                        title: updates.title ?? localTask.title,
                        description: updates.description ?? localTask.description,
                        isCompleted: updates.isCompleted ?? localTask.isCompleted,
                        completedAt: updates.completedAt ?? localTask.completedAt,
                        dueDate: updates.dueDate ?? localTask.dueDate,
                        dueDatePrecision: updates.dueDatePrecision ?? localTask.dueDatePrecision,
                        listId: updates.listId ?? localTask.listId,
                        updatedAt: new Date(),
                    })
                    .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)));
            }

            await db
                .update(externalEntityMap)
                .set({
                    externalParentId: task.parent ?? null,
                    externalEtag: task.etag ?? null,
                    externalUpdatedAt: remoteUpdatedAt,
                    updatedAt: new Date(),
                })
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "task"), eq(externalEntityMap.externalId, externalId)));

            continue;
        }

        const payload = mapGoogleTaskToLocal(task, listId);
        const created = await db
            .insert(tasks)
            .values({
                userId,
                title: payload.title ?? task.title,
                description: payload.description ?? null,
                isCompleted: payload.isCompleted ?? false,
                completedAt: payload.completedAt ?? null,
                dueDate: payload.dueDate ?? null,
                dueDatePrecision: payload.dueDatePrecision ?? null,
                listId,
                isRecurring: false,
                recurringRule: null,
            })
            .returning();

        const localId = created[0]?.id ?? null;
        if (localId) {
            await db.insert(externalEntityMap).values({
                userId,
                provider: "google_tasks" as const,
                entityType: "task" as const,
                localId,
                externalId,
                externalParentId: task.parent ?? null,
                externalEtag: task.etag ?? null,
                externalUpdatedAt: remoteUpdatedAt,
            });
        }
    }
}

async function pushLocalTasks(params: {
    userId: string;
    client: ReturnType<typeof createGoogleTasksClient>;
    localTasks: typeof tasks.$inferSelect[];
    taskLocalToExternal: Map<number, string>;
    listLocalToExternal: Map<number, string>;
    remoteTasks: Map<string, { task: GoogleTask; tasklistId: string }>;
    lastSyncedAt: Date | null;
    conflictKeys: Set<string>;
}) {
    const { userId, client, localTasks, taskLocalToExternal, listLocalToExternal, remoteTasks, lastSyncedAt, conflictKeys } = params;

    for (const localTask of localTasks) {
        if (!localTask.listId) continue;
        const tasklistId = listLocalToExternal.get(localTask.listId) ?? null;
        if (!tasklistId) continue;

        const externalId = taskLocalToExternal.get(localTask.id) ?? null;
        if (!externalId) {
            const created = await client.createTask(tasklistId, mapLocalTaskToGoogle(localTask));
            await db.insert(externalEntityMap).values({
                userId,
                provider: "google_tasks" as const,
                entityType: "task" as const,
                localId: localTask.id,
                externalId: created.id,
                externalParentId: created.parent ?? null,
                externalEtag: created.etag ?? null,
                externalUpdatedAt: created.updated ? new Date(created.updated) : null,
            });
            continue;
        }

        const remoteEntry = remoteTasks.get(externalId);
        const remoteUpdatedAt = remoteEntry?.task.updated ? new Date(remoteEntry.task.updated) : null;

        if (remoteEntry && shouldCreateConflict(localTask, remoteEntry.task, localTask.listId, lastSyncedAt, conflictKeys)) {
            await createConflict({
                userId,
                localTask,
                task: remoteEntry.task,
                tasklistId: remoteEntry.tasklistId,
                listId: localTask.listId,
                conflictKeys,
            });
            continue;
        }

        if (lastSyncedAt && localTask.updatedAt <= lastSyncedAt) {
            continue;
        }

        if (remoteUpdatedAt && lastSyncedAt && remoteUpdatedAt > lastSyncedAt) {
            continue;
        }

        if (remoteEntry) {
            const updated = await client.updateTask(tasklistId, externalId, mapLocalTaskToGoogle(localTask));
            await db
                .update(externalEntityMap)
                .set({
                    externalParentId: updated.parent ?? null,
                    externalEtag: updated.etag ?? null,
                    externalUpdatedAt: updated.updated ? new Date(updated.updated) : null,
                    updatedAt: new Date(),
                })
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "task"), eq(externalEntityMap.externalId, externalId)));
        } else {
            const created = await client.createTask(tasklistId, mapLocalTaskToGoogle(localTask));
            await db
                .update(externalEntityMap)
                .set({
                    externalId: created.id,
                    externalParentId: created.parent ?? null,
                    externalEtag: created.etag ?? null,
                    externalUpdatedAt: created.updated ? new Date(created.updated) : null,
                    updatedAt: new Date(),
                })
                .where(and(eq(externalEntityMap.userId, userId), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "task"), eq(externalEntityMap.localId, localTask.id)));
        }
    }
}

async function getExistingConflictKeys(userId: string) {
    const conflicts = await db
        .select()
        .from(externalSyncConflicts)
        .where(and(eq(externalSyncConflicts.userId, userId), eq(externalSyncConflicts.provider, "google_tasks"), eq(externalSyncConflicts.status, "pending")));
    return new Set(conflicts.map((conflict) => `${conflict.localId ?? "null"}:${conflict.externalId ?? "null"}`));
}

function shouldCreateConflict(
    localTask: typeof tasks.$inferSelect,
    remoteTask: GoogleTask,
    listId: number,
    lastSyncedAt: Date | null,
    conflictKeys: Set<string>
) {
    if (!lastSyncedAt || !remoteTask.updated) return false;
    const localUpdated = localTask.updatedAt;
    const remoteUpdated = new Date(remoteTask.updated);
    if (localUpdated <= lastSyncedAt || remoteUpdated <= lastSyncedAt) return false;
    const key = `${localTask.id}:${remoteTask.id}`;
    if (conflictKeys.has(key)) return true;
    return !tasksMatch(localTask, remoteTask, listId);
}

function tasksMatch(localTask: typeof tasks.$inferSelect, remoteTask: GoogleTask, listId: number) {
    const mapped = mapGoogleTaskToLocal(remoteTask, listId);
    const dueLocal = localTask.dueDate ? localTask.dueDate.toISOString() : null;
    const dueRemote = mapped.dueDate ? mapped.dueDate.toISOString() : null;
    return (
        localTask.title === mapped.title &&
        (localTask.description ?? null) === (mapped.description ?? null) &&
        localTask.isCompleted === (mapped.isCompleted ?? false) &&
        (localTask.listId ?? null) === (mapped.listId ?? null) &&
        dueLocal === dueRemote
    );
}

async function createConflict(params: {
    userId: string;
    localTask: typeof tasks.$inferSelect;
    task: GoogleTask;
    tasklistId: string;
    listId: number;
    conflictKeys: Set<string>;
}) {
    const { userId, localTask, task, tasklistId, listId, conflictKeys } = params;
    const key = `${localTask.id}:${task.id}`;
    if (conflictKeys.has(key)) return;
    conflictKeys.add(key);
    await db.insert(externalSyncConflicts).values({
        userId,
        provider: "google_tasks" as const,
        entityType: "task" as const,
        localId: localTask.id,
        externalId: task.id,
        conflictType: "task_update",
        localPayload: JSON.stringify({
            title: localTask.title,
            description: localTask.description ?? null,
            isCompleted: localTask.isCompleted,
            dueDate: localTask.dueDate ? localTask.dueDate.toISOString() : null,
            listId,
        }),
        externalPayload: JSON.stringify({
            title: task.title,
            notes: task.notes ?? null,
            status: task.status ?? "needsAction",
            due: task.due ?? null,
            completed: task.completed ?? null,
            listId,
            tasklistId,
        }),
    });
}

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
