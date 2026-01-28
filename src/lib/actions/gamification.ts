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
  calculateStreakUpdate,
} from "./shared";
import { requireUser } from "@/lib/auth";

/**
 * Retrieves user stats (XP, level, streak) for a specific user.
 * Creates initial stats if they don't exist.
 *
 * @param userId - The ID of the user
 * @returns The user's stats
 */
export async function getUserStats(userId: string) {
  await requireUser(userId);

  const stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId));
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
  return await updateUserProgress(userId, amount);
}

/**
 * Updates user progress (Streak + XP) in a single transaction.
 * Optimized to reduce database roundtrips during high-frequency actions like task completion.
 *
 * @param userId - The ID of the user
 * @param xpAmount - The amount of XP to add (can be 0 if just updating streak)
 * @returns Object with newXP, newLevel, leveledUp flag, and streak info
 */
export async function updateUserProgress(userId: string, xpAmount: number) {
  await requireUser(userId);

  const stats = await getUserStats(userId);

  // 1. Calculate Streak Update
  const {
    newStreak,
    shouldUpdate: shouldUpdateStreak,
    usedFreeze,
  } = calculateStreakUpdate(
    stats.currentStreak,
    stats.lastLogin,
    stats.streakFreezes,
  );

  // 2. Calculate XP Update
  const newXP = stats.xp + xpAmount;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > stats.level;

  // 3. Perform Single DB Update
  const updateData: Partial<typeof userStats.$inferSelect> = {
    xp: newXP,
    level: newLevel,
  };

  if (shouldUpdateStreak) {
    updateData.currentStreak = newStreak;
    updateData.longestStreak = Math.max(stats.longestStreak, newStreak);
    updateData.streakFreezes = usedFreeze
      ? stats.streakFreezes - 1
      : stats.streakFreezes;
    updateData.lastLogin = new Date();
  }

  await db
    .update(userStats)
    .set(updateData)
    .where(eq(userStats.userId, userId));

  // 4. Handle Side Effects (Logs & Achievements)
  // Streak Logs
  if (shouldUpdateStreak) {
    if (usedFreeze) {
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_frozen",
        details: "Streak freeze used! ❄️ Your streak is safe.",
      });
    } else if (newStreak > stats.currentStreak) {
      // Only log significant streak increases (optional: avoid spamming log on every day)
      // But based on existing logic, we log it.
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_updated",
        details: `Streak increased to ${newStreak} days! 🔥`,
      });
    }
  }

  // Check for achievements
  // We pass the NEW streak and NEW XP
  await checkAchievements(
    userId,
    newXP,
    shouldUpdateStreak ? newStreak : stats.currentStreak,
  );

  revalidatePath("/");

  return {
    newXP,
    newLevel,
    leveledUp,
    streak: {
      current: shouldUpdateStreak ? newStreak : stats.currentStreak,
      updated: shouldUpdateStreak,
      frozen: usedFreeze,
    },
  };
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
  currentStreak: number,
) {
  // PERF: Execute queries in parallel.
  // We combine total and daily counts into a single query to reduce DB roundtrips.
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    allAchievements,
    unlocked,
    [taskCounts]
  ] = await Promise.all([
    // Get all achievements
    db.select().from(achievements),
    // Get unlocked achievements for this user
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)),
    // Get total and daily completed task counts in one query
    db.select({
      totalCompleted: sql<number>`count(*)`,
      dailyCompleted: sql<number>`count(case when ${and(gte(tasks.completedAt, todayStart), lte(tasks.completedAt, todayEnd))} then 1 else null end)`
    })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, true)))
  ]);

  const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
  const totalCompleted = taskCounts?.totalCompleted || 0;
  const dailyCompleted = taskCounts?.dailyCompleted || 0;

  const newAchievements = [];
  let totalXpReward = 0;

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
      newAchievements.push(achievement);
      totalXpReward += achievement.xpReward;
    }
  }

  if (newAchievements.length > 0) {
    // Batch insert new achievements
    await db.insert(userAchievements).values(
      newAchievements.map((a) => ({
        userId,
        achievementId: a.id,
      }))
    );

    // Batch insert logs
    await db.insert(taskLogs).values(
      newAchievements.map((a) => ({
        userId,
        taskId: null, // System log
        action: "achievement_unlocked",
        details: `Unlocked achievement: ${a.name} (+${a.xpReward} XP)`,
      }))
    );

    // Award total XP in one go
    // This will trigger a recursive call to updateUserProgress -> checkAchievements.
    // However, since we've already inserted the achievements above, the recursive call
    // will see them as unlocked and return immediately, preventing infinite loops or N+1 queries.
    if (totalXpReward > 0) {
      await addXP(userId, totalXpReward);
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
  await requireUser(userId);

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
