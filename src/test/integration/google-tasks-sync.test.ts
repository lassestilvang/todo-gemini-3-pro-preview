import { beforeAll, beforeEach, afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, externalSyncState, lists, tasks } from "@/db";
import { and, eq } from "drizzle-orm";
import type { GoogleTask } from "@/lib/google-tasks/types";
import * as googleTasksService from "@/lib/google-tasks/service";

type Snapshot = {
    tasklists: { id: string; title: string; updated?: string; etag?: string }[];
    tasksByList: Map<string, GoogleTask[]>;
};

type AccessTokenResult = Awaited<ReturnType<typeof googleTasksService.getGoogleTasksAccessToken>>;

const serviceState: { snapshot: Snapshot; client: Record<string, unknown> } = {
    snapshot: { tasklists: [], tasksByList: new Map() },
    client: {},
};

import { syncGoogleTasksForUser } from "@/lib/google-tasks/sync";
import { resolveGoogleTasksConflict } from "@/lib/actions/google-tasks";

describe("Integration: Google Tasks Sync", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        
        // Mock service methods using spyOn
        spyOn(googleTasksService, "createGoogleTasksClient").mockImplementation(() => serviceState.client as unknown as ReturnType<typeof googleTasksService.createGoogleTasksClient>);
        spyOn(googleTasksService, "fetchGoogleTasksSnapshot").mockImplementation(async () => serviceState.snapshot);
        spyOn(googleTasksService, "getGoogleTasksAccessToken").mockImplementation(async (userId: string) => ({
            accessToken: "token",
            integration: { userId } as AccessTokenResult["integration"],
        }));
    });

    afterEach(() => {
        mock.restore();
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

    it("creates conflicts when local and remote changes diverge", async () => {
        const user = await createTestUser("gt_conflict_user", "gt_conflict@example.com");
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null,
        });

        const [localList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Conflict List", slug: "conflict-list", position: 0 })
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
            externalId: "tl_conflict",
        });

        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: localList.id,
                title: "Local Title",
                description: "Local Notes",
                isCompleted: false,
                position: 0,
                updatedAt: new Date("2026-02-12T12:00:00.000Z"),
            })
            .returning();

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "google_tasks",
            entityType: "task",
            localId: localTask.id,
            externalId: "task_conflict",
        });

        await db.insert(externalSyncState).values({
            userId: user.id,
            provider: "google_tasks",
            status: "idle",
            lastSyncedAt: new Date("2026-02-12T10:00:00.000Z"),
        });

        const remoteTask: GoogleTask = {
            id: "task_conflict",
            title: "Remote Title",
            notes: "Remote Notes",
            status: "needsAction",
            updated: "2026-02-12T11:00:00.000Z",
        };

        serviceState.snapshot = {
            tasklists: [{ id: "tl_conflict", title: "Conflict List" }],
            tasksByList: new Map([["tl_conflict", [remoteTask]]]),
        };

        serviceState.client = {
            createTask: mock(async () => remoteTask),
            updateTask: mock(async () => remoteTask),
            deleteTask: mock(async () => undefined),
            createTasklist: mock(async () => ({ id: "tl_conflict", title: "Conflict List" })),
            updateTasklist: mock(async () => ({ id: "tl_conflict", title: "Conflict List" })),
            deleteTasklist: mock(async () => undefined),
            getTask: mock(async () => remoteTask),
        };

        const result = await syncGoogleTasksForUser(user.id);
        expect(result.status).toBe("ok");

        const conflicts = await db
            .select()
            .from(externalSyncConflicts)
            .where(
                and(
                    eq(externalSyncConflicts.userId, user.id),
                    eq(externalSyncConflicts.provider, "google_tasks"),
                    eq(externalSyncConflicts.status, "pending")
                )
            );
        expect(conflicts.length).toBe(1);
        expect(conflicts[0].externalId).toBe("task_conflict");
    });

    it("resolves conflicts using remote payload", async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";
        try {
        const user = await createTestUser("gt_resolve_user", "gt_resolve@example.com");
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null,
        });

        const [localList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Resolve List", slug: "resolve-list", position: 0 })
            .returning();

        const [localTask] = await db
            .insert(tasks)
            .values({
                userId: user.id,
                listId: localList.id,
                title: "Local Task",
                description: "Local Description",
                isCompleted: false,
                position: 0,
            })
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
            externalId: "tl_resolve",
        });

        await db.insert(externalEntityMap).values({
            userId: user.id,
            provider: "google_tasks",
            entityType: "task",
            localId: localTask.id,
            externalId: "task_resolve",
        });

        const conflictPayload = JSON.stringify({ tasklistId: "tl_resolve" });
        const [conflict] = await db
            .insert(externalSyncConflicts)
            .values({
                userId: user.id,
                provider: "google_tasks",
                entityType: "task",
                localId: localTask.id,
                externalId: "task_resolve",
                conflictType: "task_update",
                externalPayload: conflictPayload,
                status: "pending",
            })
            .returning();

        const remoteTask: GoogleTask = {
            id: "task_resolve",
            title: "Remote Winner",
            notes: "Remote Notes",
            status: "completed",
            completed: "2026-02-12T12:00:00.000Z",
            updated: "2026-02-12T12:00:00.000Z",
        };

        serviceState.snapshot = {
            tasklists: [{ id: "tl_resolve", title: "Resolve List" }],
            tasksByList: new Map([["tl_resolve", [remoteTask]]]),
        };

        serviceState.client = {
            getTask: mock(async () => remoteTask),
            updateTask: mock(async () => remoteTask),
        };

        const result = await resolveGoogleTasksConflict(conflict.id, "remote");
        expect(result.success).toBe(true);

        const updatedTasks = await db.select().from(tasks).where(eq(tasks.userId, user.id));
        expect(updatedTasks.length).toBe(1);
        expect(updatedTasks[0].title).toBe("Remote Winner");
        expect(updatedTasks[0].isCompleted).toBe(true);

        const resolved = await db
            .select()
            .from(externalSyncConflicts)
            .where(eq(externalSyncConflicts.id, conflict.id));
        expect(resolved[0].status).toBe("resolved");
        } finally {
            process.env.NODE_ENV = originalEnv;
        }
    });

    it("keeps list mappings stable across sync runs", async () => {
        const user = await createTestUser("gt_mapping_user", "gt_mapping@example.com");
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null,
        });

        const [mappedList] = await db
            .insert(lists)
            .values({ userId: user.id, name: "Mapped List", slug: "mapped-list", position: 0 })
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
            localId: mappedList.id,
            externalId: "tl_mapped",
        });

        const remoteTask: GoogleTask = {
            id: "task_mapped",
            title: "Mapped Task",
            status: "needsAction",
            updated: new Date().toISOString(),
        };

        serviceState.snapshot = {
            tasklists: [{ id: "tl_mapped", title: "Mapped List" }],
            tasksByList: new Map([["tl_mapped", [remoteTask]]]),
        };

        serviceState.client = {
            createTask: mock(async () => remoteTask),
            updateTask: mock(async () => remoteTask),
            deleteTask: mock(async () => undefined),
            createTasklist: mock(async () => ({ id: "tl_mapped", title: "Mapped List" })),
            updateTasklist: mock(async () => ({ id: "tl_mapped", title: "Mapped List" })),
            deleteTasklist: mock(async () => undefined),
        };

        const first = await syncGoogleTasksForUser(user.id);
        expect(first.status).toBe("ok");

        const tasksAfter = await db.select().from(tasks).where(eq(tasks.userId, user.id));
        expect(tasksAfter.length).toBe(1);
        expect(tasksAfter[0].listId).toBe(mappedList.id);

        const mappingRows = await db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "google_tasks"),
                    eq(externalEntityMap.entityType, "list")
                )
            );
        expect(mappingRows.length).toBe(1);
        expect(mappingRows[0].externalId).toBe("tl_mapped");
    });
});
