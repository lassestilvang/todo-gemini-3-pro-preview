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
import { sqliteTable, text, integer, primaryKey, index, uniqueIndex, unique, foreignKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users table - stores WorkOS user data
export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // WorkOS user ID
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    avatarUrl: text("avatar_url"),
    isInitialized: integer("is_initialized", { mode: "boolean" }).notNull().default(false),
    use24HourClock: integer("use_24h_clock", { mode: "boolean" }),
    weekStartsOnMonday: integer("week_starts_on_monday", { mode: "boolean" }),
    calendarUseNativeTooltipsOnDenseDays: integer("calendar_use_native_tooltips_on_dense_days", { mode: "boolean" }),
    calendarDenseTooltipThreshold: integer("calendar_dense_tooltip_threshold"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
}));

export const lists = sqliteTable("lists", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
    slug: text("slug").notNull(),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("lists_user_id_idx").on(table.userId),
    userSlugUnique: uniqueIndex("lists_user_slug_unique").on(table.userId, table.slug),
    // Unique constraint on (id, userId) to support composite FK from tasks
    idUserUnique: unique("lists_id_user_id_unique").on(table.id, table.userId),
}));

export const tasks = sqliteTable("tasks", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    listId: integer("list_id").references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    icon: text("icon"),
    priority: text("priority", { enum: ["none", "low", "medium", "high"] }).default("none"),
    dueDate: integer("due_date", { mode: "timestamp" }),
    dueDatePrecision: text("due_date_precision", { enum: ["day", "week", "month", "year"] }),
    isCompleted: integer("is_completed", { mode: "boolean" }).default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
    recurringRule: text("recurring_rule"),
    parentId: integer("parent_id"),
    estimateMinutes: integer("estimate_minutes"),
    position: integer("position").default(0).notNull(),
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
    // Composite FK ensures task's list belongs to the same user
    listUserReference: foreignKey({
        columns: [table.listId, table.userId],
        foreignColumns: [lists.id, lists.userId],
    }).onDelete("cascade"),
    userIdIdx: index("tasks_user_id_idx").on(table.userId),
    listIdIdx: index("tasks_list_id_idx").on(table.listId),
    parentIdIdx: index("tasks_parent_id_idx").on(table.parentId),
    isCompletedIdx: index("tasks_is_completed_idx").on(table.isCompleted),
    dueDateIdx: index("tasks_due_date_idx").on(table.dueDate),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
    completedAtIdx: index("tasks_completed_at_idx").on(table.completedAt),
    // Composite index for gamification stats (daily completed count)
    gamificationStatsIdx: index("tasks_gamification_stats_idx").on(
        table.userId,
        table.isCompleted,
        table.completedAt
    ),
    // Composite index for main list sorting/filtering
    listViewIdx: index("tasks_list_view_idx").on(
        table.userId,
        table.listId,
        table.isCompleted,
        table.position
    ),
    // Composite index for "All Tasks" view (where listId is null/ignored)
    allViewIdx: index("tasks_all_view_idx").on(
        table.userId,
        table.isCompleted,
        table.position
    ),
    titleIdx: index("tasks_title_idx").on(table.title),
    descriptionIdx: index("tasks_description_idx").on(table.description),
}));

export const labels = sqliteTable("labels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").default("#000000"),
    icon: text("icon"),
    description: text("description"),
    position: integer("position").default(0).notNull(),
}, (table) => ({
    userIdIdx: index("labels_user_id_idx").on(table.userId),
}));

export const externalIntegrations = sqliteTable("external_integrations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["todoist", "google_tasks"] }).notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    accessTokenIv: text("access_token_iv").notNull(),
    accessTokenTag: text("access_token_tag").notNull(),
    accessTokenKeyId: text("access_token_key_id").notNull().default("default"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    refreshTokenIv: text("refresh_token_iv"),
    refreshTokenTag: text("refresh_token_tag"),
    scopes: text("scopes"),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("external_integrations_user_id_idx").on(table.userId),
    providerUserUnique: uniqueIndex("external_integrations_provider_user_unique").on(table.userId, table.provider),
}));

export const externalSyncState = sqliteTable("external_sync_state", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["todoist", "google_tasks"] }).notNull(),
    syncToken: text("sync_token"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    status: text("status", { enum: ["idle", "syncing", "error"] }).notNull().default("idle"),
    error: text("error"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("external_sync_state_user_id_idx").on(table.userId),
    providerUserUnique: uniqueIndex("external_sync_state_provider_user_unique").on(table.userId, table.provider),
}));

