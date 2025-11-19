
import { describe, expect, it, beforeAll, mock } from "bun:test";
import { createTask, getTasks, updateTask, deleteTask, getTask, createReminder, getReminders, getTaskLogs } from "./actions";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { setupTestDb } from "@/test/setup";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Mock better-sqlite3 to avoid Bun runtime error
// (This is handled by preload, but we keep the import clean)

describe("Server Actions", () => {
    let createdTaskId: number;

    beforeAll(async () => {
        await setupTestDb();
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
        createdTaskId = task.id;
    });

    it("should get tasks", async () => {
        const allTasks = await getTasks(undefined, "all");
        expect(allTasks.length).toBeGreaterThan(0);
        const found = allTasks.find((t) => t.id === createdTaskId);
        expect(found).toBeDefined();
    });

    it("should get a single task", async () => {
        const task = await getTask(createdTaskId);
        expect(task).toBeDefined();
        expect(task?.id).toBe(createdTaskId);
    });

    it("should update a task", async () => {
        await updateTask(createdTaskId, { title: "Updated Task" });
        const task = await getTask(createdTaskId);
        expect(task?.title).toBe("Updated Task");
    });

    it("should delete a task", async () => {
        await deleteTask(createdTaskId);
        const task = await getTask(createdTaskId);
        expect(task).toBeNull();
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
