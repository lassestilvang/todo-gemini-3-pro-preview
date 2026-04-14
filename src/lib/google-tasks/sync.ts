import pLimit from "p-limit";
import { and, eq, inArray } from "drizzle-orm";
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

export async function syncGoogleTasksForUser(
  userId: string,
): Promise<SyncResult> {
  const integration = await db.query.externalIntegrations.findFirst({
    where: and(
      eq(externalIntegrations.userId, userId),
      eq(externalIntegrations.provider, "google_tasks"),
    ),
  });

  if (!integration) {
    return {
      status: "error",
      error: "Google Tasks integration not connected.",
    };
  }

  const syncState = await db.query.externalSyncState.findFirst({
    where: and(
      eq(externalSyncState.userId, userId),
      eq(externalSyncState.provider, "google_tasks"),
    ),
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

    const [existingLists, localTasks, entityMappings, conflictKeys] =
      await Promise.all([
        db.select().from(lists).where(eq(lists.userId, userId)),
        db.select().from(tasks).where(eq(tasks.userId, userId)),
        db
          .select()
          .from(externalEntityMap)
          .where(
            and(
              eq(externalEntityMap.userId, userId),
              eq(externalEntityMap.provider, "google_tasks"),
            ),
          ),
        getExistingConflictKeys(userId),
      ]);

    const listMappings = entityMappings.filter(
      (mapping) => mapping.entityType === "list",
    );
    const taskMappings = entityMappings.filter(
      (mapping) => mapping.entityType === "task",
    );

    // ⚡ Bolt Opt: Replaced chained .filter().map() inside new Map() with single pass for...of loops
    // This avoids creating intermediate arrays, reducing memory allocations and GC overhead
    const listExternalToLocal = new Map<string, number | null>();
    for (const mapping of listMappings) {
      listExternalToLocal.set(mapping.externalId, mapping.localId);
    }

    const listLocalToExternal = new Map<number, string>();
    for (const mapping of listMappings) {
      if (mapping.localId !== null) {
        listLocalToExternal.set(mapping.localId, mapping.externalId);
      }
    }

    const taskLocalToExternal = new Map<number, string>();
    for (const mapping of taskMappings) {
      if (mapping.localId !== null) {
        taskLocalToExternal.set(mapping.localId, mapping.externalId);
      }
    }

    const localListMap = new Map<number, (typeof existingLists)[0]>();
    for (const list of existingLists) {
      localListMap.set(list.id, list);
    }

    const localTaskMap = new Map<number, (typeof localTasks)[0]>();
    for (const task of localTasks) {
      localTaskMap.set(task.id, task);
    }

    await syncTasklists({
      userId,
      client,
      tasklists: snapshot.tasklists,
      existingLists,
      listExternalToLocal,
      listLocalToExternal,
      localListMap,
      useUserMappings: listMappings.length > 0,
    });

    const updatedListMappings = await db
      .select()
      .from(externalEntityMap)
      .where(
        and(
          eq(externalEntityMap.userId, userId),
          eq(externalEntityMap.provider, "google_tasks"),
          eq(externalEntityMap.entityType, "list"),
        ),
      );

    // ⚡ Bolt Opt: Populating both maps in a single pass to reduce iterations from O(3N) down to O(N)
    // Eliminates two intermediate array allocations created by .map() and .filter().map()
    const updatedExternalToLocal = new Map<string, number | null>();
    const updatedLocalToExternal = new Map<number, string>();
    for (const mapping of updatedListMappings) {
      updatedExternalToLocal.set(mapping.externalId, mapping.localId);
      if (mapping.localId !== null) {
        updatedLocalToExternal.set(mapping.localId, mapping.externalId);
      }
    }

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
      .where(
        and(
          eq(externalSyncState.userId, userId),
          eq(externalSyncState.provider, "google_tasks"),
        ),
      );

    const conflictCount = await db
      .select({ count: externalSyncConflicts.id })
      .from(externalSyncConflicts)
      .where(
        and(
          eq(externalSyncConflicts.userId, userId),
          eq(externalSyncConflicts.status, "pending"),
        ),
      );

    return { status: "ok", conflictCount: conflictCount.length };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Google Tasks sync error";
    await db
      .update(externalSyncState)
      .set({ status: "error", error: message, lastSyncedAt: new Date() })
      .where(
        and(
          eq(externalSyncState.userId, userId),
          eq(externalSyncState.provider, "google_tasks"),
        ),
      );

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
  localListMap: Map<
    number,
    { id: number; name: string; position: number; slug: string }
  >;
  useUserMappings: boolean;
}) {
  const {
    userId,
    client,
    tasklists,
    existingLists,
    listExternalToLocal,
    listLocalToExternal,
    localListMap,
    useUserMappings,
  } = params;
  let maxPosition = Math.max(
    0,
    ...existingLists.map((list) => list.position ?? 0),
  );

  const listsToInsert: {
    userId: string;
    name: string;
    slug: string;
    position: number;
    externalId: string;
  }[] = [];
  const listUpdatePromises: Promise<any>[] = [];

  for (const remoteList of tasklists) {
    const hasMapping = listExternalToLocal.has(remoteList.id);
    const mappedLocalId = listExternalToLocal.get(remoteList.id) ?? null;
    if (useUserMappings && !hasMapping) {
      continue;
    }
    if (hasMapping && !mappedLocalId) {
      continue;
    }
    if (mappedLocalId) {
      const localList = localListMap.get(mappedLocalId);
      if (localList && localList.name !== remoteList.title) {
        // ⚡ Bolt Opt: Replaced sequential db.update() with concurrent promises
        // Executing updates in parallel reduces total I/O wait time from O(N) to O(1)
        listUpdatePromises.push(
          db
            .update(lists)
            .set({ name: remoteList.title })
            .where(and(eq(lists.id, localList.id), eq(lists.userId, userId))),
        );
      }
      continue;
    }

    const slug = slugify(remoteList.title);
    listsToInsert.push({
      userId,
      name: remoteList.title,
      slug,
      position: maxPosition + 1,
      externalId: remoteList.id,
    });
    maxPosition += 1;
  }

  if (listUpdatePromises.length > 0) {
    await Promise.all(listUpdatePromises);
  }

  if (listsToInsert.length > 0) {
    const insertPayload = listsToInsert.map(
      ({ userId, name, slug, position }) => ({
        userId,
        name,
        slug,
        position,
      }),
    );

    const created = await db.insert(lists).values(insertPayload).returning();

    const entityMapPayload = created.map((localList, index) => ({
      userId,
      provider: "google_tasks" as const,
      entityType: "list" as const,
      localId: localList.id,
      externalId: listsToInsert[index].externalId,
    }));

    if (entityMapPayload.length > 0) {
      await db.insert(externalEntityMap).values(entityMapPayload);
    }
  }

  const remoteListIds = new Set(tasklists.map((list) => list.id));
  const listIdsToDelete: number[] = [];
  for (const [localId, externalId] of listLocalToExternal.entries()) {
    if (!remoteListIds.has(externalId)) {
      listIdsToDelete.push(localId);
    }
  }

  if (listIdsToDelete.length > 0) {
    await db
      .delete(lists)
      .where(and(eq(lists.userId, userId), inArray(lists.id, listIdsToDelete)));
    await db
      .delete(externalEntityMap)
      .where(
        and(
          eq(externalEntityMap.userId, userId),
          eq(externalEntityMap.provider, "google_tasks"),
          eq(externalEntityMap.entityType, "list"),
          inArray(externalEntityMap.localId, listIdsToDelete),
        ),
      );
  }

  if (useUserMappings) {
    return;
  }

  const unmappedLists = existingLists.filter(
    (list) => !listLocalToExternal.has(list.id),
  );
  if (unmappedLists.length > 0) {
    const newMappings = await Promise.all(
      unmappedLists.map(async (list) => {
        const created = await client.createTasklist({ title: list.name });
        return {
          userId,
          provider: "google_tasks" as const,
          entityType: "list" as const,
          localId: list.id,
          externalId: created.id,
        };
      }),
    );
    await db.insert(externalEntityMap).values(newMappings);
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
  const {
    userId,
    remoteTasks,
    listExternalToLocal,
    taskMappings,
    localTaskMap,
    lastSyncedAt,
    conflictKeys,
  } = params;

  // ⚡ Bolt Opt: Replaced new Map(array.map()) with for...of to avoid O(N) intermediate array allocation
  const taskExternalToLocal = new Map<string, number | null>();
  for (const mapping of taskMappings) {
    taskExternalToLocal.set(mapping.externalId, mapping.localId);
  }

  const tasksToInsert: (typeof tasks.$inferInsert)[] = [];
  const taskInsertMetadata: {
    externalId: string;
    externalParentId: string | null;
    externalEtag: string | null;
    externalUpdatedAt: Date | null;
  }[] = [];

  const limit = pLimit(10);
  const taskUpdatePromises: Promise<unknown>[] = [];
  const conflictPromises: Promise<unknown>[] = [];

  // ⚡ Bolt Opt: Batch database deletions to prevent N+1 queries.
  const localTasksToDelete: number[] = [];
  const externalIdsToDelete: string[] = [];

  for (const [externalId, entry] of remoteTasks) {
    const { task, tasklistId } = entry;
    const listId = listExternalToLocal.get(tasklistId) ?? null;
    if (!listId) continue;

    const mappedLocalId = taskExternalToLocal.get(externalId) ?? null;
    const remoteUpdatedAt = task.updated ? new Date(task.updated) : null;

    if (task.deleted) {
      if (mappedLocalId) {
        localTasksToDelete.push(mappedLocalId);
        externalIdsToDelete.push(externalId);
      }
      continue;
    }

    if (mappedLocalId && localTaskMap.has(mappedLocalId)) {
      const localTask = localTaskMap.get(mappedLocalId)!;
      if (
        shouldCreateConflict(
          localTask,
          task,
          listId,
          lastSyncedAt,
          conflictKeys,
        )
      ) {
        conflictPromises.push(
          createConflict({
            userId,
            localTask,
            task,
            tasklistId,
            listId,
            conflictKeys,
          })
        );
        continue;
      }

      if (
        remoteUpdatedAt &&
        (!lastSyncedAt || remoteUpdatedAt > lastSyncedAt)
      ) {
        const updates = mapGoogleTaskToLocal(task, listId);
        // ⚡ Bolt Opt: Push db.update calls to an array for concurrent execution to eliminate sequential bottleneck
        taskUpdatePromises.push(
          db
            .update(tasks)
            .set({
              title: updates.title ?? localTask.title,
              description: updates.description ?? localTask.description,
              isCompleted: updates.isCompleted ?? localTask.isCompleted,
              completedAt: updates.completedAt ?? localTask.completedAt,
              dueDate: updates.dueDate ?? localTask.dueDate,
              dueDatePrecision:
                updates.dueDatePrecision ?? localTask.dueDatePrecision,
              listId: updates.listId ?? localTask.listId,
              updatedAt: new Date(),
            })
            .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)))
        );
      }

      taskUpdatePromises.push(
        db
          .update(externalEntityMap)
          .set({
            externalParentId: task.parent ?? null,
            externalEtag: task.etag ?? null,
            externalUpdatedAt: remoteUpdatedAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(externalEntityMap.userId, userId),
              eq(externalEntityMap.provider, "google_tasks"),
              eq(externalEntityMap.entityType, "task"),
              eq(externalEntityMap.externalId, externalId),
            ),
          )
      );

      continue;
    }

    const payload = mapGoogleTaskToLocal(task, listId);
    tasksToInsert.push({
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
    });
    taskInsertMetadata.push({
      externalId,
      externalParentId: task.parent ?? null,
      externalEtag: task.etag ?? null,
      externalUpdatedAt: remoteUpdatedAt,
    });
  }

  if (conflictPromises.length > 0) {
    await Promise.all(conflictPromises);
  }

  if (taskUpdatePromises.length > 0) {
    await Promise.all(taskUpdatePromises);
  }

  if (tasksToInsert.length > 0) {
    const created = await db.insert(tasks).values(tasksToInsert).returning();
    const entityMapPayload = created.map((localTask, index) => {
      const meta = taskInsertMetadata[index];
      return {
        userId,
        provider: "google_tasks" as const,
        entityType: "task" as const,
        localId: localTask.id,
        externalId: meta.externalId,
        externalParentId: meta.externalParentId,
        externalEtag: meta.externalEtag,
        externalUpdatedAt: meta.externalUpdatedAt,
      };
    });

    if (entityMapPayload.length > 0) {
      await db.insert(externalEntityMap).values(entityMapPayload);
    }
  }

  if (localTasksToDelete.length > 0) {
    await db
      .delete(tasks)
      .where(and(inArray(tasks.id, localTasksToDelete), eq(tasks.userId, userId)));
  }

  if (externalIdsToDelete.length > 0) {
    await db
      .delete(externalEntityMap)
      .where(
        and(
          eq(externalEntityMap.userId, userId),
          eq(externalEntityMap.provider, "google_tasks"),
          eq(externalEntityMap.entityType, "task"),
          inArray(externalEntityMap.externalId, externalIdsToDelete),
        ),
      );
  }
}

