#!/usr/bin/env bun
/**
 * Data Migration Script: SQLite to Neon PostgreSQL
 * 
 * This script migrates all data from the local SQLite database (sqlite.db)
 * to the Neon PostgreSQL database specified in DATABASE_URL.
 * 
 * Usage:
 *   bun scripts/migrate-data.ts
 * 
 * Requirements:
 *   - sqlite.db file must exist in the project root
 *   - DATABASE_URL environment variable must be set
 * 
 * The migration follows dependency order to satisfy foreign key constraints:
 * 1. lists (no dependencies)
 * 2. labels (no dependencies)
 * 3. achievements (no dependencies)
 * 4. tasks (depends on lists)
 * 5. taskLabels (depends on tasks, labels)
 * 6. reminders (depends on tasks)
 * 7. taskLogs (depends on tasks)
 * 8. habitCompletions (depends on tasks)
 * 9. taskDependencies (depends on tasks)
 * 10. templates (no dependencies)
 * 11. userStats (no dependencies)
 * 12. userAchievements (depends on achievements)
 * 13. viewSettings (no dependencies)
 * 
 * **Validates: Requirements 1.5.1, 1.5.3**
 */

import { Database } from "bun:sqlite";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import {
    transformNullableTimestamp,
    transformNullableBoolean,
    transformTimestamp,
    transformBoolean,
} from "../src/lib/migration-utils";

// Verify environment
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}

// Connect to SQLite source
const sqliteDb = new Database("sqlite.db", { readonly: true });
console.log("✅ Connected to SQLite source database");

// Connect to PostgreSQL destination
const sql = neon(process.env.DATABASE_URL);
const pgDb = drizzle(sql, { schema });
console.log("✅ Connected to Neon PostgreSQL destination database");

// Migration statistics
const stats: Record<string, { source: number; migrated: number; skipped?: number }> = {};

/**
 * Generic function to migrate a table
 */
async function migrateTable<T>(
    tableName: string,
    sqliteQuery: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pgTable: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformRow: (row: any) => T,
    options: { skipOnConflict?: boolean } = {}
): Promise<void> {
    console.log(`\n📦 Migrating ${tableName}...`);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = sqliteDb.query(sqliteQuery).all() as any[];
    stats[tableName] = { source: rows.length, migrated: 0, skipped: 0 };
    
    if (rows.length === 0) {
        console.log(`   ⏭️  No data to migrate`);
        return;
    }
    
    console.log(`   📊 Found ${rows.length} records`);
    
    // Transform and insert in batches
    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const transformed = batch.map(transformRow);
        
        try {
            if (options.skipOnConflict) {
                // Use onConflictDoNothing for idempotent migrations
                await pgDb.insert(pgTable).values(transformed).onConflictDoNothing();
            } else {
                await pgDb.insert(pgTable).values(transformed);
            }
            stats[tableName].migrated += batch.length;
        } catch (error) {
            // Check if it's a duplicate key error
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            if (err?.sourceError?.code === "23505" || 
                err?.cause?.code === "23505" ||
                String(error).includes("duplicate key")) {
                console.log(`   ⏭️  Skipping batch (already exists)`);
                stats[tableName].skipped = (stats[tableName].skipped || 0) + batch.length;
            } else {
                console.error(`   ❌ Error inserting batch at index ${i}:`, error);
                throw error;
            }
        }
    }
    
    const skipped = stats[tableName].skipped || 0;
    if (skipped > 0) {
        console.log(`   ✅ Migrated ${stats[tableName].migrated} records (${skipped} skipped - already exist)`);
    } else {
        console.log(`   ✅ Migrated ${stats[tableName].migrated} records`);
    }
}

