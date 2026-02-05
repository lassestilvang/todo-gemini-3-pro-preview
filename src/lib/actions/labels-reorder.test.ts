import { describe, expect, it, beforeAll, beforeEach, mock } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getLabels, reorderLabels } from "./labels";
import { isSuccess } from "../action-result";
import { sqliteConnection } from "@/db";

// Explicitly mock next/cache to match other test files and ensure isolation
mock.module("next/cache", () => ({
    revalidatePath: () => { },
    revalidateTag: () => { },
    unstable_cache: (fn: any) => fn,
    cache: (fn: any) => fn,
}));

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
        sqliteConnection.run("INSERT INTO labels (id, user_id, name, position) VALUES (100, ?, 'L1', 0)", [testUserId]);
        sqliteConnection.run("INSERT INTO labels (id, user_id, name, position) VALUES (101, ?, 'L2', 0)", [testUserId]);
        sqliteConnection.run("INSERT INTO labels (id, user_id, name, position) VALUES (102, ?, 'L3', 0)", [testUserId]);

        // Verify initial state via getLabels (which queries DB)
        const initial = await getLabels(testUserId);
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

        const labels = await getLabels(testUserId);
        // getLabels sorts by position (asc) and then id (asc)

        expect(labels[0].id).toBe(102);
        expect(labels[0].position).toBe(0);
        expect(labels[1].id).toBe(100);
        expect(labels[1].position).toBe(1);
        expect(labels[2].id).toBe(101);
        expect(labels[2].position).toBe(2);
    });
});
