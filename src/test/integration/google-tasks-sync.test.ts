import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { db, externalEntityMap, externalIntegrations, lists, tasks } from "@/db";
import { and, eq } from "drizzle-orm";
import type { GoogleTask } from "@/lib/google-tasks/types";

type Snapshot = {
    tasklists: { id: string; title: string; updated?: string; etag?: string }[];
    tasksByList: Map<string, GoogleTask[]>;
};

const serviceState: { snapshot: Snapshot; client: Record<string, unknown> } = {
    snapshot: { tasklists: [], tasksByList: new Map() },
    client: {},
};

mock.module("@/lib/google-tasks/service", () => ({
    createGoogleTasksClient: () => serviceState.client,
    fetchGoogleTasksSnapshot: async () => serviceState.snapshot,
    getGoogleTasksAccessToken: async (userId: string) => ({
        accessToken: "token",
        integration: { userId },
    }),
}));

import { syncGoogleTasksForUser } from "@/lib/google-tasks/sync";

describe("Integration: Google Tasks Sync", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("pulls remote tasks into local database", async () => {
        const user = await createTestUser("gt_pull_user", "gt_pull@example.com");
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null,
        });

        const [localList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Remote List", slug: "remote-list", position: 0 })
            .returning();

        await db.insert(externalIntegrations).values({
            userId: user.id,
            provider: "google_tasks",
            accessTokenEncrypted: "token",
            accessTokenIv: "iv",
            accessTokenTag: "tag",
            accessTokenKeyId: "default",
        });

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "google_tasks",
            entityType: "list",
            localId: localList.id,
            externalId: "tl_1",
        });

        const remoteTask: GoogleTask = {
            id: "task_1",
            title: "Remote Task",
            status: "needsAction",
            updated: new Date().toISOString(),
        };

        serviceState.snapshot = {
            tasklists: [{ id: "tl_1", title: "Remote List" }],
            tasksByList: new Map([["tl_1", [remoteTask]]]),
        };

        serviceState.client = {
            createTask: mock(async () => remoteTask),
            updateTask: mock(async () => remoteTask),
            deleteTask: mock(async () => undefined),
            createTasklist: mock(async () => ({ id: "tl_1", title: "Remote List" })),
            updateTasklist: mock(async () => ({ id: "tl_1", title: "Remote List" })),
            deleteTasklist: mock(async () => undefined),
        };

        const result = await syncGoogleTasksForUser(user.id);
        expect(result.status).toBe("ok");

        const localTasks = await db.select().from(tasks).where(eq(tasks.userId, user.id));
        expect(localTasks.length).toBe(1);
        expect(localTasks[0].title).toBe("Remote Task");

        const mappings = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "google_tasks"),
                    eq(externalEntityMap.entityType, "task")
                )
            );
        expect(mappings.length).toBe(1);
        expect(mappings[0].externalId).toBe("task_1");
    });

    it("pushes local tasks to Google Tasks", async () => {
        const user = await createTestUser("gt_push_user", "gt_push@example.com");
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null,
        });

        const [localList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Local List", slug: "local-list", position: 0 })
            .returning();

        await db.insert(externalIntegrations).values({
            userId: user.id,
            provider: "google_tasks",
            accessTokenEncrypted: "token",
            accessTokenIv: "iv",
            accessTokenTag: "tag",
            accessTokenKeyId: "default",
        });

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "google_tasks",
            entityType: "list",
            localId: localList.id,
            externalId: "tl_local",
        });

        await db.insert(tasks).values({
            userId: user.id,
            listId: localList.id,
            title: "Local Task",
            description: null,
            isCompleted: false,
            position: 0,
        });

        const createdRemote: GoogleTask = {
            id: "remote_created",
            title: "Local Task",
            status: "needsAction",
            updated: new Date().toISOString(),
        };

        const createTaskMock = mock(async () => createdRemote);

        serviceState.snapshot = {
            tasklists: [{ id: "tl_local", title: "Local List" }],
            tasksByList: new Map([["tl_local", []]]),
        };

        serviceState.client = {
            createTask: createTaskMock,
            updateTask: mock(async () => createdRemote),
            deleteTask: mock(async () => undefined),
            createTasklist: mock(async () => ({ id: "tl_local", title: "Local List" })),
            updateTasklist: mock(async () => ({ id: "tl_local", title: "Local List" })),
            deleteTasklist: mock(async () => undefined),
        };

        const result = await syncGoogleTasksForUser(user.id);
        expect(result.status).toBe("ok");
        expect(createTaskMock).toHaveBeenCalled();

        const mappings = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "google_tasks"),
                    eq(externalEntityMap.entityType, "task")
                )
            );
        expect(mappings.length).toBe(1);
        expect(mappings[0].externalId).toBe("remote_created");
    });
});
