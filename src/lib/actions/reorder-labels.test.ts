import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createLabel, getLabels, reorderLabels } from "./labels";
import { isSuccess } from "../action-result";

// Note: next/cache is globally mocked in src/test/mocks.ts, so we don't need to mock it here.

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
        // Create 3 labels
        const l1Result = await createLabel({ userId: testUserId, name: "L1" });
        const l2Result = await createLabel({ userId: testUserId, name: "L2" });
        const l3Result = await createLabel({ userId: testUserId, name: "L3" });

        if (!isSuccess(l1Result) || !isSuccess(l2Result) || !isSuccess(l3Result)) {
            console.error("Failed to create labels", l1Result, l2Result, l3Result);
            throw new Error("Failed to create labels");
        }

        const label1 = l1Result.data;
        const label2 = l2Result.data;
        const label3 = l3Result.data;

        // Verify initial state
        const initial = await getLabels(testUserId);
        expect(initial.length).toBe(3);

        // Update positions: L3 -> 0, L1 -> 1, L2 -> 2
        const reorderResult = await reorderLabels(testUserId, [
            { id: label3.id, position: 0 },
            { id: label1.id, position: 1 },
            { id: label2.id, position: 2 },
        ]);

        if (!isSuccess(reorderResult)) {
            console.error("reorderLabels failed", reorderResult);
            throw new Error(`reorderLabels failed: ${JSON.stringify(reorderResult)}`);
        }

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
