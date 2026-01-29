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
 * Refactored to handle achievement unlocks iteratively instead of recursively.
 *
 * @param userId - The ID of the user
 * @param xpAmount - The amount of XP to add (can be 0 if just updating streak)
 * @returns Object with newXP, newLevel, leveledUp flag, and streak info
 */
export async function updateUserProgress(userId: string, xpAmount: number) {
  await requireUser(userId);

  // 1. Fetch all dependencies in parallel for maximum performance
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [stats, allAchievements, [taskCounts], unlockedEntries] = await Promise.all([
    getUserStats(userId),
    db.select().from(achievements),
    db.select({
      totalCompleted: sql<number>`count(*)`,
      dailyCompleted: sql<number>`count(case when ${and(gte(tasks.completedAt, todayStart), lte(tasks.completedAt, todayEnd))} then 1 else null end)`
    })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, true))),
    db.select({ id: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId))
  ]);

  const totalCompleted = taskCounts?.totalCompleted || 0;
  const dailyCompleted = taskCounts?.dailyCompleted || 0;
  const alreadyUnlockedIds = new Set(unlockedEntries.map((u) => u.id));

  let currentXP = stats.xp;
  let currentStreak = stats.currentStreak;
  let pendingXP = xpAmount;

  // Track unlocked achievements to avoid re-checking/re-awarding in the same transaction
  const newlyUnlockedAchievements: {
    id: string;
    name: string;
    xpReward: number;
  }[] = [];

  // Streak calculation (happens once based on initial state + time)
  const {
    newStreak,
    shouldUpdate: shouldUpdateStreak,
    usedFreeze,
  } = calculateStreakUpdate(
    stats.currentStreak,
    stats.lastLogin,
    stats.streakFreezes,
  );

  if (shouldUpdateStreak) {
    currentStreak = newStreak;
  }

  // 2. Iterative Loop for XP and Achievements (In-memory)
  let stabilizing = false;

  while (!stabilizing) {
    // Apply pending XP
    currentXP += pendingXP;
    pendingXP = 0;

    // Check for achievements with CURRENT state in-memory
    const { unlocked, totalReward } = checkAchievementsPure(
      currentXP,
      currentStreak,
      totalCompleted,
      dailyCompleted,
      allAchievements,
      alreadyUnlockedIds
    );

    if (unlocked.length > 0) {
      // Found new achievements!
      newlyUnlockedAchievements.push(...unlocked);
      unlocked.forEach(a => alreadyUnlockedIds.add(a.id));
      pendingXP += totalReward;
      // Loop again to see if this new XP unlocks anything else
    } else {
      // No new achievements, state is stable
      stabilizing = true;
    }
  }

  const finalXP = currentXP;
  const finalLevel = calculateLevel(finalXP);
  const leveledUp = finalLevel > stats.level;

  // 3. Perform Updates sequentially (or in a transaction if preferred)
  // A. Update User Stats
  const updateData: Partial<typeof userStats.$inferSelect> = {
    xp: finalXP,
    level: finalLevel,
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


  // B. Insert Newly Unlocked Achievements
  if (newlyUnlockedAchievements.length > 0) {
    await db.insert(userAchievements).values(
      newlyUnlockedAchievements.map(a => ({
        userId,
        achievementId: a.id
      }))
    );

    // Log achievements
    const logs = newlyUnlockedAchievements.map(a => ({
      userId,
      taskId: null,
      action: "achievement_unlocked",
      details: `Unlocked achievement: ${a.name} (+${a.xpReward} XP)`,
    }));

    await db.insert(taskLogs).values(logs);
  }

  // C. Handle Streak Logs
  if (shouldUpdateStreak) {
    if (usedFreeze) {
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_frozen",
        details: "Streak freeze used! ❄️ Your streak is safe.",
      });
    } else if (newStreak > stats.currentStreak) {
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_updated",
        details: `Streak increased to ${newStreak} days! 🔥`,
      });
    }
  }

  revalidatePath("/");

  return {
    newXP: finalXP,
    newLevel: finalLevel,
    leveledUp,
    streak: {
      current: currentStreak,
      updated: shouldUpdateStreak,
      frozen: usedFreeze,
    },
  };
}

/**
 * Legacy wrapper for backward compatibility.
 */
export async function checkAchievements(
  userId: string,
) {
  // Now simply triggers the iterative logic correctly
  return await updateUserProgress(userId, 0);
}

/**
 * Truly pure version of achievement check.
 * No async, no side effects.
 */
function checkAchievementsPure(
  currentXP: number,
  currentStreak: number,
  totalCompleted: number,
  dailyCompleted: number,
  allAchievements: (typeof achievements.$inferSelect)[],
  alreadyUnlockedIds: Set<string>
) {
  const newlyUnlocked: { id: string, name: string, xpReward: number }[] = [];
  let totalReward = 0;

  for (const achievement of allAchievements) {
    if (alreadyUnlockedIds.has(achievement.id)) continue;

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
      newlyUnlocked.push({
        id: achievement.id,
        name: achievement.name,
        xpReward: achievement.xpReward
      });
      totalReward += achievement.xpReward;
    }
  }

  return { unlocked: newlyUnlocked, totalReward };
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
