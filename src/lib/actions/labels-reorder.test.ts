import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { reorderLabels } from "./labels";
import { isSuccess } from "../action-result";
import { db, labels } from "@/db";
import { asc, eq } from "drizzle-orm";

describe("reorderLabels", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        const user = await createTestUser("test_reorder", "reorder@test.com");
        testUserId = user.id;
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null
        });
    });

    it("should reorder labels correctly", async () => {
        // Direct DB insertion to bypass any potential action mocks
        await db.insert(labels).values([
            { id: 100, userId: testUserId, name: "L1", position: 0 },
            { id: 101, userId: testUserId, name: "L2", position: 1 },
            { id: 102, userId: testUserId, name: "L3", position: 2 },
        ]);

        const initial = await db
            .select()
            .from(labels)
            .where(eq(labels.userId, testUserId))
            .orderBy(asc(labels.position), asc(labels.id));
        expect(initial.length).toBe(3);
        const ids = initial.map(l => l.id).sort((a, b) => a - b);
        expect(ids).toEqual([100, 101, 102]);

        // Update positions: L3 (102) -> 0, L1 (100) -> 1, L2 (101) -> 2
        const reorderResult = await reorderLabels(testUserId, [
            { id: 102, position: 0 },
            { id: 100, position: 1 },
            { id: 101, position: 2 },
        ]);

        if (!isSuccess(reorderResult)) {
            throw new Error(`reorderLabels failed: ${JSON.stringify(reorderResult)}`);
        }

        const reorderedLabels = await db
            .select()
            .from(labels)
            .where(eq(labels.userId, testUserId))
            .orderBy(asc(labels.position), asc(labels.id));

        expect(reorderedLabels[0].id).toBe(102);
        expect(reorderedLabels[0].position).toBe(0);
        expect(reorderedLabels[1].id).toBe(100);
        expect(reorderedLabels[1].position).toBe(1);
        expect(reorderedLabels[2].id).toBe(101);
        expect(reorderedLabels[2].position).toBe(2);
    });
});