export const externalEntityMap = sqliteTable("external_entity_map", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["todoist", "google_tasks"] }).notNull(),
    entityType: text("entity_type", { enum: ["task", "list", "label", "list_label"] }).notNull(),
    localId: integer("local_id"),
    externalId: text("external_id").notNull(),
    externalParentId: text("external_parent_id"),
    externalEtag: text("external_etag"),
    externalUpdatedAt: integer("external_updated_at", { mode: "timestamp" }),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    userIdIdx: index("external_entity_map_user_id_idx").on(table.userId),
    externalIdIdx: index("external_entity_map_external_id_idx").on(table.externalId),
    localIdIdx: index("external_entity_map_local_id_idx").on(table.localId),
    providerEntityUnique: uniqueIndex("external_entity_map_provider_entity_unique").on(
        table.userId,
        table.provider,
        table.entityType,
        table.externalId
    ),
}));

export const externalSyncConflicts = sqliteTable("external_sync_conflicts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["todoist", "google_tasks"] }).notNull(),
    entityType: text("entity_type", { enum: ["task", "list", "label"] }).notNull(),
    localId: integer("local_id"),
    externalId: text("external_id"),
    conflictType: text("conflict_type").notNull(),
    localPayload: text("local_payload"),
    externalPayload: text("external_payload"),
    status: text("status", { enum: ["pending", "resolved"] }).notNull().default("pending"),
    resolution: text("resolution"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    resolvedAt: integer("resolved_at", { mode: "timestamp" }),
}, (table) => ({
    userIdIdx: index("external_sync_conflicts_user_id_idx").on(table.userId),
    statusIdx: index("external_sync_conflicts_status_idx").on(table.status),
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
}, (table) => ({
    taskIdIdx: index("reminders_task_id_idx").on(table.taskId),
}));

export const taskLogs = sqliteTable("task_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .references(() => users.id, { onDelete: "cascade" }),
    taskId: integer("task_id")
        .references(() => tasks.id, { onDelete: "cascade" }),
    listId: integer("list_id")
        .references(() => lists.id, { onDelete: "cascade" }),
    labelId: integer("label_id")
        .references(() => labels.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    userIdIdx: index("task_logs_user_id_idx").on(t.userId),
    taskIdIdx: index("task_logs_task_id_idx").on(t.taskId),
    listIdIdx: index("task_logs_list_id_idx").on(t.listId),
    labelIdIdx: index("task_logs_label_id_idx").on(t.labelId),
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
}, (table) => ({
    taskIdCompletedAtIdx: index("habit_completions_task_id_completed_at_idx").on(table.taskId, table.completedAt),
}));

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
    streakFreezes: integer("streak_freezes").notNull().default(0),
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
    filterEnergyLevel: text("filter_energy_level", { enum: ["high", "medium", "low"] }),
    filterContext: text("filter_context", { enum: ["computer", "phone", "errands", "meeting", "home", "anywhere"] }),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    pk: primaryKey({ columns: [t.userId, t.viewId] }),
}));

export const rateLimits = sqliteTable("rate_limits", {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    lastRequest: integer("last_request", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
});

export const savedViews = sqliteTable("saved_views", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    settings: text("settings").notNull(), // JSON string of ViewSettings
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    userIdIdx: index("saved_views_user_id_idx").on(t.userId),
}));

// Time entries for tracking work sessions
export const timeEntries = sqliteTable("time_entries", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: integer("task_id")
        .notNull()
        .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    durationMinutes: integer("duration_minutes"),
    notes: text("notes"),
    isManual: integer("is_manual", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
    taskIdIdx: index("time_entries_task_id_idx").on(table.taskId),
    userIdIdx: index("time_entries_user_id_idx").on(table.userId),
    startedAtIdx: index("time_entries_started_at_idx").on(table.startedAt),
    // Composite index for analytics queries (stats by user and time range)
    userIdStartedAtIdx: index("time_entries_user_id_started_at_duration_minutes_idx").on(table.userId, table.startedAt, table.durationMinutes),
}));

export const customIcons = sqliteTable("custom_icons", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
}, (t) => ({
    userIdIdx: index("custom_icons_user_id_idx").on(t.userId),
}));
