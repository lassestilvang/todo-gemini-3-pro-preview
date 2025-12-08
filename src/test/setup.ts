import { expect, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { sqliteConnection } from "@/db";

// Register happy-dom for component testing
GlobalRegistrator.register();

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Mock next/cache globally
mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Mock canvas-confetti
mock.module("canvas-confetti", () => ({
    default: () => Promise.resolve(),
}));

/**
 * Sets up the test database with SQLite tables that mirror the PostgreSQL schema.
 * Tests use in-memory SQLite for fast execution while maintaining schema compatibility.
 * 
 * Note: SQLite uses INTEGER for booleans (0/1) and timestamps (Unix epoch seconds),
 * while PostgreSQL uses native BOOLEAN and TIMESTAMP types. The Drizzle ORM
 * handles this abstraction via mode: "timestamp" and mode: "boolean".
 */
export async function setupTestDb() {
    // Lists table
    sqliteConnection.run(`
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

    // Tasks table with all fields matching PostgreSQL schema
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS tasks(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT DEFAULT 'none',
            due_date INTEGER,
            is_completed INTEGER DEFAULT 0,
            completed_at INTEGER,
            is_recurring INTEGER DEFAULT 0,
            recurring_rule TEXT,
            parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
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

    // Create indexes for tasks table
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_list_id_idx ON tasks(list_id);`);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_parent_id_idx ON tasks(parent_id);`);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_is_completed_idx ON tasks(is_completed);`);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);`);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);`);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);`);

    // Labels table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS labels(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#000000',
            icon TEXT
        );
    `);

    // Task labels junction table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS task_labels(
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
            PRIMARY KEY(task_id, label_id)
        );
    `);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS task_labels_label_id_idx ON task_labels(label_id);`);

    // Reminders table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS reminders(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            remind_at INTEGER NOT NULL,
            is_sent INTEGER DEFAULT 0,
            created_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);

    // Task logs table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS task_logs(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            action TEXT NOT NULL,
            details TEXT,
            created_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS task_logs_task_id_idx ON task_logs(task_id);`);

    // Habit completions table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS habit_completions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            completed_at INTEGER NOT NULL,
            created_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);

    // Task dependencies table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS task_dependencies(
            task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            blocker_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
            PRIMARY KEY(task_id, blocker_id)
        );
    `);
    sqliteConnection.run(`CREATE INDEX IF NOT EXISTS task_dependencies_blocker_id_idx ON task_dependencies(blocker_id);`);

    // Templates table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS templates(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER DEFAULT(strftime('%s', 'now')),
            updated_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);

    // User stats table (singleton)
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS user_stats(
            id INTEGER PRIMARY KEY DEFAULT 1,
            xp INTEGER NOT NULL DEFAULT 0,
            level INTEGER NOT NULL DEFAULT 1,
            last_login INTEGER,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0
        );
    `);

    // Achievements table
    sqliteConnection.run(`
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

    // User achievements table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS user_achievements(
            achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
            unlocked_at INTEGER DEFAULT(strftime('%s', 'now')),
            PRIMARY KEY(achievement_id)
        );
    `);

    // View settings table
    sqliteConnection.run(`
        CREATE TABLE IF NOT EXISTS view_settings(
            id TEXT PRIMARY KEY,
            layout TEXT DEFAULT 'list',
            show_completed INTEGER DEFAULT 1,
            group_by TEXT DEFAULT 'none',
            sort_by TEXT DEFAULT 'manual',
            sort_order TEXT DEFAULT 'asc',
            filter_date TEXT DEFAULT 'all',
            filter_priority TEXT,
            filter_label_id INTEGER,
            updated_at INTEGER DEFAULT(strftime('%s', 'now'))
        );
    `);
}

export async function resetTestDb() {
    // Delete in order respecting foreign key constraints
    sqliteConnection.run(`DELETE FROM user_achievements`);
    sqliteConnection.run(`DELETE FROM achievements`);
    sqliteConnection.run(`DELETE FROM task_logs`);
    sqliteConnection.run(`DELETE FROM reminders`);
    sqliteConnection.run(`DELETE FROM habit_completions`);
    sqliteConnection.run(`DELETE FROM task_dependencies`);
    sqliteConnection.run(`DELETE FROM task_labels`);
    sqliteConnection.run(`DELETE FROM tasks`);
    sqliteConnection.run(`DELETE FROM labels`);
    sqliteConnection.run(`DELETE FROM lists`);
    sqliteConnection.run(`DELETE FROM templates`);
    sqliteConnection.run(`DELETE FROM user_stats`);
    sqliteConnection.run(`DELETE FROM view_settings`);
}
