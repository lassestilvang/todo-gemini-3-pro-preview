import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createList, deleteList } from "@/lib/actions/lists";
import { createTask, toggleTaskCompletion, getTasks, deleteTask } from "@/lib/actions/tasks";
import { isSuccess } from "@/lib/action-result";

describe("Integration: Task Flow", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    // Ensure database is set up and clean before each test
    beforeEach(async () => {
        await resetTestDb();
        // Use unique ID per test for isolation
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;

        await createTestUser(testUserId, `${testUserId}@integration.com`);
        setMockAuthUser({ id: testUserId, email: `${testUserId}@integration.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
    });

    it("should create a list, add a task, and complete it", async () => {
        // Use timestamp to ensure unique slugs
        const timestamp = Date.now();

        // 1. Create a list
        const listResult = await createList({
            userId: testUserId,
            name: `Integration List ${timestamp}`,
            color: "#ff0000",
            icon: "List",
            slug: `integration-list-${timestamp}`
        });

        expect(isSuccess(listResult)).toBe(true);
        if (!isSuccess(listResult)) return;
        const list = listResult.data;
        expect(list).toBeDefined();
        expect(list.id).toBeGreaterThan(0);
        expect(list.name).toBe(`Integration List ${timestamp}`);

        // 2. Add a task to the list
        const taskResult = await createTask({
            userId: testUserId,
            title: `Integration Task ${timestamp}`,
            listId: list.id,
            priority: "high"
        });

        expect(isSuccess(taskResult)).toBe(true);
        if (!isSuccess(taskResult)) return;
        const task = taskResult.data;
        expect(task.id).toBeGreaterThan(0);
        expect(task.listId).toBe(list.id);
        expect(task.isCompleted).toBe(false);
        expect(task.priority).toBe("high");

        // 3. Verify task is in the list
        const tasksResult = await getTasks(testUserId, list.id);
        expect(isSuccess(tasksResult)).toBe(true);
        if (!isSuccess(tasksResult)) return;
        const tasks = tasksResult.data;
        expect(tasks.length).toBeGreaterThanOrEqual(1);

        const createdTask = tasks.find(t => t.id === task.id);
        expect(createdTask).toBeDefined();
        expect(createdTask?.title).toBe(`Integration Task ${timestamp}`);

        // 4. Complete the task
        expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);

        // 5. Verify task is completed
        const completedTasksResult = await getTasks(testUserId, list.id);
        expect(isSuccess(completedTasksResult)).toBe(true);
        if (!isSuccess(completedTasksResult)) return;
        const completedTask = completedTasksResult.data.find(t => t.id === task.id);

        expect(completedTask).toBeDefined();
        expect(completedTask?.isCompleted).toBe(true);

        // Clean up
        expect(isSuccess(await deleteTask(task.id, testUserId))).toBe(true);
        await deleteList(list.id, testUserId);
    });
});
