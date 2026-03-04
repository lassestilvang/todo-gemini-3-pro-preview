import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { and, eq } from "drizzle-orm";
import type { Task as TodoistTask } from "@doist/todoist-api-typescript";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, externalSyncState, labels, lists, taskLabels, tasks } from "@/db";
import { encryptToken, resetTodoistKeyRingForTests } from "@/lib/todoist/crypto";
import * as todoistService from "@/lib/todoist/service";

type Snapshot = {
    projects: { id: string; name: string }[];
    labels: { id: string; name: string; order?: number }[];
    tasks: TodoistTask[];
};

const serviceState: {
    snapshot: Snapshot;
    client: {
        createTask: ReturnType<typeof mock>;
        updateTask: ReturnType<typeof mock>;
        moveTask: ReturnType<typeof mock>;
        closeTask: ReturnType<typeof mock>;
        reopenTask: ReturnType<typeof mock>;
        deleteTask: ReturnType<typeof mock>;
        createLabel: ReturnType<typeof mock>;
        updateLabel: ReturnType<typeof mock>;
    };
} = {
    snapshot: { projects: [], labels: [], tasks: [] },
    client: {
        createTask: mock(async () => ({ id: "created_task" })),
        updateTask: mock(async () => undefined),
        moveTask: mock(async () => undefined),
        closeTask: mock(async () => undefined),
        reopenTask: mock(async () => undefined),
        deleteTask: mock(async () => undefined),
        createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
            id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
            name,
            order: order ?? 0,
            color: "charcoal",
            isFavorite: false,
        })),
        updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
            id,
            name: payload.name ?? "updated",
            order: payload.order ?? 0,
            color: "charcoal",
            isFavorite: false,
        })),
    },
};

// Removed mock.module, replaced with spyOn in beforeEach

import { syncTodoistForUser } from "@/lib/todoist/sync";

function makeTask(partial: { id: string; content: string; projectId: string } & Partial<TodoistTask>): TodoistTask {
    const base = {
        id: partial.id,
        content: partial.content,
        projectId: partial.projectId,
        labels: partial.labels ?? [],
        checked: partial.checked ?? false,
        description: partial.description ?? "",
        due: partial.due ?? null,
        parentId: partial.parentId ?? null,
        updatedAt: partial.updatedAt ?? "2026-02-12T10:00:00.000Z",
        completedAt: partial.completedAt ?? null,
        priority: partial.priority ?? 1,
    };

    return {
        ...base,
        ...partial,
        id: partial.id,
        content: partial.content,
        projectId: partial.projectId,
    } as unknown as TodoistTask;
}

async function insertTodoistIntegration(userId: string) {
    const encrypted = await encryptToken("todoist-token");
    await db.insert(externalIntegrations).values({
        userId,
        provider: "todoist",
        accessTokenEncrypted: encrypted.ciphertext,
        accessTokenIv: encrypted.iv,
        accessTokenTag: encrypted.tag,
        accessTokenKeyId: encrypted.keyId ?? "default",
    });
}

