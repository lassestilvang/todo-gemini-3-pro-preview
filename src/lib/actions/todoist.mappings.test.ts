import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { db, externalEntityMap, lists } from "@/db";
import { createTestUser, resetTestDb, setupTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { setTodoistProjectMappings } from "./todoist";

describe("Todoist mapping actions", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("persists only project mappings with a list target", async () => {
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

            expect(rows.length).toBe(1);
            expect(rows[0].externalId).toBe("project_keep");
            expect(rows[0].localId).toBe(localList.id);
        } finally {
            process.env.NODE_ENV = previousNodeEnv;
        }
    });
});
