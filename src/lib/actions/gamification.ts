/**
 * @module actions/gamification
 * @description Server Actions for gamification features including XP, levels,
 * streaks, and achievements.
 */
"use server";

import {
  db,
  tasks,
  taskLogs,
  userStats,
  achievements,
  userAchievements,
  eq,
  and,
  desc,
  gte,
  lte,
  sql,
  startOfDay,
  endOfDay,
  revalidatePath,
  calculateLevel,
} from "./shared";

/**
 * Retrieves user stats (XP, level, streak) for a specific user.
 * Creates initial stats if they don't exist.
 *
 * @param userId - The ID of the user
 * @returns The user's stats
 */
export async function getUserStats(userId: string) {
  const stats = await db.select().from(userStats).where(eq(userStats.userId, userId));
  if (stats.length === 0) {
    // Initialize if not exists
    const newStats = await db.insert(userStats).values({ userId }).returning();
    return newStats[0];
  }
  return stats[0];
}

/**
 * Adds XP to a user and checks for level up and achievements.
 *
 * @param userId - The ID of the user
 * @param amount - The amount of XP to add
 * @returns Object with newXP, newLevel, and leveledUp flag
 */
export async function addXP(userId: string, amount: number) {
  const stats = await getUserStats(userId);
  const newXP = stats.xp + amount;
  const newLevel = calculateLevel(newXP);

  await db
    .update(userStats)
    .set({
      xp: newXP,
      level: newLevel,
    })
    .where(eq(userStats.userId, userId));

  // Check for achievements
  await checkAchievements(userId, stats.xp + amount, stats.currentStreak);

  revalidatePath("/");
  return { newXP, newLevel, leveledUp: newLevel > stats.level };
}

/**
 * Checks and unlocks achievements for a user based on their progress.
 *
 * @param userId - The ID of the user
 * @param currentXP - The user's current XP
 * @param currentStreak - The user's current streak
 */
export async function checkAchievements(
  userId: string,
  currentXP: number,
  currentStreak: number
) {
  // Get all achievements
  const allAchievements = await db.select().from(achievements);

  // Get unlocked achievements for this user
  const unlocked = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

  // Get total tasks completed by this user
  const completedTasks = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, true)));
  const totalCompleted = completedTasks[0].count;

  // Get tasks completed today for "Hat Trick"
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const completedToday = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        eq(tasks.isCompleted, true),
        gte(tasks.completedAt, todayStart),
        lte(tasks.completedAt, todayEnd)
      )
    );
  const dailyCompleted = completedToday[0].count;

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue;

    let isUnlocked = false;

    switch (achievement.conditionType) {
      case "count_total":
        if (totalCompleted >= achievement.conditionValue) isUnlocked = true;
        break;
      case "count_daily":
        if (dailyCompleted >= achievement.conditionValue) isUnlocked = true;
        break;
      case "streak":
        if (currentStreak >= achievement.conditionValue) isUnlocked = true;
        break;
    }

    if (isUnlocked) {
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
      });

      // Award XP for achievement
      await addXP(userId, achievement.xpReward);

      // Log it
      await db.insert(taskLogs).values({
        userId,
        taskId: null, // System log
        action: "achievement_unlocked",
        details: `Unlocked achievement: ${achievement.name} (+${achievement.xpReward} XP)`,
      });
    }
  }
}

/**
 * Retrieves all available achievements.
 *
 * @returns Array of all achievements
 */
export async function getAchievements() {
  return await db.select().from(achievements);
}

/**
 * Retrieves achievements unlocked by a specific user.
 *
 * @param userId - The ID of the user
 * @returns Array of unlocked achievements with details
 */
export async function getUserAchievements(userId: string) {
  const result = await db
    .select({
      achievementId: userAchievements.achievementId,
      unlockedAt: userAchievements.unlockedAt,
      name: achievements.name,
      description: achievements.description,
      icon: achievements.icon,
      xpReward: achievements.xpReward,
    })
    .from(userAchievements)
    .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.unlockedAt));

  return result;
}
