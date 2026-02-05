"use server";

import { db, habitCompletions, tasks } from "@/db";
import { eq, and, gte, sql, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfDay, endOfDay, subDays } from "date-fns";

// Record a habit completion for today
export async function completeHabit(taskId: number, completedAt?: Date) {
    const completionDate = completedAt || new Date();

    await db.insert(habitCompletions).values({
        taskId,
        completedAt: completionDate,
    });

    revalidatePath("/");
    revalidatePath("/habits");
}

// Get habit completions for a task
export async function getHabitCompletions(taskId: number, days: number = 90) {
    const since = subDays(new Date(), days);

    const completions = await db
        .select()
        .from(habitCompletions)
        .where(and(
            eq(habitCompletions.taskId, taskId),
            gte(habitCompletions.completedAt, since)
        ))
        // Perf: return oldest-first so streak calculations skip an extra in-memory sort.
        // This removes an O(n log n) sort and avoids repeated Date allocations in the comparator.
        .orderBy(asc(habitCompletions.completedAt));

    return completions;
}

// Check if habit was completed today
export async function isHabitCompletedToday(taskId: number): Promise<boolean> {
    const today = startOfDay(new Date());
    const endToday = endOfDay(new Date());

    const completion = await db
        .select()
        .from(habitCompletions)
        .where(and(
            eq(habitCompletions.taskId, taskId),
            gte(habitCompletions.completedAt, today),
            sql`${habitCompletions.completedAt} <= ${endToday}`
        ))
        .limit(1);

    return completion.length > 0;
}

// Get all habits for a user
export async function getHabits(userId: string) {
    const habits = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.isHabit, true), eq(tasks.userId, userId)))
        .orderBy(desc(tasks.createdAt));

    return habits;
}

// Calculate streak for a habit
export async function calculateStreak(taskId: number): Promise<{ current: number; best: number }> {
    const completions = await getHabitCompletions(taskId, 365);

    if (completions.length === 0) {
        return { current: 0, best: 0 };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastDateTime: number | null = null;

    const todayTime = startOfDay(new Date()).getTime();

    // Perf: avoid per-item sort and reuse timestamp math to reduce Date allocations in hot loops.
    for (const completion of completions) {
        const completionDate = startOfDay(
            completion.completedAt instanceof Date
                ? completion.completedAt
                : new Date(completion.completedAt)
        );
        const completionTime = completionDate.getTime();

        if (lastDateTime === null) {
            tempStreak = 1;
        } else {
            const daysDiff = Math.floor(
                (completionTime - lastDateTime) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 1) {
                tempStreak++;
            } else if (daysDiff > 1) {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
            // If daysDiff === 0, same day, continue streak
        }

        lastDateTime = completionTime;

        // Check if this is part of current streak (includes today or yesterday)
        const daysFromToday = Math.floor(
            (todayTime - completionTime) / (1000 * 60 * 60 * 24)
        );

        if (daysFromToday <= 1) {
            currentStreak = tempStreak;
        }
    }

    bestStreak = Math.max(bestStreak, tempStreak);

    return { current: currentStreak, best: bestStreak };
}
