/**
 * Migration script to move all data from one user to another
 *
 * Usage: bun run scripts/migrate-user-data.ts
 *
 * This script migrates all data from 'migration_user_default' to 'user_01KBZWFMYCSSR86F8QK48AVK1A'
 *
 * Strategy: Update slugs FIRST to avoid conflicts, then update userIds atomically.
 */

import { neon } from "@neondatabase/serverless";
import { db } from "@/db";
import {
    users,
    lists,
    tasks,
    labels,
    taskLogs,
    templates,
    userStats,
    userAchievements,
    viewSettings,
} from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
}

const rawSql = neon(process.env.DATABASE_URL);

const OLD_USER_ID = "migration_user_default";
const NEW_USER_ID = "user_01KBZWFMYCSSR86F8QK48AVK1A";

async function migrateUserData() {
    console.log(
        `\n🔄 Migrating data from "${OLD_USER_ID}" to "${NEW_USER_ID}"...\n`
    );

    // Verify both users exist
    const [oldUser, newUser] = await Promise.all([
        db.select().from(users).where(eq(users.id, OLD_USER_ID)),
        db.select().from(users).where(eq(users.id, NEW_USER_ID)),
    ]);

    if (oldUser.length === 0) {
        console.error(`❌ Source user "${OLD_USER_ID}" not found!`);
        process.exit(1);
    }

    if (newUser.length === 0) {
        console.error(`❌ Target user "${NEW_USER_ID}" not found!`);
        process.exit(1);
    }

    console.log(`✅ Found source user: ${oldUser[0].email}`);
    console.log(`✅ Found target user: ${newUser[0].email}\n`);

    // Count records before migration
    const counts = {
        lists: await db
            .select({ count: sql<number>`count(*)` })
            .from(lists)
            .where(eq(lists.userId, OLD_USER_ID)),
        tasks: await db
            .select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(eq(tasks.userId, OLD_USER_ID)),
        labels: await db
            .select({ count: sql<number>`count(*)` })
            .from(labels)
            .where(eq(labels.userId, OLD_USER_ID)),
        taskLogs: await db
            .select({ count: sql<number>`count(*)` })
            .from(taskLogs)
            .where(eq(taskLogs.userId, OLD_USER_ID)),
        templates: await db
            .select({ count: sql<number>`count(*)` })
            .from(templates)
            .where(eq(templates.userId, OLD_USER_ID)),
        userStats: await db
            .select({ count: sql<number>`count(*)` })
            .from(userStats)
            .where(eq(userStats.userId, OLD_USER_ID)),
        userAchievements: await db
            .select({ count: sql<number>`count(*)` })
            .from(userAchievements)
            .where(eq(userAchievements.userId, OLD_USER_ID)),
        viewSettings: await db
            .select({ count: sql<number>`count(*)` })
            .from(viewSettings)
            .where(eq(viewSettings.userId, OLD_USER_ID)),
    };

    console.log("📊 Records to migrate:");
    console.log(`   - Lists: ${counts.lists[0].count}`);
    console.log(`   - Tasks: ${counts.tasks[0].count}`);
    console.log(`   - Labels: ${counts.labels[0].count}`);
    console.log(`   - Task Logs: ${counts.taskLogs[0].count}`);
    console.log(`   - Templates: ${counts.templates[0].count}`);
    console.log(`   - User Stats: ${counts.userStats[0].count}`);
    console.log(`   - User Achievements: ${counts.userAchievements[0].count}`);
    console.log(`   - View Settings: ${counts.viewSettings[0].count}`);
    console.log("");

    try {
        // Step 1: Rename conflicting slugs BEFORE changing userId
        // This avoids unique constraint violations
        const oldLists = await db
            .select()
            .from(lists)
            .where(eq(lists.userId, OLD_USER_ID));
        const newUserLists = await db
            .select()
            .from(lists)
            .where(eq(lists.userId, NEW_USER_ID));
        const existingSlugs = new Set(newUserLists.map((l) => l.slug));

        console.log(`🔧 Checking for slug conflicts...`);
        for (const list of oldLists) {
            if (existingSlugs.has(list.slug)) {
                let suffix = 1;
                let newSlug = `${list.slug}-migrated`;
                while (existingSlugs.has(newSlug)) {
                    newSlug = `${list.slug}-migrated-${suffix}`;
                    suffix++;
                }
                console.log(`   ⚠️  Renaming slug "${list.slug}" to "${newSlug}"`);
                
                // Update slug while still under old user (no conflict yet)
                await db
                    .update(lists)
                    .set({ slug: newSlug })
                    .where(eq(lists.id, list.id));
                
                existingSlugs.add(newSlug);
            }
        }
        console.log(`✅ Slug conflicts resolved`);

        // Step 2: Now update tasks and lists atomically with CTE
        console.log(`🔧 Updating tasks and lists atomically...`);
        await rawSql`
            WITH updated_tasks AS (
                UPDATE tasks 
                SET user_id = ${NEW_USER_ID}
                WHERE user_id = ${OLD_USER_ID}
                RETURNING id
            ),
            updated_lists AS (
                UPDATE lists 
                SET user_id = ${NEW_USER_ID}
                WHERE user_id = ${OLD_USER_ID}
                RETURNING id
            )
            SELECT 
                (SELECT count(*) FROM updated_tasks) as tasks_count,
                (SELECT count(*) FROM updated_lists) as lists_count
        `;
        console.log(`✅ Migrated tasks and lists`);

        // Step 3: Update labels
        await db
            .update(labels)
            .set({ userId: NEW_USER_ID })
            .where(eq(labels.userId, OLD_USER_ID));
        console.log(`✅ Migrated labels`);

        // Step 4: Update task logs
        await db
            .update(taskLogs)
            .set({ userId: NEW_USER_ID })
            .where(eq(taskLogs.userId, OLD_USER_ID));
        console.log(`✅ Migrated task logs`);

        // Step 5: Update templates
        await db
            .update(templates)
            .set({ userId: NEW_USER_ID })
            .where(eq(templates.userId, OLD_USER_ID));
        console.log(`✅ Migrated templates`);

        // Step 6: Handle userStats (primary key is userId)
        const existingStats = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, NEW_USER_ID));
        const oldStats = await db
            .select()
            .from(userStats)
            .where(eq(userStats.userId, OLD_USER_ID));

        if (oldStats.length > 0) {
            if (existingStats.length > 0) {
                // Merge stats - take the higher values
                await db
                    .update(userStats)
                    .set({
                        xp: Math.max(existingStats[0].xp, oldStats[0].xp),
                        level: Math.max(existingStats[0].level, oldStats[0].level),
                        currentStreak: Math.max(
                            existingStats[0].currentStreak,
                            oldStats[0].currentStreak
                        ),
                        longestStreak: Math.max(
                            existingStats[0].longestStreak,
                            oldStats[0].longestStreak
                        ),
                        lastLogin:
                            oldStats[0].lastLogin && existingStats[0].lastLogin
                                ? oldStats[0].lastLogin > existingStats[0].lastLogin
                                    ? oldStats[0].lastLogin
                                    : existingStats[0].lastLogin
                                : oldStats[0].lastLogin || existingStats[0].lastLogin,
                    })
                    .where(eq(userStats.userId, NEW_USER_ID));
                await db.delete(userStats).where(eq(userStats.userId, OLD_USER_ID));
                console.log(`✅ Merged user stats (kept higher values)`);
            } else {
                await db.insert(userStats).values({
                    userId: NEW_USER_ID,
                    xp: oldStats[0].xp,
                    level: oldStats[0].level,
                    currentStreak: oldStats[0].currentStreak,
                    longestStreak: oldStats[0].longestStreak,
                    lastLogin: oldStats[0].lastLogin,
                });
                await db.delete(userStats).where(eq(userStats.userId, OLD_USER_ID));
                console.log(`✅ Migrated user stats`);
            }
        } else {
            console.log(`⏭️  No user stats to migrate`);
        }

        // Step 7: Handle userAchievements
        const oldAchievements = await db
            .select()
            .from(userAchievements)
            .where(eq(userAchievements.userId, OLD_USER_ID));
        for (const achievement of oldAchievements) {
            const existing = await db
                .select()
                .from(userAchievements)
                .where(
                    and(
                        eq(userAchievements.userId, NEW_USER_ID),
                        eq(userAchievements.achievementId, achievement.achievementId)
                    )
                );

            if (existing.length === 0) {
                await db.insert(userAchievements).values({
                    userId: NEW_USER_ID,
                    achievementId: achievement.achievementId,
                    unlockedAt: achievement.unlockedAt,
                });
            }
        }
        await db
            .delete(userAchievements)
            .where(eq(userAchievements.userId, OLD_USER_ID));
        console.log(
            `✅ Migrated user achievements (${oldAchievements.length} records)`
        );

        // Step 8: Handle viewSettings
        const oldViewSettings = await db
            .select()
            .from(viewSettings)
            .where(eq(viewSettings.userId, OLD_USER_ID));
        for (const setting of oldViewSettings) {
            const existing = await db
                .select()
                .from(viewSettings)
                .where(
                    and(
                        eq(viewSettings.userId, NEW_USER_ID),
                        eq(viewSettings.viewId, setting.viewId)
                    )
                );

            if (existing.length === 0) {
                await db.insert(viewSettings).values({
                    userId: NEW_USER_ID,
                    viewId: setting.viewId,
                    layout: setting.layout,
                    showCompleted: setting.showCompleted,
                    groupBy: setting.groupBy,
                    sortBy: setting.sortBy,
                    sortOrder: setting.sortOrder,
                    filterDate: setting.filterDate,
                    filterPriority: setting.filterPriority,
                    filterLabelId: setting.filterLabelId,
                });
            }
        }
        await db.delete(viewSettings).where(eq(viewSettings.userId, OLD_USER_ID));
        console.log(
            `✅ Migrated view settings (${oldViewSettings.length} records)`
        );

        console.log(`\n🎉 Migration complete!\n`);
        console.log(`⚠️  Note: The old user "${OLD_USER_ID}" was NOT deleted.`);
        console.log(
            `   To delete it, run: DELETE FROM users WHERE id = '${OLD_USER_ID}';\n`
        );
    } catch (error) {
        console.error(`\n❌ Migration failed at some point.`);
        console.error(
            `   Some data may have been partially migrated. Check the database state.`
        );
        throw error;
    }
}

migrateUserData().catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
});