async function pushLocalTasks(params: {
  userId: string;
  client: ReturnType<typeof createGoogleTasksClient>;
  localTasks: (typeof tasks.$inferSelect)[];
  taskLocalToExternal: Map<number, string>;
  listLocalToExternal: Map<number, string>;
  remoteTasks: Map<string, { task: GoogleTask; tasklistId: string }>;
  lastSyncedAt: Date | null;
  conflictKeys: Set<string>;
}) {
    const { userId, client, localTasks, taskLocalToExternal, listLocalToExternal, remoteTasks, lastSyncedAt, conflictKeys } = params;

    // ⚡ Bolt Opt: Replaced Unbounded Promise.all with bounded p-limit(10) concurrency
    // This maintains concurrent processing while bounding the number of in-flight requests to prevent rate limit issues
    const limit = pLimit(10);

    const syncPromises = localTasks.map((localTask) => limit(async () => {
        try {
            if (!localTask.listId) return;
            const tasklistId = listLocalToExternal.get(localTask.listId) ?? null;
            if (!tasklistId) return;

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
                return;
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
                return;
            }

            if (lastSyncedAt && localTask.updatedAt <= lastSyncedAt) {
                return;
            }

            if (remoteUpdatedAt && lastSyncedAt && remoteUpdatedAt > lastSyncedAt) {
                return;
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
                    .where(
                        and(
                            eq(externalEntityMap.userId, userId),
                            eq(externalEntityMap.provider, "google_tasks"),
                            eq(externalEntityMap.entityType, "task"),
                            eq(externalEntityMap.externalId, externalId)
                        )
                    );
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
                    .where(
                        and(
                            eq(externalEntityMap.userId, userId),
                            eq(externalEntityMap.provider, "google_tasks"),
                            eq(externalEntityMap.entityType, "task"),
                            eq(externalEntityMap.localId, localTask.id)
                        )
                    );
            }
        } catch (error) {
            limit.clearQueue();
            throw error;
        }
    }));

    try {
        await Promise.all(syncPromises);
    } catch (e) {
        limit.clearQueue();
        throw e;
    }
}

