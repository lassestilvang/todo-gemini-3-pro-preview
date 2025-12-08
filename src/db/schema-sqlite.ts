/**
 * SQLite-compatible schema for testing.
 * This mirrors the PostgreSQL schema but uses SQLite-compatible types and defaults.
 * Used only in test environment to maintain fast in-memory test execution.
 * 
 * Key differences from PostgreSQL schema:
 * - Uses integer with mode: "timestamp" for Date fields (stores as Unix epoch)
 * - Uses integer with mode: "boolean" for boolean fields (stores as 0/1)
 * - Uses strftime for default timestamps instead of NOW()
 */
import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table - stores WorkOS user data
export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // WorkOS user ID
    email: text("email").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

export const lists = sqliteTable("lists", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
    slug: text("slug").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("lists_user_id_idx").on(table.userId),
}));

export const tasks = sqliteTable("tasks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    listId: integer("list_id").references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority", { enum: ["none", "low", "medium", "high"] }).default("none"),
    dueDate: integer("due_date", { mode: "timestamp" }),
    isCompleted: integer("is_completed", { mode: "boolean" }).default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
    recurringRule: text("recurring_rule"),
    parentId: integer("parent_id"),
    estimateMinutes: integer("estimate_minutes"),
    actualMinutes: integer("actual_minutes"),
    energyLevel: text("energy_level", { enum: ["high", "medium", "low"] }),
    context: text("context", { enum: ["computer", "phone", "errands", "meeting", "home", "anywhere"] }),
    isHabit: integer("is_habit", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    deadline: integer("deadline", { mode: "timestamp" }),
}, (table) => ({
    userIdIdx: index("tasks_user_id_idx").on(table.userId),
    listIdIdx: index("tasks_list_id_idx").on(table.listId),
    parentIdIdx: index("tasks_parent_id_idx").on(table.parentId),
    isCompletedIdx: index("tasks_is_completed_idx").on(table.isCompleted),
    dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
    completedAtIdx: index("tasks_completed_at_idx").on(table.completedAt),
}));

export const labels = sqliteTable("labels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
}, (table) => ({
    userIdIdx: index("labels_user_id_idx").on(table.userId),
}));

export const taskLabels = sqliteTable("task_labels", {
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
        .notNull()
        .references(() => labels.id, { onDelete: "cascade" }),
}, (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.labelId] }),
    labelIdIdx: index("task_labels_label_id_idx").on(t.labelId),
}));

export const reminders = sqliteTable("reminders", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    remindAt: integer("remind_at", { mode: "timestamp" }).notNull(),
    isSent: integer("is_sent", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

export const taskLogs = sqliteTable("task_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .references(() => users.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
        .references(() => tasks.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    userIdIdx: index("task_logs_user_id_idx").on(t.userId),
    taskIdIdx: index("task_logs_task_id_idx").on(t.taskId),
}));

export const habitCompletions = sqliteTable("habit_completions", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

export const taskDependencies = sqliteTable("task_dependencies", {
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    blockerId: integer("blocker_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
}, (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.blockerId] }),
    blockerIdIdx: index("task_dependencies_blocker_id_idx").on(t.blockerId),
}));

export const templates = sqliteTable("templates", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("templates_user_id_idx").on(table.userId),
}));

// User stats - now per-user instead of singleton
export const userStats = sqliteTable("user_stats", {
    userId: text("user_id")
        .primaryKey()
        .references(() => users.id, { onDelete: "cascade" }),
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    lastLogin: integer("last_login", { mode: "timestamp" }),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
});

// Achievements are global (not per-user)
export const achievements = sqliteTable("achievements", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    conditionType: text("condition_type").notNull(),
    conditionValue: integer("condition_value").notNull(),
    xpReward: integer("xp_reward").notNull(),
});

// User achievements - now includes userId in primary key
export const userAchievements = sqliteTable("user_achievements", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id")
        .notNull()
        .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.achievementId] }),
}));

// View settings - now includes userId in primary key
export const viewSettings = sqliteTable("view_settings", {
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    viewId: text("view_id").notNull(), // e.g., "today", "inbox", "list-1", "label-2"
    layout: text("layout", { enum: ["list", "board", "calendar"] }).default("list"),
    showCompleted: integer("show_completed", { mode: "boolean" }).default(true),
    groupBy: text("group_by", { enum: ["none", "dueDate", "priority", "label"] }).default("none"),
    sortBy: text("sort_by", { enum: ["manual", "dueDate", "priority", "name"] }).default("manual"),
    sortOrder: text("sort_order", { enum: ["asc", "desc"] }).default("asc"),
    filterDate: text("filter_date", { enum: ["all", "hasDate", "noDate"] }).default("all"),
    filterPriority: text("filter_priority"),
    filterLabelId: integer("filter_label_id"),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.viewId] }),
}));
