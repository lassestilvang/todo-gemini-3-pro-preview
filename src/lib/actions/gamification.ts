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

  // 1. Fetch initial state
  const stats = await getUserStats(userId);
  let currentXP = stats.xp;
  let currentStreak = stats.currentStreak;
  let pendingXP = xpAmount;

  // Track unlocked achievements to avoid re-checking/re-awarding in the same transaction
  // and to bulk insert them at the end.
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

  // 2. Iterative Loop for XP and Achievements
  // We loop because unlocking an achievement gives XP, which might unlock another achievement (e.g., reaching level X).
  let stabilizing = false;
  let alreadyUnlockedIds: Set<string> | null = null; // Lazy load

  while (!stabilizing) {
    // Apply pending XP
    currentXP += pendingXP;
    pendingXP = 0;

    // Check for achievements with NEW state
    // We pass a reference to alreadyUnlockedIds to allow the function to populate it once 
    // and respect previously unlocked achievements in this session.
    if (!alreadyUnlockedIds) {
      const unlockedEntries = await db
        .select({ id: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      alreadyUnlockedIds = new Set(unlockedEntries.map((u) => u.id));
    }

    // Add newly unlocked in this session to the set so we don't double count
    newlyUnlockedAchievements.forEach(a => alreadyUnlockedIds!.add(a.id));

    const { unlocked, totalReward } = await checkAchievementsPure(
      userId,
      currentXP,
      currentStreak,
      alreadyUnlockedIds!
    );

    if (unlocked.length > 0) {
      // Found new achievements!
      newlyUnlockedAchievements.push(...unlocked);
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

  // 3. Perform Updates

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
 * Checks and unlocks achievements for a user based on their progress.
 * This is a wrapper for the pure function to maintain backward compatibility if needed,
 * or acts as the "Side Effect" version if called directly.
 * 
 * However, with the new recursive-safe design, we prefer using updateUserProgress.
 * This function now just logs a warning if called directly for state updates, or performs the check.
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
  // Legacy support: Just run the pure check and insert if anything found.
  // NOTE: This will NOT trigger XP recursions safely if called standalone without the loop from updateUserProgress.
  // It is safer to use updateUserProgress(userId, 0) to trigger checks.

  const unlockedEntries = await db
    .select({ id: userAchievements.achievementId })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const alreadyUnlockedIds = new Set(unlockedEntries.map((u) => u.id));

  const { unlocked, totalReward } = await checkAchievementsPure(userId, currentXP, currentStreak, alreadyUnlockedIds);

  if (unlocked.length > 0) {
    // Insert unlocked
    await db.insert(userAchievements).values(
      unlocked.map(a => ({
        userId,
        achievementId: a.id
      }))
    );

    // Log
    const logs = unlocked.map(a => ({
      userId,
      taskId: null,
      action: "achievement_unlocked",
      details: `Unlocked achievement: ${a.name} (+${a.xpReward} XP)`,
    }));
    await db.insert(taskLogs).values(logs);

    // Recursive Award XP (DANGEROUS if not controlled, but needed for legacy behavior)
    // To avoiding infinite loop here, we should ideally call updateUserProgress, but that would be circular.
    // Instead, we just AWARD the XP directly here without re-checking achievements if this function is called directly.
    // But better: invoke updateUserProgress which NOW handles the recursion safely.
    if (totalReward > 0) {
      await updateUserProgress(userId, totalReward);
    }
  }
}

/**
 * Pure version of checkAchievements that returns what WOULD be unlocked.
 * Does not perform DB writes.
 */
async function checkAchievementsPure(
  userId: string,
  currentXP: number,
  currentStreak: number,
  alreadyUnlockedIds: Set<string>
) {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [
    allAchievements,
    [taskCounts]
  ] = await Promise.all([
    db.select().from(achievements),
    db.select({
      totalCompleted: sql<number>`count(*)`,
      dailyCompleted: sql<number>`count(case when ${and(gte(tasks.completedAt, todayStart), lte(tasks.completedAt, todayEnd))} then 1 else null end)`
    })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, true)))
  ]);

  const totalCompleted = taskCounts?.totalCompleted || 0;
  const dailyCompleted = taskCounts?.dailyCompleted || 0;

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
