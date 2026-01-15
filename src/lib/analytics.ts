"use server";

import { db, tasks } from "@/db";
import { eq } from "drizzle-orm";
import { subDays, format, startOfDay } from "date-fns";

export async function getAnalytics(userId: string) {
    // Validate userId before querying the database
    if (typeof userId !== "string" || userId.trim().length === 0) {
        return {
            summary: {
                totalTasks: 0,
                completedTasks: 0,
                completionRate: 0,
                avgEstimate: 0,
                avgActual: 0,
            },
            tasksOverTime: [],
            priorityDist: { high: 0, medium: 0, low: 0, none: 0 },
            energyStats: { high: 0, medium: 0, low: 0 },
            energyCompleted: { high: 0, medium: 0, low: 0 },
            productivityByDay: [0, 0, 0, 0, 0, 0, 0],
            heatmapData: [],
        };
    }

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

    // Productivity by day of week (0 = Sunday, 6 = Saturday)
    const productivityByDay = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];

    allTasks.filter(t => t.isCompleted && t.completedAt).forEach(t => {
        const day = new Date(t.completedAt!).getDay();
        productivityByDay[day]++;
    });

    // Heatmap data (last 90 days)
    const heatmapData: { date: string; count: number; level: number }[] = [];
    for (let i = 89; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const count = allTasks.filter(t => {
            if (!t.completedAt) return false;
            const completedAt = new Date(t.completedAt);
            return completedAt >= dayStart && completedAt <= dayEnd;
        }).length;

        // Level 0-4 based on count
        let level = 0;
        if (count > 0) level = 1;
        if (count > 3) level = 2;
        if (count > 6) level = 3;
        if (count > 10) level = 4;

        heatmapData.push({
            date: format(day, "yyyy-MM-dd"),
            count,
            level,
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
        productivityByDay,
        heatmapData,
    };
}
