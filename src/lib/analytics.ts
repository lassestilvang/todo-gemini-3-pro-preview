"use server";

import { db, tasks } from "@/db";
import { eq } from "drizzle-orm";
import { subDays, format, startOfDay } from "date-fns";

export async function getAnalytics(userId: string) {
    const now = new Date();

    // Total tasks for this user
    const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.isCompleted).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get priority distribution
    const priorityDist = {
        high: allTasks.filter(t => t.priority === "high").length,
        medium: allTasks.filter(t => t.priority === "medium").length,
        low: allTasks.filter(t => t.priority === "low").length,
        none: allTasks.filter(t => t.priority === "none" || !t.priority).length,
    };

    // Tasks over time (last 30 days)
    const tasksOverTime: { date: string; created: number; completed: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const created = allTasks.filter(t => {
            const createdAt = new Date(t.createdAt);
            return createdAt >= dayStart && createdAt <= dayEnd;
        }).length;

        const completed = allTasks.filter(t => {
            if (!t.completedAt) return false;
            const completedAt = new Date(t.completedAt);
            return completedAt >= dayStart && completedAt <= dayEnd;
        }).length;

        tasksOverTime.push({
            date: format(day, "MMM d"),
            created,
            completed,
        });
    }

    // Time tracking stats
    const tasksWithTime = allTasks.filter(t => t.estimateMinutes && t.actualMinutes);
    const avgEstimate = tasksWithTime.length > 0
        ? Math.round(tasksWithTime.reduce((sum, t) => sum + (t.estimateMinutes || 0), 0) / tasksWithTime.length)
        : 0;
    const avgActual = tasksWithTime.length > 0
        ? Math.round(tasksWithTime.reduce((sum, t) => sum + (t.actualMinutes || 0), 0) / tasksWithTime.length)
        : 0;

    // Energy level insights
    const energyStats = {
        high: allTasks.filter(t => t.energyLevel === "high").length,
        medium: allTasks.filter(t => t.energyLevel === "medium").length,
        low: allTasks.filter(t => t.energyLevel === "low").length,
    };

    const energyCompleted = {
        high: allTasks.filter(t => t.energyLevel === "high" && t.isCompleted).length,
        medium: allTasks.filter(t => t.energyLevel === "medium" && t.isCompleted).length,
        low: allTasks.filter(t => t.energyLevel === "low" && t.isCompleted).length,
    };

    return {
        summary: {
            totalTasks,
            completedTasks,
            completionRate,
            avgEstimate,
            avgActual,
        },
        tasksOverTime,
        priorityDist,
        energyStats,
        energyCompleted,
    };
}
