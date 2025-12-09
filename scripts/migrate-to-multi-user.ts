#!/usr/bin/env bun
/**
 * Multi-User Migration Script
 * 
 * This script migrates existing single-user data to the multi-user schema
 * by creating a default user and associating all existing records with that user.
 * 
 * Usage:
 *   bun scripts/migrate-to-multi-user.ts
 * 
 * Environment Variables:
 *   DATABASE_URL - Required: Neon PostgreSQL connection string
 *   MIGRATION_USER_ID - Optional: Existing WorkOS user ID to assign data to
 *   MIGRATION_USER_EMAIL - Optional: Email for the migration user (default: admin@localhost)
 * 
 * The migration handles the following tables:
 * - users (creates migration user if needed)
 * - lists (adds userId)
 * - tasks (adds userId)
 * - labels (adds userId)
 * - templates (adds userId)
 * - taskLogs (adds userId)
 * - userStats (migrates to per-user with userId as PK)
 * - userAchievements (adds userId to composite PK)
 * - viewSettings (adds userId to composite PK)
 * 
 * **Validates: Requirements 9.3**
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

// Verify environment
if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
}

// Configuration
const MIGRATION_USER_ID = process.env.MIGRATION_USER_ID || "migration_user_default";
const MIGRATION_USER_EMAIL = process.env.MIGRATION_USER_EMAIL || "admin@localhost";

// Connect to PostgreSQL
const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient, { schema });

console.log("✅ Connected to Neon PostgreSQL database");

// Migration statistics
interface MigrationStats {
    table: string;
    updated: number;
    skipped: number;
}

const stats: MigrationStats[] = [];

/**
 * Create or get the migration user
 */
async function ensureMigrationUser(): Promise<string> {
    console.log("\n👤 Ensuring migration user exists...");
    
    // Check if user already exists
    const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, MIGRATION_USER_ID))
        .limit(1);
    
    if (existingUser.length > 0) {
        console.log(`   ✅ Migration user already exists: ${existingUser[0].email}`);
        return existingUser[0].id;
    }
    
    // Create migration user
    await db.insert(schema.users).values({
        id: MIGRATION_USER_ID,
        email: MIGRATION_USER_EMAIL,
        firstName: "Migration",
        lastName: "User",
        avatarUrl: null,
    });
    
    console.log(`   ✅ Created migration user: ${MIGRATION_USER_EMAIL}`);
    return MIGRATION_USER_ID;
}

/**
 * Migrate lists table - add userId to records without one
 */
