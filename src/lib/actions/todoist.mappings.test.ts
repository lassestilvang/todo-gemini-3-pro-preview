import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db, externalEntityMap, lists } from "@/db";
import { createTestUser, resetTestDb, setupTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createTodoistMappingList, setTodoistLabelMappings, setTodoistProjectMappings } from "./todoist";

describe("Todoist mapping actions", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("persists explicit project mappings including None targets", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_mapping_action_user", "todoist_mapping_action@example.com");
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

            const result = await setTodoistProjectMappings([
                { projectId: "project_keep", listId: localList.id },
                { projectId: "project_skip", listId: null },
            ]);

            expect(result.success).toBe(true);

            const rows = await db
                .select()
                .from(externalEntityMap)
                .where(
                    and(
                        eq(externalEntityMap.userId, user.id),
                        eq(externalEntityMap.provider, "todoist"),
                        eq(externalEntityMap.entityType, "list")
                    )
                );

            expect(rows.length).toBe(2);
            const byExternalId = new Map(rows.map((row) => [row.externalId, row]));

            expect(byExternalId.get("project_keep")?.localId).toBe(localList.id);
            expect(byExternalId.get("project_skip")?.localId).toBeNull();
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });

    it("persists explicit label mappings including None targets", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_label_mapping_action_user", "todoist_label_mapping_action@example.com");
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

            const result = await setTodoistLabelMappings([
                { labelId: "label_keep", listId: localList.id },
                { labelId: "label_skip", listId: null },
            ]);

            expect(result.success).toBe(true);

            const rows = await db
                .select()
                .from(externalEntityMap)
                .where(
                    and(
                        eq(externalEntityMap.userId, user.id),
                        eq(externalEntityMap.provider, "todoist"),
                        eq(externalEntityMap.entityType, "list_label")
                    )
                );

            expect(rows.length).toBe(2);
            const byExternalId = new Map(rows.map((row) => [row.externalId, row]));

            expect(byExternalId.get("label_keep")?.localId).toBe(localList.id);
            expect(byExternalId.get("label_skip")?.localId).toBeNull();
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });

    it("rejects duplicate local list assignment across project mappings", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_project_mapping_unique_user", "todoist_project_mapping_unique@example.com");
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

            const result = await setTodoistProjectMappings([
                { projectId: "project_a", listId: localList.id },
                { projectId: "project_b", listId: localList.id },
            ]);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain("A local list can only be mapped to one Todoist project.");
            }
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });

    it("rejects duplicate local list assignment across label mappings", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_label_mapping_unique_user", "todoist_label_mapping_unique@example.com");
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

            const result = await setTodoistLabelMappings([
                { labelId: "label_a", listId: localList.id },
                { labelId: "label_b", listId: localList.id },
            ]);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain("A local list can only be mapped to one Todoist label.");
            }
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });

    it("creates a local list for Todoist mapping with unique slug and position", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_create_mapping_list_user", "todoist_create_mapping_list@example.com");
            setMockAuthUser({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePictureUrl: null,
            });

            await db.insert(lists).values({
                userId: user.id,
                name: "Test",
                slug: "test",
                position: 5,
            });

            const result = await createTodoistMappingList("Test");
            expect(result.success).toBe(true);
            if (!result.success) {
                return;
            }

            expect(result.list.name).toBe("Test");

            const createdList = await db.query.lists.findFirst({
                where: and(eq(lists.userId, user.id), eq(lists.id, result.list.id)),
            });

            expect(createdList).toBeTruthy();
            expect(createdList?.slug).toBe("test-2");
            expect(createdList?.position).toBe(6);
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });

    it("rejects empty list names when creating Todoist mapping lists", async () => {
        const previousNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";

        try {
            const user = await createTestUser("todoist_create_mapping_list_empty_user", "todoist_create_mapping_list_empty@example.com");
            setMockAuthUser({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePictureUrl: null,
            });

            const result = await createTodoistMappingList("   ");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain("List name is required.");
            }
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });
});
