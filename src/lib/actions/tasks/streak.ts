"use server";

import {
  db,
  userStats,
  taskLogs,
  eq,
  calculateStreakUpdate,
  type ActionResult,
  withErrorHandling,
} from "../shared";
import { requireUser } from "@/lib/auth";
import { getUserStats } from "../gamification";
import { rateLimit } from "@/lib/rate-limit";

async function updateStreakImpl(userId: string) {
  await requireUser(userId);

  const limit = await rateLimit(`streak:update:${userId}`, 100, 3600);
  if (!limit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const stats = await getUserStats(userId);
  const { newStreak, shouldUpdate, usedFreeze } = calculateStreakUpdate(
    stats.currentStreak,
    stats.lastLogin,
    stats.streakFreezes
  );

  if (shouldUpdate) {
    await db
      .update(userStats)
      .set({
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        streakFreezes: usedFreeze ? stats.streakFreezes - 1 : stats.streakFreezes,
        lastLogin: new Date(),
      })
      .where(eq(userStats.userId, userId));

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
}

export const updateStreak: (userId: string) => Promise<ActionResult<void>> = withErrorHandling(updateStreakImpl);
