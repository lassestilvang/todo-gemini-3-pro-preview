import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createList, deleteList } from "@/lib/actions/lists";
import { createTask, toggleTaskCompletion, getTasks, deleteTask } from "@/lib/actions/tasks";
import { isSuccess } from "@/lib/action-result";

describe("Integration: Task Flow", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
        // await resetTestDb();
    });

    // Ensure database is set up and clean before each test
    beforeEach(async () => {
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
        const task = await createTask({
            userId: testUserId,
            title: `Integration Task ${timestamp}`,
            listId: list.id,
            priority: "high"
        });

        expect(task).toBeDefined();
        expect(task.id).toBeGreaterThan(0);
        expect(task.listId).toBe(list.id);
        expect(task.isCompleted).toBe(false);
        expect(task.priority).toBe("high");

        // 3. Verify task is in the list
        const tasks = await getTasks(testUserId, list.id);
        expect(tasks.length).toBeGreaterThanOrEqual(1);

        const createdTask = tasks.find(t => t.id === task.id);
        expect(createdTask).toBeDefined();
        expect(createdTask?.title).toBe(`Integration Task ${timestamp}`);

        // 4. Complete the task
        await toggleTaskCompletion(task.id, testUserId, true);

        // 5. Verify task is completed
        const completedTasks = await getTasks(testUserId, list.id);
        const completedTask = completedTasks.find(t => t.id === task.id);

        expect(completedTask).toBeDefined();
        expect(completedTask?.isCompleted).toBe(true);

        // Clean up
        await deleteTask(task.id, testUserId);
        await deleteList(list.id, testUserId);
    });
});
