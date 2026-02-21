import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { and, eq } from "drizzle-orm";
import type { Task as TodoistTask } from "@doist/todoist-api-typescript";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, externalSyncState, lists, tasks } from "@/db";
import { encryptToken, resetTodoistKeyRingForTests } from "@/lib/todoist/crypto";

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
        closeTask: ReturnType<typeof mock>;
        reopenTask: ReturnType<typeof mock>;
        deleteTask: ReturnType<typeof mock>;
    };
} = {
    snapshot: { projects: [], labels: [], tasks: [] },
    client: {
        createTask: mock(async () => ({ id: "created_task" })),
        updateTask: mock(async () => undefined),
        closeTask: mock(async () => undefined),
        reopenTask: mock(async () => undefined),
        deleteTask: mock(async () => undefined),
    },
};

mock.module("@/lib/todoist/service", () => ({
    createTodoistClient: () => serviceState.client,
    fetchTodoistSnapshot: async () => serviceState.snapshot,
}));

import { syncTodoistForUser } from "@/lib/todoist/sync";

function makeTask(partial: { id: string; content: string; projectId: string } & Partial<TodoistTask>): TodoistTask {
    return {
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
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
        };
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
                    labels: ["label_test"],
                }),
                makeTask({
                    id: "task_unscoped",
                    content: "Unmapped Task",
                    projectId: "project_b",
                    labels: ["label_other"],
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
            closeTask: mock(async () => undefined),
            reopenTask: mock(async () => undefined),
            deleteTask: mock(async () => undefined),
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
});
