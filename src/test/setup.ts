import { expect, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Register happy-dom for component testing
GlobalRegistrator.register();

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock next/cache globally
mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));


// Shared DB setup helper
export async function setupTestDb() {
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
            energy_level TEXT,
            context TEXT,
            is_habit INTEGER DEFAULT 0,
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
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS habit_completions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            completed_at INTEGER NOT NULL,
            created_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS task_dependencies(
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            blocker_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            PRIMARY KEY(task_id, blocker_id)
        );
    `);
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS templates(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER DEFAULT(strftime('%s', 'now')),
            updated_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS user_stats(
            id INTEGER PRIMARY KEY DEFAULT 1,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            last_login INTEGER,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0
        );
    `);
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS achievements(
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT NOT NULL,
            condition_type TEXT NOT NULL,
            condition_value INTEGER NOT NULL,
            xp_reward INTEGER NOT NULL
        );
    `);
    await db.run(sql`
        CREATE TABLE IF NOT EXISTS user_achievements(
            achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
            unlocked_at INTEGER DEFAULT(strftime('%s', 'now')),
            PRIMARY KEY(achievement_id)
        );
    `);
}

export async function resetTestDb() {
    // Delete in order respecting foreign key constraints
    await db.run(sql`DELETE FROM user_achievements`);
    await db.run(sql`DELETE FROM achievements`);
    await db.run(sql`DELETE FROM task_logs`);
    await db.run(sql`DELETE FROM reminders`);
    await db.run(sql`DELETE FROM habit_completions`);
    await db.run(sql`DELETE FROM task_dependencies`);
    await db.run(sql`DELETE FROM task_labels`);
    await db.run(sql`DELETE FROM tasks`);
    await db.run(sql`DELETE FROM labels`);
    await db.run(sql`DELETE FROM lists`);
    await db.run(sql`DELETE FROM templates`);
    await db.run(sql`DELETE FROM user_stats`);
}

