
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { toggleTaskCompletion, createTask, getTask } from "@/lib/actions";
import { eq, sql } from "drizzle-orm";

describe("Recurring Tasks Logic", () => {
    let taskId: number;

    beforeAll(async () => {
        // Create tables
        await db.run(sql`
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
        await db.run(sql`
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
    updated_at INTEGER DEFAULT(strftime('%s', 'now')),
    deadline INTEGER
);
`);
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS labels(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#000000',
    icon TEXT
);
`);
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS task_labels(
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY(task_id, label_id)
);
`);
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS task_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    created_at INTEGER DEFAULT(strftime('%s', 'now'))
);
`);
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS reminders(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at INTEGER NOT NULL,
    is_sent INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT(strftime('%s', 'now'))
);
`);


        // Clean up any existing test tasks
        await db.delete(tasks).where(eq(tasks.title, "Test Recurring Task"));
    });

    afterAll(async () => {
        if (taskId) {
            await db.delete(tasks).where(eq(tasks.id, taskId));
            // Also delete the generated next task
            await db.delete(tasks).where(eq(tasks.title, "Test Recurring Task"));
        }
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
