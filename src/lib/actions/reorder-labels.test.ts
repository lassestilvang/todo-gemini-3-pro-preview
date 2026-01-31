import { describe, expect, it, beforeAll, beforeEach, mock } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createLabel, getLabels, reorderLabels } from "./labels";

// Minimal mock to ensure we don't crash
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
        const label1 = (await createLabel({ userId: testUserId, name: "L1" })).data!;
        const label2 = (await createLabel({ userId: testUserId, name: "L2" })).data!;
        const label3 = (await createLabel({ userId: testUserId, name: "L3" })).data!;

        // Initial order checks
        const initial = await getLabels(testUserId);
        const sortedInitial = initial.sort((a, b) => a.id - b.id);
        expect(sortedInitial[0].id).toBe(label1.id);
        expect(sortedInitial[1].id).toBe(label2.id);
        expect(sortedInitial[2].id).toBe(label3.id);

        // Update positions: L3 -> 0, L1 -> 1, L2 -> 2
        await reorderLabels(testUserId, [
            { id: label3.id, position: 0 },
            { id: label1.id, position: 1 },
            { id: label2.id, position: 2 },
        ]);

        const labels = await getLabels(testUserId);
        // getLabels sorts by position

        expect(labels[0].id).toBe(label3.id);
        expect(labels[0].position).toBe(0);
        expect(labels[1].id).toBe(label1.id);
        expect(labels[1].position).toBe(1);
        expect(labels[2].id).toBe(label2.id);
        expect(labels[2].position).toBe(2);
    });
});
