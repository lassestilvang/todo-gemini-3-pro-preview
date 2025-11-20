import { describe, it, expect, beforeAll, afterEach } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { toggleTaskCompletion, createTask, getTask } from "@/lib/actions";
import { eq } from "drizzle-orm";

describe("Recurring Tasks Logic", () => {
    let taskId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    afterEach(async () => {
        await resetTestDb();
    });

    it("should create a new task when a recurring task is completed", async () => {
        // 1. Create a recurring task
        const task = await createTask({
            title: "Test Recurring Task",
            isRecurring: true,
            recurringRule: "FREQ=DAILY",
            dueDate: new Date(),
        });
        taskId = task.id;

        expect(task.isRecurring).toBe(true);
        expect(task.isCompleted).toBe(false);

        // 2. Complete the task
        await toggleTaskCompletion(taskId, true);

        // 3. Verify original task is completed
        const completedTask = await getTask(taskId);
        expect(completedTask?.isCompleted).toBe(true);

        // 4. Verify a new task was created
        const allTasks = await db.select().from(tasks).where(eq(tasks.title, "Test Recurring Task"));
        expect(allTasks.length).toBe(2);

        const newTask = allTasks.find(t => t.id !== taskId);
        expect(newTask).toBeDefined();
        expect(newTask?.isCompleted).toBe(false);
        expect(newTask?.dueDate).toBeDefined();
        // Check if due date is in the future (tomorrow)
        expect(newTask!.dueDate!.getTime()).toBeGreaterThan(new Date().getTime());
    });
});