async function main() {
    console.log("\n🚀 Starting SQLite to PostgreSQL migration...\n");
    console.log("=" .repeat(50));
    
    try {
        // 1. Migrate lists
        await migrateTable(
            "lists",
            "SELECT * FROM lists",
            schema.lists,
            (row) => ({
                id: row.id,
                name: row.name,
                color: row.color,
                icon: row.icon,
                slug: row.slug,
                createdAt: transformTimestamp(row.created_at),
                updatedAt: transformTimestamp(row.updated_at),
            }),
            { skipOnConflict: true }
        );

        // 2. Migrate labels
        await migrateTable(
            "labels",
            "SELECT * FROM labels",
            schema.labels,
            (row) => ({
                id: row.id,
                name: row.name,
                color: row.color,
                icon: row.icon,
            }),
            { skipOnConflict: true }
        );

        // 3. Migrate achievements
        await migrateTable(
            "achievements",
            "SELECT * FROM achievements",
            schema.achievements,
            (row) => ({
                id: row.id,
                name: row.name,
                description: row.description,
                icon: row.icon,
                conditionType: row.condition_type,
                conditionValue: row.condition_value,
                xpReward: row.xp_reward,
            }),
            { skipOnConflict: true }
        );

        // 4. Migrate tasks (depends on lists)
        await migrateTable(
            "tasks",
            "SELECT * FROM tasks",
            schema.tasks,
            (row) => ({
                id: row.id,
                listId: row.list_id,
                title: row.title,
                description: row.description,
                priority: row.priority,
                dueDate: transformNullableTimestamp(row.due_date),
                isCompleted: transformBoolean(row.is_completed ?? 0),
                completedAt: transformNullableTimestamp(row.completed_at),
                isRecurring: transformBoolean(row.is_recurring ?? 0),
                recurringRule: row.recurring_rule,
                parentId: row.parent_id,
                estimateMinutes: row.estimate_minutes,
                actualMinutes: row.actual_minutes,
                energyLevel: row.energy_level,
                context: row.context,
                isHabit: transformBoolean(row.is_habit ?? 0),
                createdAt: transformTimestamp(row.created_at),
                updatedAt: transformTimestamp(row.updated_at),
                deadline: transformNullableTimestamp(row.deadline),
            }),
            { skipOnConflict: true }
        );

        // 5. Migrate taskLabels (depends on tasks, labels)
        await migrateTable(
            "taskLabels",
            "SELECT * FROM task_labels",
            schema.taskLabels,
            (row) => ({
                taskId: row.task_id,
                labelId: row.label_id,
            }),
            { skipOnConflict: true }
        );

        // 6. Migrate reminders (depends on tasks)
        await migrateTable(
            "reminders",
            "SELECT * FROM reminders",
            schema.reminders,
            (row) => ({
                id: row.id,
                taskId: row.task_id,
                remindAt: transformTimestamp(row.remind_at),
                isSent: transformBoolean(row.is_sent ?? 0),
                createdAt: transformTimestamp(row.created_at),
            }),
            { skipOnConflict: true }
        );

        // 7. Migrate taskLogs (depends on tasks)
        await migrateTable(
            "taskLogs",
            "SELECT * FROM task_logs",
            schema.taskLogs,
            (row) => ({
                id: row.id,
                taskId: row.task_id,
                action: row.action,
                details: row.details,
                createdAt: transformTimestamp(row.created_at),
            }),
            { skipOnConflict: true }
        );

        // 8. Migrate habitCompletions (depends on tasks)
        await migrateTable(
            "habitCompletions",
            "SELECT * FROM habit_completions",
            schema.habitCompletions,
            (row) => ({
                id: row.id,
                taskId: row.task_id,
                completedAt: transformTimestamp(row.completed_at),
                createdAt: transformTimestamp(row.created_at),
            }),
            { skipOnConflict: true }
        );

        // 9. Migrate taskDependencies (depends on tasks)
        await migrateTable(
            "taskDependencies",
            "SELECT * FROM task_dependencies",
            schema.taskDependencies,
            (row) => ({
                taskId: row.task_id,
                blockerId: row.blocker_id,
            }),
            { skipOnConflict: true }
        );

        // 10. Migrate templates
        await migrateTable(
            "templates",
            "SELECT * FROM templates",
            schema.templates,
            (row) => ({
                id: row.id,
                name: row.name,
                content: row.content,
                createdAt: transformTimestamp(row.created_at),
                updatedAt: transformTimestamp(row.updated_at),
            }),
            { skipOnConflict: true }
        );

        // 11. Migrate userStats
        await migrateTable(
            "userStats",
            "SELECT * FROM user_stats",
            schema.userStats,
            (row) => ({
                id: row.id,
                xp: row.xp,
                level: row.level,
                lastLogin: transformNullableTimestamp(row.last_login),
                currentStreak: row.current_streak,
                longestStreak: row.longest_streak,
            }),
            { skipOnConflict: true }
        );

        // 12. Migrate userAchievements (depends on achievements)
        await migrateTable(
            "userAchievements",
            "SELECT * FROM user_achievements",
            schema.userAchievements,
            (row) => ({
                achievementId: row.achievement_id,
                unlockedAt: transformTimestamp(row.unlocked_at),
            }),
            { skipOnConflict: true }
        );

        // 13. Migrate viewSettings
        // Check if table exists first (it may not exist in older databases)
        const viewSettingsExists = sqliteDb.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='view_settings'"
        ).get();
        
        if (viewSettingsExists) {
            await migrateTable(
                "viewSettings",
                "SELECT * FROM view_settings",
                schema.viewSettings,
                (row) => ({
                    id: row.id,
                    layout: row.layout,
                    showCompleted: transformNullableBoolean(row.show_completed),
                    groupBy: row.group_by,
                    sortBy: row.sort_by,
                    sortOrder: row.sort_order,
                    filterDate: row.filter_date,
                    filterPriority: row.filter_priority,
                    filterLabelId: row.filter_label_id,
                    updatedAt: transformNullableTimestamp(row.updated_at),
                }),
                { skipOnConflict: true }
            );
        } else {
            console.log("\n📦 Migrating viewSettings...");
            console.log("   ⏭️  Table does not exist in source database");
            stats["viewSettings"] = { source: 0, migrated: 0 };
        }

        // Reset PostgreSQL sequences to match migrated data
        console.log("\n🔄 Resetting PostgreSQL sequences...");
        
        const sequenceResets = [
            "SELECT setval('lists_id_seq', COALESCE((SELECT MAX(id) FROM lists), 1))",
            "SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1))",
            "SELECT setval('labels_id_seq', COALESCE((SELECT MAX(id) FROM labels), 1))",
            "SELECT setval('reminders_id_seq', COALESCE((SELECT MAX(id) FROM reminders), 1))",
            "SELECT setval('task_logs_id_seq', COALESCE((SELECT MAX(id) FROM task_logs), 1))",
            "SELECT setval('habit_completions_id_seq', COALESCE((SELECT MAX(id) FROM habit_completions), 1))",
            "SELECT setval('templates_id_seq', COALESCE((SELECT MAX(id) FROM templates), 1))",
        ];
        
        for (const resetSql of sequenceResets) {
            await sql(resetSql);
        }
        console.log("   ✅ Sequences reset to match migrated data");

        // Print summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 Migration Summary\n");
        
        let totalSource = 0;
        let totalMigrated = 0;
        
        for (const [table, counts] of Object.entries(stats)) {
            const status = counts.source === counts.migrated ? "✅" : "⚠️";
            console.log(`   ${status} ${table}: ${counts.migrated}/${counts.source} records`);
            totalSource += counts.source;
            totalMigrated += counts.migrated;
        }
        
        console.log("\n" + "-".repeat(50));
        console.log(`   Total: ${totalMigrated}/${totalSource} records migrated`);
        
        if (totalSource === totalMigrated) {
            console.log("\n✅ Migration completed successfully!");
        } else {
            console.log("\n⚠️  Migration completed with some discrepancies");
        }
        
    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
    } finally {
        sqliteDb.close();
    }
}

// Export stats for testing
export { stats };

main();
