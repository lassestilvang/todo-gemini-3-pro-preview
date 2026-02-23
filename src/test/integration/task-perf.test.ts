import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { runInAuthContext } from "@/test/mocks";
import { createTask, getTasks } from "@/lib/actions/tasks";
import { createLabel } from "@/lib/actions/labels";
import { isSuccess } from "@/lib/action-result";

describe("Integration: Task Performance Optimization", () => {
    let testUser: any;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        const randomId = Math.random().toString(36).substring(7);
        const testUserId = `user_perf_${randomId}`;

        testUser = await createTestUser(testUserId, `${testUserId}@perf.com`);
    });

    it("should correctly fetch tasks and labels after optimization", async () => {
        await runInAuthContext(testUser, async () => {
            const testUserId = testUser.id;
            // Create 3 labels
            const labels = await Promise.all([
                createLabel({ userId: testUserId, name: "Label 1", color: "#ff0000", icon: "Tag" }),
                createLabel({ userId: testUserId, name: "Label 2", color: "#00ff00", icon: "Tag" }),
                createLabel({ userId: testUserId, name: "Label 3", color: "#0000ff", icon: "Tag" })
            ]);

            const labelIds = labels.map(l => l.data!.id);

            // Create 5 tasks with various labels
            await createTask({ userId: testUserId, title: "Task 1", labelIds: [labelIds[0]] });
            await createTask({ userId: testUserId, title: "Task 2", labelIds: [labelIds[1], labelIds[2]] });
            await createTask({ userId: testUserId, title: "Task 3", labelIds: [] });
            await createTask({ userId: testUserId, title: "Task 4", labelIds: [labelIds[0], labelIds[1], labelIds[2]] });

            // Fetch tasks
            const tasksResult = await getTasks(testUserId);
            expect(isSuccess(tasksResult)).toBe(true);
            if (!isSuccess(tasksResult)) return;

            const tasks = tasksResult.data;
            expect(tasks.length).toBe(4);

            // Verify Label 1 assignment
            const task1 = tasks.find(t => t.title === "Task 1");
            expect(task1).toBeDefined();
            expect(task1?.labels.length).toBe(1);
            expect(task1?.labels[0].id).toBe(labelIds[0]);

            // Verify Task 2
            const task2 = tasks.find(t => t.title === "Task 2");
            expect(task2).toBeDefined();
            expect(task2?.labels.length).toBe(2);
            const task2LabelIds = task2?.labels.map(l => l.id).sort((a, b) => a - b);
            const expectedTask2LabelIds = [labelIds[1], labelIds[2]].sort((a, b) => a - b);
            expect(task2LabelIds).toEqual(expectedTask2LabelIds);

            // Verify Task 3 (no labels)
            const task3 = tasks.find(t => t.title === "Task 3");
            expect(task3).toBeDefined();
            expect(task3?.labels.length).toBe(0);
        });
    });

    it("should handle empty task list correctly", async () => {
        await runInAuthContext(testUser, async () => {
            const testUserId = testUser.id;
            // Just create labels but no tasks
            await createLabel({ userId: testUserId, name: "Label 1", color: "#ff0000", icon: "Tag" });

            const tasksResult = await getTasks(testUserId);
            expect(isSuccess(tasksResult)).toBe(true);
            if (!isSuccess(tasksResult)) return;
            expect(tasksResult.data.length).toBe(0);
        });
    });
});