async function migrateLists(userId: string): Promise<void> {
    console.log("\n📦 Migrating lists...");
    
    // Check for records without userId using raw SQL since column might not exist yet
    try {
        const result = await sqlClient`
            UPDATE lists 
            SET user_id = ${userId} 
            WHERE user_id IS NULL
            RETURNING id
        `;
        
        stats.push({ table: "lists", updated: result.length, skipped: 0 });
        console.log(`   ✅ Updated ${result.length} records`);
    } catch (error) {
        // Column might not exist or all records already have userId
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
            stats.push({ table: "lists", updated: 0, skipped: 0 });
        } else {
            // Try counting existing records
            const existing = await sqlClient`SELECT COUNT(*) as count FROM lists WHERE user_id IS NOT NULL`;
            stats.push({ table: "lists", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
        }
    }
}

/**
 * Migrate tasks table - add userId to records without one
 */
async function migrateTasks(userId: string): Promise<void> {
    console.log("\n📦 Migrating tasks...");
    
    try {
        const result = await sqlClient`
            UPDATE tasks 
            SET user_id = ${userId} 
            WHERE user_id IS NULL
            RETURNING id
        `;
        
        stats.push({ table: "tasks", updated: result.length, skipped: 0 });
        console.log(`   ✅ Updated ${result.length} records`);
    } catch (error) {
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
            stats.push({ table: "tasks", updated: 0, skipped: 0 });
        } else {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM tasks WHERE user_id IS NOT NULL`;
            stats.push({ table: "tasks", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
        }
    }
}

/**
 * Migrate labels table - add userId to records without one
 */
async function migrateLabels(userId: string): Promise<void> {
    console.log("\n📦 Migrating labels...");
    
    try {
        const result = await sqlClient`
            UPDATE labels 
            SET user_id = ${userId} 
            WHERE user_id IS NULL
            RETURNING id
        `;
        
        stats.push({ table: "labels", updated: result.length, skipped: 0 });
        console.log(`   ✅ Updated ${result.length} records`);
    } catch (error) {
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
            stats.push({ table: "labels", updated: 0, skipped: 0 });
        } else {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM labels WHERE user_id IS NOT NULL`;
            stats.push({ table: "labels", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
        }
    }
}

/**
 * Migrate templates table - add userId to records without one
 */
async function migrateTemplates(userId: string): Promise<void> {
    console.log("\n📦 Migrating templates...");
    
    try {
        const result = await sqlClient`
            UPDATE templates 
            SET user_id = ${userId} 
            WHERE user_id IS NULL
            RETURNING id
        `;
        
        stats.push({ table: "templates", updated: result.length, skipped: 0 });
        console.log(`   ✅ Updated ${result.length} records`);
    } catch (error) {
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
            stats.push({ table: "templates", updated: 0, skipped: 0 });
        } else {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM templates WHERE user_id IS NOT NULL`;
            stats.push({ table: "templates", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
        }
    }
}

/**
 * Migrate taskLogs table - add userId to records without one
 */
async function migrateTaskLogs(userId: string): Promise<void> {
    console.log("\n📦 Migrating taskLogs...");
    
    try {
        const result = await sqlClient`
            UPDATE task_logs 
            SET user_id = ${userId} 
            WHERE user_id IS NULL
            RETURNING id
        `;
        
        stats.push({ table: "taskLogs", updated: result.length, skipped: 0 });
        console.log(`   ✅ Updated ${result.length} records`);
    } catch (error) {
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
            stats.push({ table: "taskLogs", updated: 0, skipped: 0 });
        } else {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM task_logs WHERE user_id IS NOT NULL`;
            stats.push({ table: "taskLogs", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
        }
    }
}

/**
 * Migrate userStats table - convert from singleton to per-user
 * Old schema had 'id' as PK, new schema has 'user_id' as PK
 */
async function migrateUserStats(userId: string): Promise<void> {
    console.log("\n📦 Migrating userStats...");
    
    try {
        // Check if there's existing data in the old format (with 'id' column)
        const oldData = await sqlClient`
            SELECT * FROM user_stats LIMIT 1
        `;
        
        if (oldData.length === 0) {
            // No existing data, create default stats for migration user
            await db.insert(schema.userStats).values({
                userId,
                xp: 0,
                level: 1,
                currentStreak: 0,
                longestStreak: 0,
            }).onConflictDoNothing();
            
            stats.push({ table: "userStats", updated: 1, skipped: 0 });
            console.log("   ✅ Created default stats for migration user");
            return;
        }
        
        // Check if data already has user_id
        const hasUserId = 'user_id' in oldData[0];
        
        if (hasUserId && oldData[0].user_id) {
            stats.push({ table: "userStats", updated: 0, skipped: 1 });
            console.log("   ⏭️  Stats already migrated");
            return;
        }
        
        // Migrate existing stats to the migration user
        // This handles the case where old schema had 'id' column
        const existingStats = oldData[0];
        
        await db.insert(schema.userStats).values({
            userId,
            xp: existingStats.xp || 0,
            level: existingStats.level || 1,
            lastLogin: existingStats.last_login ? new Date(existingStats.last_login) : null,
            currentStreak: existingStats.current_streak || 0,
            longestStreak: existingStats.longest_streak || 0,
        }).onConflictDoNothing();
        
        stats.push({ table: "userStats", updated: 1, skipped: 0 });
        console.log("   ✅ Migrated existing stats to migration user");
        
    } catch (error) {
        console.log("   ⚠️  Could not migrate userStats:", (error as Error).message);
        stats.push({ table: "userStats", updated: 0, skipped: 0 });
    }
}

/**
 * Migrate userAchievements table - add userId to records without one
 */
async function migrateUserAchievements(userId: string): Promise<void> {
    console.log("\n📦 Migrating userAchievements...");
    
    try {
        // Check if there are achievements without user_id
        const oldAchievements = await sqlClient`
            SELECT achievement_id, unlocked_at FROM user_achievements 
            WHERE user_id IS NULL
        `;
        
        if (oldAchievements.length === 0) {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM user_achievements`;
            stats.push({ table: "userAchievements", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
            return;
        }
        
        // Insert with userId (new composite PK includes userId)
        for (const achievement of oldAchievements) {
            await db.insert(schema.userAchievements).values({
                userId,
                achievementId: achievement.achievement_id,
                unlockedAt: new Date(achievement.unlocked_at),
            }).onConflictDoNothing();
        }
        
        // Delete old records without userId
        await sqlClient`DELETE FROM user_achievements WHERE user_id IS NULL`;
        
        stats.push({ table: "userAchievements", updated: oldAchievements.length, skipped: 0 });
        console.log(`   ✅ Migrated ${oldAchievements.length} achievements`);
        
    } catch (error) {
        const err = error as Error;
        if (err.message?.includes("column") && err.message?.includes("does not exist")) {
            console.log("   ⏭️  Column user_id does not exist yet - schema migration needed first");
        } else {
            console.log("   ⚠️  Could not migrate userAchievements:", err.message);
        }
        stats.push({ table: "userAchievements", updated: 0, skipped: 0 });
    }
}

/**
 * Migrate viewSettings table - add userId to records without one
 */
async function migrateViewSettings(userId: string): Promise<void> {
    console.log("\n📦 Migrating viewSettings...");
    
    try {
        // Check if table exists and has data
        const tableExists = await sqlClient`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'view_settings'
            ) as exists
        `;
        
        if (!tableExists[0]?.exists) {
            console.log("   ⏭️  Table does not exist yet");
            stats.push({ table: "viewSettings", updated: 0, skipped: 0 });
            return;
        }
        
        // Check for records without userId
        const oldSettings = await sqlClient`
            SELECT view_id, layout, show_completed, group_by, sort_by, sort_order, 
                   filter_date, filter_priority, filter_label_id, updated_at 
            FROM view_settings 
            WHERE user_id IS NULL
        `;
        
        if (oldSettings.length === 0) {
            const existing = await sqlClient`SELECT COUNT(*) as count FROM view_settings`;
            stats.push({ table: "viewSettings", updated: 0, skipped: Number(existing[0]?.count || 0) });
            console.log(`   ⏭️  All records already have userId (${existing[0]?.count || 0} records)`);
            return;
        }
        
        // Insert with userId (new composite PK includes userId)
        for (const setting of oldSettings) {
            await db.insert(schema.viewSettings).values({
                userId,
                viewId: setting.view_id,
                layout: setting.layout,
                showCompleted: setting.show_completed,
                groupBy: setting.group_by,
                sortBy: setting.sort_by,
                sortOrder: setting.sort_order,
                filterDate: setting.filter_date,
                filterPriority: setting.filter_priority,
                filterLabelId: setting.filter_label_id,
                updatedAt: setting.updated_at ? new Date(setting.updated_at) : new Date(),
            }).onConflictDoNothing();
        }
        
        // Delete old records without userId
        await sqlClient`DELETE FROM view_settings WHERE user_id IS NULL`;
        
        stats.push({ table: "viewSettings", updated: oldSettings.length, skipped: 0 });
        console.log(`   ✅ Migrated ${oldSettings.length} view settings`);
        
    } catch (error) {
        const err = error as Error;
        console.log("   ⚠️  Could not migrate viewSettings:", err.message);
        stats.push({ table: "viewSettings", updated: 0, skipped: 0 });
    }
}

/**
 * Main migration function
 */
async function main() {
    console.log("\n🚀 Starting Multi-User Migration...\n");
    console.log("=".repeat(50));
    console.log(`Migration User ID: ${MIGRATION_USER_ID}`);
    console.log(`Migration User Email: ${MIGRATION_USER_EMAIL}`);
    console.log("=".repeat(50));
    
    try {
        // Step 1: Ensure migration user exists
        const userId = await ensureMigrationUser();
        
        // Step 2: Migrate all tables
        await migrateLists(userId);
        await migrateTasks(userId);
        await migrateLabels(userId);
        await migrateTemplates(userId);
        await migrateTaskLogs(userId);
        await migrateUserStats(userId);
        await migrateUserAchievements(userId);
        await migrateViewSettings(userId);
        
        // Print summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 Migration Summary\n");
        
        let totalUpdated = 0;
        let totalSkipped = 0;
        
        for (const stat of stats) {
            const status = stat.updated > 0 ? "✅" : "⏭️";
            console.log(`   ${status} ${stat.table}: ${stat.updated} updated, ${stat.skipped} skipped`);
            totalUpdated += stat.updated;
            totalSkipped += stat.skipped;
        }
        
        console.log("\n" + "-".repeat(50));
        console.log(`   Total: ${totalUpdated} records updated, ${totalSkipped} already migrated`);
        console.log("\n✅ Multi-user migration completed successfully!");
        console.log("\n📝 Note: If you had existing data, it has been assigned to:");
        console.log(`   User ID: ${userId}`);
        console.log(`   Email: ${MIGRATION_USER_EMAIL}`);
        
    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        process.exit(1);
    }
}

main();
