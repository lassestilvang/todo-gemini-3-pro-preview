import { describe, expect, it, beforeAll, afterAll, mock } from "bun:test";
import { createTask, getTasks, updateTask, deleteTask, getTask } from "./actions";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Note: These tests run against the actual local DB or I should mock it.
// For simplicity in this environment, I'll assume we can run against the dev DB but clean up,
// or better, use a separate test DB.
// Since I can't easily swap the DB instance in the imported module without dependency injection,
// I will write integration tests that create data and clean it up.

describe("Server Actions", () => {
    let createdTaskId: number;

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
});
