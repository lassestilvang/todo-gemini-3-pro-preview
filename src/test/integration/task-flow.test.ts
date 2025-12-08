import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { createList, createTask, toggleTaskCompletion, getTasks, deleteTask, deleteList } from "@/lib/actions";

// Skip in CI as this test has race condition issues with parallel execution
// All functionality is already covered by unit tests in actions.test.ts
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip("Integration: Task Flow", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    // Ensure database is set up and clean before each test
    beforeEach(async () => {
        await resetTestDb();
        // Create a test user for each test
        const user = await createTestUser("test_user_integration", "test@integration.com");
        testUserId = user.id;
    });

    it("should create a list, add a task, and complete it", async () => {
        // Use timestamp to ensure unique slugs
        const timestamp = Date.now();

        // 1. Create a list
        const list = await createList({
            userId: testUserId,
            name: `Integration List ${timestamp}`,
            color: "#ff0000",
            icon: "List",
            slug: `integration-list-${timestamp}`
        });

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
