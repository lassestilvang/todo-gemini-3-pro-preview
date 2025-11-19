import { describe, it, expect, beforeAll } from "bun:test";
import { createList, createTask, toggleTaskCompletion, getTasks } from "@/lib/actions";
import { setupTestDb } from "@/test/setup";

describe("Integration: Task Flow", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    it("should create a list, add a task, and complete it", async () => {
        // 1. Create a list
        const list = await createList({
            name: "Integration List",
            color: "#ff0000",
            icon: "List",
            slug: "integration-list"
        });
        expect(list).toBeDefined();
        expect(list.id).toBeDefined();

        // 2. Add a task to the list
        const task = await createTask({
            title: "Integration Task",
            listId: list.id,
            priority: "high"
        });
        expect(task).toBeDefined();
        expect(task.listId).toBe(list.id);
        expect(task.isCompleted).toBe(false);

        // 3. Verify task is in the list
        const tasks = await getTasks(list.id);
        expect(tasks.length).toBe(1);
        expect(tasks[0].id).toBe(task.id);

        // 4. Complete the task
        await toggleTaskCompletion(task.id, true);

        // 5. Verify task is completed
        const completedTasks = await getTasks(list.id);
        expect(completedTasks[0].isCompleted).toBe(true);
    });
});