async function getExistingConflictKeys(userId: string) {
  const conflicts = await db
    .select()
    .from(externalSyncConflicts)
    .where(
      and(
        eq(externalSyncConflicts.userId, userId),
        eq(externalSyncConflicts.provider, "google_tasks"),
        eq(externalSyncConflicts.status, "pending"),
      ),
    );
  return new Set(
    conflicts.map(
      (conflict) =>
        `${conflict.localId ?? "null"}:${conflict.externalId ?? "null"}`,
    ),
  );
}

function shouldCreateConflict(
  localTask: typeof tasks.$inferSelect,
  remoteTask: GoogleTask,
  listId: number,
  lastSyncedAt: Date | null,
  conflictKeys: Set<string>,
) {
  if (!lastSyncedAt || !remoteTask.updated) return false;
  const localUpdated = localTask.updatedAt;
  const remoteUpdated = new Date(remoteTask.updated);
  if (localUpdated <= lastSyncedAt || remoteUpdated <= lastSyncedAt)
    return false;
  const key = `${localTask.id}:${remoteTask.id}`;
  if (conflictKeys.has(key)) return true;
  return !tasksMatch(localTask, remoteTask, listId);
}

function tasksMatch(
  localTask: typeof tasks.$inferSelect,
  remoteTask: GoogleTask,
  listId: number,
) {
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
