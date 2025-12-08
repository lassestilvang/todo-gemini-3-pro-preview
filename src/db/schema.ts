import { serial, integer, pgTable, text, primaryKey, foreignKey, index, timestamp, boolean } from "drizzle-orm/pg-core";

export const lists = pgTable("lists", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow(),
});

export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    listId: integer("list_id").references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priority: text("priority", { enum: ["none", "low", "medium", "high"] }).default("none"),
    dueDate: timestamp("due_date"),
    isCompleted: boolean("is_completed").default(false),
    completedAt: timestamp("completed_at"),
    isRecurring: boolean("is_recurring").default(false),
    recurringRule: text("recurring_rule"), // RRule string
    parentId: integer("parent_id"), // For subtasks
    estimateMinutes: integer("estimate_minutes"),
    actualMinutes: integer("actual_minutes"),
    energyLevel: text("energy_level", { enum: ["high", "medium", "low"] }),
    context: text("context", { enum: ["computer", "phone", "errands", "meeting", "home", "anywhere"] }),
    isHabit: boolean("is_habit").default(false),
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow(),
    deadline: timestamp("deadline"),
}, (table) => ({
    parentReference: foreignKey({
        columns: [table.parentId],
        foreignColumns: [table.id],
    }).onDelete("cascade"),
    listIdIdx: index("tasks_list_id_idx").on(table.listId),
    parentIdIdx: index("tasks_parent_id_idx").on(table.parentId),
    isCompletedIdx: index("tasks_is_completed_idx").on(table.isCompleted),
    dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
    completedAtIdx: index("tasks_completed_at_idx").on(table.completedAt),
}));

export const labels = pgTable("labels", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
});


export const taskLabels = pgTable("task_labels", {
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

export const reminders = pgTable("reminders", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    remindAt: timestamp("remind_at").notNull(),
    isSent: boolean("is_sent").default(false),
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
});

export const taskLogs = pgTable("task_logs", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
        .references(() => tasks.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // e.g., "created", "updated", "completed"
    details: text("details"), // JSON string or text description of change
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
}, (t) => ({
    taskIdIdx: index("task_logs_task_id_idx").on(t.taskId),
}));

export const habitCompletions = pgTable("habit_completions", {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").notNull(),
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
});

export const taskDependencies = pgTable("task_dependencies", {
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

export const templates = pgTable("templates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    content: text("content").notNull(), // JSON string of task data
    createdAt: timestamp("created_at")
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow(),
});

export const userStats = pgTable("user_stats", {
    id: integer("id").primaryKey().default(1), // Singleton row
    xp: integer("xp").notNull().default(0),
    level: integer("level").notNull().default(1),
    lastLogin: timestamp("last_login"),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
});

export const achievements = pgTable("achievements", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    conditionType: text("condition_type").notNull(), // 'count_total', 'streak', 'time'
    conditionValue: integer("condition_value").notNull(),
    xpReward: integer("xp_reward").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
    achievementId: text("achievement_id")
        .notNull()
        .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at")
        .notNull()
        .defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.achievementId] }),
}));

export const viewSettings = pgTable("view_settings", {
    id: text("id").primaryKey(), // e.g., "today", "inbox", "list-1", "label-2"
    layout: text("layout", { enum: ["list", "board", "calendar"] }).default("list"),
    showCompleted: boolean("show_completed").default(true),
    groupBy: text("group_by", { enum: ["none", "dueDate", "priority", "label"] }).default("none"),
    sortBy: text("sort_by", { enum: ["manual", "dueDate", "priority", "name"] }).default("manual"),
    sortOrder: text("sort_order", { enum: ["asc", "desc"] }).default("asc"),
    filterDate: text("filter_date", { enum: ["all", "hasDate", "noDate"] }).default("all"),
    filterPriority: text("filter_priority"), // null = all, or "high", "medium", "low", "none"
    filterLabelId: integer("filter_label_id"), // null = all
    updatedAt: timestamp("updated_at").defaultNow(),
});