describe("Integration: Todoist Sync", () => {
    const previousEncryptionKey = process.env.TODOIST_ENCRYPTION_KEY;
    const previousEncryptionKeys = process.env.TODOIST_ENCRYPTION_KEYS;
    const previousEncryptedKey = process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED;
    const previousEncryptedKeys = process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED;

    beforeAll(async () => {
        process.env.TODOIST_ENCRYPTION_KEY = "a".repeat(64);
        process.env.TODOIST_ENCRYPTION_KEYS = "";
        process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED = "";
        process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED = "";
        resetTodoistKeyRingForTests();
        await setupTestDb();
    });

    afterAll(() => {
        process.env.TODOIST_ENCRYPTION_KEY = previousEncryptionKey;
        process.env.TODOIST_ENCRYPTION_KEYS = previousEncryptionKeys;
        process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED = previousEncryptedKey;
        process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED = previousEncryptedKeys;
        resetTodoistKeyRingForTests();
    });

    beforeEach(async () => {
        await resetTestDb();
        serviceState.snapshot = { projects: [], labels: [], tasks: [] };
        serviceState.client = {
            createTask: mock(async () => ({ id: "created_task" })),
            updateTask: mock(async () => undefined),
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };

        spyOn(todoistService, "createTodoistClient").mockImplementation(() => serviceState.client as unknown as ReturnType<typeof todoistService.createTodoistClient>);
        spyOn(todoistService, "fetchTodoistSnapshot").mockImplementation(async () => serviceState.snapshot);
    });

    afterEach(() => {
        mock.restore();
    });

    it("pulls only mapped-label tasks and imports only scoped labels", async () => {
        const user = await createTestUser("todoist_scope_user", "todoist_scope@example.com");

        const [testList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Test List", slug: "test-list", position: 0 })
            .returning();

        await insertTodoistIntegration(user.id);

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list_label",
            localId: testList.id,
            externalId: "label_test",
        });

        serviceState.snapshot = {
            projects: [
                { id: "project_a", name: "Project A" },
                { id: "project_b", name: "Project B" },
            ],
            labels: [
                { id: "label_test", name: "test", order: 1 },
                { id: "label_other", name: "other", order: 2 },
            ],
            tasks: [
                makeTask({
                    id: "task_scoped",
                    content: "Mapped Task",
                    projectId: "project_a",
                    labels: ["test"],
                }),
                makeTask({
                    id: "task_unscoped",
                    content: "Unmapped Task",
                    projectId: "project_b",
                    labels: ["other"],
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");

        const localTasks = await db.select().from(tasks).where(eq(tasks.userId, user.id));
        expect(localTasks.length).toBe(1);
        expect(localTasks[0].title).toBe("Mapped Task");
        expect(localTasks[0].listId).toBe(testList.id);

        const taskMappings = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "todoist"),
                    eq(externalEntityMap.entityType, "task")
                )
            );
        expect(taskMappings.map((row) => row.externalId).sort()).toEqual(["task_scoped"]);

        const labelMappings = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "todoist"),
                    eq(externalEntityMap.entityType, "label")
                )
            );
        expect(labelMappings.map((row) => row.externalId).sort()).toEqual(["label_test"]);
    });

    it("does not push local unmapped inbox tasks when scoped mappings exist", async () => {
        const user = await createTestUser("todoist_push_scope_user", "todoist_push_scope@example.com");

        const [testList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Test List", slug: "test-list", position: 0 })
            .returning();

        await insertTodoistIntegration(user.id);

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list_label",
            localId: testList.id,
            externalId: "label_test",
        });

        await db.insert(tasks).values({
            userId: user.id,
            title: "Inbox Local Task",
            listId: null,
            isCompleted: false,
            position: 0,
        });

        const createTaskMock = mock(async () => ({ id: "created_remote" }));
        serviceState.client = {
            createTask: createTaskMock,
            updateTask: mock(async () => undefined),
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [{ id: "label_test", name: "test", order: 1 }],
            tasks: [],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(createTaskMock).not.toHaveBeenCalled();
    });

    it("preserves non-scoped remote labels when pushing managed task updates", async () => {
        const user = await createTestUser("todoist_preserve_remote_labels_user", "todoist_preserve_remote_labels@example.com");

        const [testList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Test List", slug: "test-list", position: 0 })
            .returning();
        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: testList.id,
                title: "Local Updated Title",
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T12:00:00.000Z"),
            })
            .returning();

        await insertTodoistIntegration(user.id);
        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "todoist",
            status: "idle",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
            updatedAt: new Date("2026-02-12T10:00:00.000Z"),
        });
        await db.insert(externalEntityMap).values([
            {
                userId: user.id,
                provider: "todoist",
                entityType: "list_label",
                localId: testList.id,
                externalId: "label_test",
            },
            {
                userId: user.id,
                provider: "todoist",
                entityType: "task",
                localId: localTask.id,
                externalId: "remote_task_1",
            },
        ]);

        const updateTaskMock = mock(async () => undefined);
        serviceState.client = {
            createTask: mock(async () => ({ id: "created_task" })),
            updateTask: updateTaskMock,
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [],
            labels: [{ id: "label_test", name: "test", order: 1 }],
            tasks: [
                makeTask({
                    id: "remote_task_1",
                    content: "Remote Old Title",
                    projectId: "project_a",
                    labels: ["test", "external_only"],
                    updatedAt: "2026-02-12T09:00:00.000Z",
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(updateTaskMock).toHaveBeenCalledTimes(1);

        const updatePayload = updateTaskMock.mock.calls[0]?.[1] as { labels?: string[] } | undefined;
        expect(updatePayload).toBeTruthy();
        expect(updatePayload?.labels).toBeTruthy();
        expect(updatePayload?.labels?.includes("test")).toBe(true);
        expect(updatePayload?.labels?.includes("external_only")).toBe(true);
    });

    it("does not create conflicts on initial sync without a previous sync timestamp", async () => {
        const user = await createTestUser("todoist_initial_conflict_user", "todoist_initial_conflict@example.com");

        const [mappedList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Mapped List", slug: "mapped-list", position: 0 })
            .returning();

        await insertTodoistIntegration(user.id);

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list",
            localId: mappedList.id,
            externalId: "project_a",
        });

        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: mappedList.id,
                title: "Local Title",
                description: "Local Desc",
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T12:00:00.000Z"),
            })
            .returning();

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "task",
            localId: localTask.id,
            externalId: "remote_task_1",
        });

        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [],
            tasks: [
                makeTask({
                    id: "remote_task_1",
                    content: "Remote Title",
                    projectId: "project_a",
                    updatedAt: "2026-02-12T12:30:00.000Z",
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");

        const conflicts = await db
            .select()
            .from(externalSyncConflicts)
            .where(
                and(
                    eq(externalSyncConflicts.userId, user.id),
                    eq(externalSyncConflicts.provider, "todoist"),
                    eq(externalSyncConflicts.status, "pending")
                )
            );
        expect(conflicts.length).toBe(0);
    });

    it("does not start a second sync while one is already running", async () => {
        const user = await createTestUser("todoist_sync_lock_user", "todoist_sync_lock@example.com");
        await insertTodoistIntegration(user.id);

        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "todoist",
            status: "syncing",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
            updatedAt: new Date(),
        });

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("error");
        expect(result.error).toContain("already in progress");
    });

    it("pulls remote-only task updates without overwriting them from unchanged local data", async () => {
        const user = await createTestUser("todoist_remote_pull_user", "todoist_remote_pull@example.com");

        const [mappedList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Mapped List", slug: "mapped-list", position: 0 })
            .returning();
        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: mappedList.id,
                title: "Task",
                priority: "none",
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T09:00:00.000Z"),
            })
            .returning();

        await insertTodoistIntegration(user.id);
        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "todoist",
            status: "idle",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
            updatedAt: new Date("2026-02-12T10:00:00.000Z"),
        });
        await db.insert(externalEntityMap).values([
            {
                userId: user.id,
                provider: "todoist",
                entityType: "list",
                localId: mappedList.id,
                externalId: "project_a",
            },
            {
                userId: user.id,
                provider: "todoist",
                entityType: "task",
                localId: localTask.id,
                externalId: "remote_task_1",
            },
        ]);

        const updateTaskMock = mock(async () => undefined);
        serviceState.client = {
            createTask: mock(async () => ({ id: "created_task" })),
            updateTask: updateTaskMock,
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [],
            tasks: [
                makeTask({
                    id: "remote_task_1",
                    content: "Task",
                    projectId: "project_a",
                    priority: 4,
                    updatedAt: "2026-02-12T12:00:00.000Z",
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(updateTaskMock).not.toHaveBeenCalled();

        const [updatedLocalTask] = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.userId, user.id), eq(tasks.id, localTask.id)));
        expect(updatedLocalTask?.priority).toBe("high");
    });

    it("backfills missing local due datetime when Todoist encodes timestamp in due.date", async () => {
        const user = await createTestUser("todoist_due_backfill_user", "todoist_due_backfill@example.com");

        const [mappedList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Mapped List", slug: "mapped-list", position: 0 })
            .returning();
        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: mappedList.id,
                title: "Task",
                dueDate: null,
                dueDatePrecision: null,
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T09:00:00.000Z"),
            })
            .returning();

        await insertTodoistIntegration(user.id);
        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "todoist",
            status: "idle",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
            updatedAt: new Date("2026-02-12T10:00:00.000Z"),
        });
        await db.insert(externalEntityMap).values([
            {
                userId: user.id,
                provider: "todoist",
                entityType: "list",
                localId: mappedList.id,
                externalId: "project_a",
            },
            {
                userId: user.id,
                provider: "todoist",
                entityType: "task",
                localId: localTask.id,
                externalId: "remote_task_due",
            },
        ]);

        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [],
            tasks: [
                makeTask({
                    id: "remote_task_due",
                    content: "Task",
                    projectId: "project_a",
                    due: {
                        date: "2026-02-14T17:45:00.000Z",
                        isRecurring: false,
                        string: "",
                    },
                    updatedAt: "2026-02-12T09:30:00.000Z",
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");

        const [updatedLocalTask] = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.userId, user.id), eq(tasks.id, localTask.id)));
        expect(updatedLocalTask?.dueDate).toEqual(new Date("2026-02-14T17:45:00.000Z"));
        expect(updatedLocalTask?.dueDatePrecision).toBeNull();
    });

    it("moves mapped tasks to the correct Todoist project when local list mapping changes", async () => {
        const user = await createTestUser("todoist_move_project_user", "todoist_move_project@example.com");

        const [listA] = await db
            .insert(lists)
            .values({ userId: user.id, name: "List A", slug: "list-a", position: 0 })
            .returning();
        const [listB] = await db
            .insert(lists)
            .values({ userId: user.id, name: "List B", slug: "list-b", position: 1 })
            .returning();
        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: listB.id,
                title: "Needs move",
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T12:00:00.000Z"),
            })
            .returning();

        await insertTodoistIntegration(user.id);
        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "todoist",
            status: "idle",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
            updatedAt: new Date("2026-02-12T10:00:00.000Z"),
        });
        await db.insert(externalEntityMap).values([
            {
                userId: user.id,
                provider: "todoist",
                entityType: "list",
                localId: listA.id,
                externalId: "project_a",
            },
            {
                userId: user.id,
                provider: "todoist",
                entityType: "list",
                localId: listB.id,
                externalId: "project_b",
            },
            {
                userId: user.id,
                provider: "todoist",
                entityType: "task",
                localId: localTask.id,
                externalId: "remote_task_1",
            },
        ]);

        const moveTaskMock = mock(async () => undefined);
        serviceState.client = {
            createTask: mock(async () => ({ id: "created_task" })),
            updateTask: mock(async () => undefined),
            moveTask: moveTaskMock,
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [
                { id: "project_a", name: "Project A" },
                { id: "project_b", name: "Project B" },
            ],
            labels: [],
            tasks: [
                makeTask({
                    id: "remote_task_1",
                    content: "Needs move",
                    projectId: "project_a",
                    updatedAt: "2026-02-12T09:00:00.000Z",
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(moveTaskMock).toHaveBeenCalledWith("remote_task_1", { projectId: "project_b" });
    });

    it("pushes local subtasks with a parentId payload", async () => {
        const user = await createTestUser("todoist_parent_push_user", "todoist_parent_push@example.com");

        const [listA] = await db
            .insert(lists)
            .values({ userId: user.id, name: "List A", slug: "list-a", position: 0 })
            .returning();
        const [parentTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: listA.id,
                title: "Parent",
                isCompleted: false,
                position: 0,
            })
            .returning();
        await db.insert(tasks).values({
            userId: user.id,
            listId: listA.id,
            title: "Child",
            parentId: parentTask.id,
            isCompleted: false,
            position: 1,
        });

        await insertTodoistIntegration(user.id);
        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list",
            localId: listA.id,
            externalId: "project_a",
        });

        const createTaskMock = mock(async (payload: Record<string, unknown>) => {
            if (payload.parentId) {
                return { id: "remote_child", parentId: payload.parentId };
            }
            return { id: "remote_parent" };
        });
        serviceState.client = {
            createTask: createTaskMock,
            updateTask: mock(async () => undefined),
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: mock(async ({ name, order }: { name: string; order?: number }) => ({
                id: `label_${name.toLowerCase().replace(/\s+/g, "_")}`,
                name,
                order: order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [],
            tasks: [],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(createTaskMock).toHaveBeenCalled();

        const createdPayloads = createTaskMock.mock.calls.map((call) => call[0] as Record<string, unknown>);
        const childPayload = createdPayloads.find((payload) => payload.parentId === "remote_parent");
        expect(childPayload).toBeTruthy();
    });

    it("imports remote deadline, duration, and original creation timestamp", async () => {
        const user = await createTestUser("todoist_field_import_user", "todoist_field_import@example.com");

        const [mappedList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Mapped List", slug: "mapped-list", position: 0 })
            .returning();

        await insertTodoistIntegration(user.id);
        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list",
            localId: mappedList.id,
            externalId: "project_a",
        });

        serviceState.snapshot = {
            projects: [{ id: "project_a", name: "Project A" }],
            labels: [],
            tasks: [
                makeTask({
                    id: "remote_task_1",
                    content: "Imported task",
                    projectId: "project_a",
                    addedAt: "2026-01-20T07:30:00.000Z",
                    due: {
                        date: "2026-02-14T17:45:00.000Z",
                        isRecurring: false,
                        string: "",
                    },
                    deadline: { date: "2026-02-15", lang: "en" },
                    duration: { amount: 2, unit: "day" },
                }),
            ],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");

        const [importedTask] = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.userId, user.id), eq(tasks.title, "Imported task")));
        expect(importedTask).toBeTruthy();
        expect(importedTask?.dueDate).toEqual(new Date("2026-02-14T17:45:00.000Z"));
        expect(importedTask?.dueDatePrecision).toBeNull();
        expect(importedTask?.deadline).toEqual(new Date("2026-02-15T00:00:00.000Z"));
        expect(importedTask?.estimateMinutes).toBe(2880);
        expect(importedTask?.createdAt).toEqual(new Date("2026-01-20T07:30:00.000Z"));
    });

    it("creates missing remote labels for in-scope local task labels", async () => {
        const user = await createTestUser("todoist_label_create_user", "todoist_label_create@example.com");

        const [testList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Test List", slug: "test-list", position: 0 })
            .returning();
        const [localLabel] = await db
            .insert(labels)
            .values({ userId: user.id, name: "urgent", position: 1 })
            .returning();
        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: testList.id,
                title: "Scoped Local Task",
                isCompleted: false,
                position: 0,
            })
            .returning();
        await db.insert(taskLabels).values({
            taskId: localTask.id,
            labelId: localLabel.id,
        });

        await insertTodoistIntegration(user.id);
        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "todoist",
            entityType: "list_label",
            localId: testList.id,
            externalId: "label_test",
        });

        const createLabelMock = mock(async ({ name, order }: { name: string; order?: number }) => ({
            id: `remote_${name}`,
            name,
            order: order ?? 0,
            color: "charcoal",
            isFavorite: false,
        }));
        serviceState.client = {
            createTask: mock(async () => ({ id: "created_remote_task" })),
            updateTask: mock(async () => undefined),
            moveTask: mock(async () => undefined),
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
            createLabel: createLabelMock,
            updateLabel: mock(async (id: string, payload: { name?: string; order?: number }) => ({
                id,
                name: payload.name ?? "updated",
                order: payload.order ?? 0,
                color: "charcoal",
                isFavorite: false,
            })),
        };
        serviceState.snapshot = {
            projects: [],
            labels: [{ id: "label_test", name: "test", order: 1 }],
            tasks: [],
        };

        const result = await syncTodoistForUser(user.id);
        expect(result.status).toBe("ok");
        expect(createLabelMock).toHaveBeenCalled();

        const labelMappings = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "todoist"),
                    eq(externalEntityMap.entityType, "label")
                )
            );
        expect(labelMappings.some((mapping) => mapping.localId === localLabel.id)).toBe(true);
    });
});
