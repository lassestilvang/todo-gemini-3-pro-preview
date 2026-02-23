import { describe, expect, it, beforeAll, beforeEach, mock } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { reorderTasks, createTask } from "./tasks/mutations";
import { isSuccess } from "../action-result";
import { db, tasks } from "@/db";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

mock.module("./smart-tags", () => ({
    suggestMetadata: mock(() => Promise.resolve({ listId: null, labelIds: [] }))
}));

const unwrap = <T>(result: { success: boolean; data?: T; error?: { message?: string } }) => {
    if (!result.success) {
        throw new Error(result.error?.message ?? "Action failed");
    }
    return result.data as T;
};

describe("reorderTasks", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;
        await createTestUser(testUserId, `${testUserId}@example.com`);
        setMockAuthUser({ id: testUserId, email: `${testUserId}@example.com` });
    });

    it("should reorder tasks successfully within limit", async () => {
        const task1 = unwrap(await createTask({ userId: testUserId, title: "Task 1" }));
        const task2 = unwrap(await createTask({ userId: testUserId, title: "Task 2" }));

        const result = await reorderTasks(testUserId, [
            { id: task1.id, position: 100 },
            { id: task2.id, position: 200 }
        ]);

        expect(isSuccess(result)).toBe(true);
    });

    it("should fail when items exceed limit", async () => {
        // Generate 1001 items
        const items = Array.from({ length: 1001 }, (_, i) => ({
            id: i,
            position: i
        }));

        const result = await reorderTasks(testUserId, items);

        expect(isSuccess(result)).toBe(false);
        if (!isSuccess(result)) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
            expect(result.error.message).toContain("Limit is 1000");
        }
    });
});
