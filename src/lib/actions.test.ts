
import { describe, expect, it, beforeAll, mock } from "bun:test";
import { createTask, getTasks, updateTask, deleteTask, getTask } from "./actions";
import { db } from "@/db";
import { sql } from "drizzle-orm";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Mock better-sqlite3 to avoid Bun runtime error
// (This is handled by preload, but we keep the import clean)

describe("Server Actions", () => {
    let createdTaskId: number;

    beforeAll(async () => {
        // Create tables
        db.run(sql`
            CREATE TABLE IF NOT EXISTS lists(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#000000',
    icon TEXT,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER DEFAULT(strftime('%s', 'now')),
    updated_at INTEGER DEFAULT(strftime('%s', 'now'))
);
`);
        db.run(sql`
            CREATE TABLE IF NOT EXISTS tasks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER REFERENCES lists(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'none',
    due_date INTEGER,
    is_completed INTEGER DEFAULT 0,
    completed_at INTEGER,
    is_recurring INTEGER DEFAULT 0,
    recurring_rule TEXT,
    parent_id INTEGER REFERENCES tasks(id),
    estimate_minutes INTEGER,
    actual_minutes INTEGER,
    created_at INTEGER DEFAULT(strftime('%s', 'now')),
    updated_at INTEGER DEFAULT(strftime('%s', 'now'))
);
`);
        db.run(sql`
            CREATE TABLE IF NOT EXISTS labels(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#000000'
);
`);
        db.run(sql`
            CREATE TABLE IF NOT EXISTS task_labels(
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY(task_id, label_id)
);
`);
        db.run(sql`
            CREATE TABLE IF NOT EXISTS task_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    created_at INTEGER DEFAULT(strftime('%s', 'now'))
);
`);
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
});
