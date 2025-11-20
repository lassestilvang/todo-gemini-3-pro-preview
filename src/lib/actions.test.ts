import { describe, expect, it, beforeAll, mock } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { createTask, getTasks, updateTask, deleteTask, getTask, createReminder, getReminders, getTaskLogs } from "./actions";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Mock better-sqlite3 to avoid Bun runtime error
// (This is handled by preload, but we keep the import clean)

describe("Server Actions", () => {
    beforeAll(async () => {
        await setupTestDb();
        await resetTestDb(); // Clean slate for all tests
    });

    it("should create a task", async () => {
        const task = await createTask({
            title: "Test Task",
            description: "This is a test task",
            priority: "high",
        });

        expect(task).toBeDefined();
        expect(task.title).toBe("Test Task");
        expect(task.id).toBeDefined();
    });

    it("should get tasks", async () => {
        // Create a task first
        const task = await createTask({ title: "Get Test Task" });

        const allTasks = await getTasks(undefined, "all");
        expect(allTasks.length).toBeGreaterThan(0);
        const found = allTasks.find((t) => t.id === task.id);
        expect(found).toBeDefined();
    });

    it("should get a single task", async () => {
        const task = await createTask({ title: "Single Task" });
        const fetchedTask = await getTask(task.id);
        expect(fetchedTask).toBeDefined();
        expect(fetchedTask?.id).toBe(task.id);
    });

    it("should update a task", async () => {
        const task = await createTask({ title: "Original Task" });
        await updateTask(task.id, { title: "Updated Task" });
        const updated = await getTask(task.id);
        expect(updated?.title).toBe("Updated Task");
    });

    it("should delete a task", async () => {
        const task = await createTask({ title: "Task to Delete" });
        await deleteTask(task.id);
        const deleted = await getTask(task.id);
        expect(deleted).toBeNull();
    });

    it("should create a task with deadline", async () => {
        const deadline = new Date();
        deadline.setMilliseconds(0);
        const task = await createTask({
            title: "Deadline Task",
            deadline
        });
        expect(task.deadline).toBeDefined();
        expect(task.deadline?.getTime()).toBe(deadline.getTime());
    });

    it("should create and get reminders", async () => {
        const task = await createTask({ title: "Reminder Task" });
        const remindAt = new Date();
        remindAt.setMilliseconds(0);
        await createReminder(task.id, remindAt);
        const reminders = await getReminders(task.id);
        expect(reminders.length).toBe(1);
        expect(reminders[0].remindAt.getTime()).toBe(remindAt.getTime());
    });

    it("should log task creation", async () => {
        const task = await createTask({ title: "Logged Task" });
        const logs = await getTaskLogs(task.id);
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].action).toBe("created");
    });
});
