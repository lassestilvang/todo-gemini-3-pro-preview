"use server";

import { db, tasks, timeEntries } from "@/db";
import { eq, and, gte, desc } from "drizzle-orm";
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
            duePrecisionDist: { day: 0, week: 0, month: 0, year: 0, none: 0 },
            energyStats: { high: 0, medium: 0, low: 0 },
            energyCompleted: { high: 0, medium: 0, low: 0 },
            productivityByDay: [0, 0, 0, 0, 0, 0, 0],
            heatmapData: [],
            timeTracking: {
                totalTrackedMinutes: 0,
                totalEstimatedMinutes: 0,
                accuracyPercent: 0,
                entriesCount: 0,
                dailyTracked: [],
            },
        };
    }

    const now = new Date();

    // Perf: select only columns used for analytics to reduce payload size and memory churn.
    // For large task tables, this avoids transferring unused text fields like descriptions.
    const allTasks = await db
        .select({
            isCompleted: tasks.isCompleted,
            priority: tasks.priority,
            dueDatePrecision: tasks.dueDatePrecision,
            dueDate: tasks.dueDate,
            energyLevel: tasks.energyLevel,
            estimateMinutes: tasks.estimateMinutes,
            actualMinutes: tasks.actualMinutes,
            createdAt: tasks.createdAt,
            completedAt: tasks.completedAt,
        })
        .from(tasks)
        .where(eq(tasks.userId, userId));
    const totalTasks = allTasks.length;

    // PERFORMANCE: Single-pass aggregation instead of multiple .filter() calls.
    // Original code did 150+ array scans (30 days * 2 + 90 days + 14 filter calls).
    // This reduces O(n * days) to O(n) with hash map lookups - ~10x faster for 500+ tasks.
    
    // Pre-compute date boundaries for 90-day heatmap (includes 30-day chart)
    const ninetyDaysAgo = startOfDay(subDays(now, 89));
    const ninetyDaysAgoTime = ninetyDaysAgo.getTime();

    // Initialize aggregation structures
    let completedTasks = 0;
    const priorityDist = { high: 0, medium: 0, low: 0, none: 0 };
    const duePrecisionDist = { day: 0, week: 0, month: 0, year: 0, none: 0 };
    const energyStats = { high: 0, medium: 0, low: 0 };
    const energyCompleted = { high: 0, medium: 0, low: 0 };
    const productivityByDay = [0, 0, 0, 0, 0, 0, 0];
    
    // Hash maps for date-based aggregation (yyyy-MM-dd -> counts)
    const createdByDate = new Map<string, number>();
    const completedByDate = new Map<string, number>();
    
    // Time tracking accumulators
    let timeTrackingCount = 0;
    let totalEstimateMinutes = 0;
    let totalActualMinutes = 0;
    
    // Accumulator for total estimated minutes (for time tracking accuracy)
    // Moved here to avoid redundant O(n) filter after main loop
    let allTasksEstimateTotal = 0;

    // Single pass through all tasks
    for (const t of allTasks) {
        // Completion counting
        if (t.isCompleted) {
            completedTasks++;
        }

        // Priority distribution
        const priority = t.priority || "none";
        if (priority === "high") priorityDist.high++;
        else if (priority === "medium") priorityDist.medium++;
        else if (priority === "low") priorityDist.low++;
        else priorityDist.none++;

        // Due date precision distribution
        if (!t.dueDate) {
            duePrecisionDist.none++;
        } else if (t.dueDatePrecision && t.dueDatePrecision !== "day") {
            duePrecisionDist[t.dueDatePrecision] += 1;
        } else {
            duePrecisionDist.day++;
        }

        // Energy level stats
        if (t.energyLevel === "high") {
            energyStats.high++;
            if (t.isCompleted) energyCompleted.high++;
        } else if (t.energyLevel === "medium") {
            energyStats.medium++;
            if (t.isCompleted) energyCompleted.medium++;
        } else if (t.energyLevel === "low") {
            energyStats.low++;
            if (t.isCompleted) energyCompleted.low++;
        }

        // Time tracking averages (for tasks with both estimate and actual)
        if (t.estimateMinutes && t.actualMinutes) {
            timeTrackingCount++;
            totalEstimateMinutes += t.estimateMinutes;
            totalActualMinutes += t.actualMinutes;
        }
        
        // Total estimated minutes (for accuracy calculation)
        if (t.estimateMinutes) {
            allTasksEstimateTotal += t.estimateMinutes;
        }

        // Date-based aggregations (only for last 90 days to cover heatmap + 30-day chart)
        const createdAt = new Date(t.createdAt);
        if (createdAt.getTime() >= ninetyDaysAgoTime) {
            const dateKey = format(createdAt, "yyyy-MM-dd");
            createdByDate.set(dateKey, (createdByDate.get(dateKey) || 0) + 1);
        }

        if (t.isCompleted && t.completedAt) {
            const completedAt = new Date(t.completedAt);
            
            // Productivity by day of week (all completed tasks)
            productivityByDay[completedAt.getDay()]++;
            
            // Heatmap & chart data (last 90 days only)
            if (completedAt.getTime() >= ninetyDaysAgoTime) {
                const dateKey = format(completedAt, "yyyy-MM-dd");
                completedByDate.set(dateKey, (completedByDate.get(dateKey) || 0) + 1);
            }
        }
    }

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const avgEstimate = timeTrackingCount > 0 ? Math.round(totalEstimateMinutes / timeTrackingCount) : 0;
    const avgActual = timeTrackingCount > 0 ? Math.round(totalActualMinutes / timeTrackingCount) : 0;

    // Build tasksOverTime array (last 30 days) using pre-computed hash maps - O(30) lookups
    const tasksOverTime: { date: string; created: number; completed: number }[] = [];
    for (let i = 29; i >= 0; i--) {
        const day = subDays(now, i);
        const dateKey = format(day, "yyyy-MM-dd");
        tasksOverTime.push({
            date: format(day, "MMM d"),
            created: createdByDate.get(dateKey) || 0,
            completed: completedByDate.get(dateKey) || 0,
        });
    }

    // Build heatmapData array (last 90 days) using pre-computed hash maps - O(90) lookups
    const heatmapData: { date: string; count: number; level: number }[] = [];
    for (let i = 89; i >= 0; i--) {
        const day = subDays(now, i);
        const dateKey = format(day, "yyyy-MM-dd");
        const count = completedByDate.get(dateKey) || 0;
        
        // Level 0-4 based on count
        let level = 0;
        if (count > 0) level = 1;
        if (count > 3) level = 2;
        if (count > 6) level = 3;
        if (count > 10) level = 4;

        heatmapData.push({ date: dateKey, count, level });
    }

    // Time tracking from timeEntries (last 30 days) - wrapped in try-catch for graceful degradation
    let timeTracking = {
        totalTrackedMinutes: 0,
        totalEstimatedMinutes: 0,
        accuracyPercent: 0,
        entriesCount: 0,
        dailyTracked: [] as { date: string; minutes: number; formatted: string }[],
    };

    try {
        const thirtyDaysAgo = subDays(now, 30);
        // Perf: select only columns used in aggregation (duration + timestamp).
        const allTimeEntries = await db
            .select({
                durationMinutes: timeEntries.durationMinutes,
                startedAt: timeEntries.startedAt,
            })
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.userId, userId),
                    gte(timeEntries.startedAt, thirtyDaysAgo)
                )
            )
            .orderBy(desc(timeEntries.startedAt));

        // PERF: Single-pass aggregation for time entries.
        // Original code did 7 × O(n) filtering (one per day). This reduces to O(n) with hash map.
        // For users with 500+ time entries, this is ~7x faster.
        let totalTrackedMinutes = 0;
        const minutesByDate = new Map<string, number>();
        
        for (const entry of allTimeEntries) {
            const duration = entry.durationMinutes || 0;
            totalTrackedMinutes += duration;
            const dateKey = format(new Date(entry.startedAt), "yyyy-MM-dd");
            minutesByDate.set(dateKey, (minutesByDate.get(dateKey) || 0) + duration);
        }
        
        // Use pre-computed total from single-pass loop - avoids redundant O(n) filter
        const totalEstimatedMinutes = allTasksEstimateTotal;

        const accuracyPercent = totalEstimatedMinutes > 0
            ? Math.round((totalTrackedMinutes / totalEstimatedMinutes) * 100)
            : 0;

        // Daily tracked time (last 7 days) - O(7) lookups from pre-computed hash map
        const dailyTracked: { date: string; minutes: number; formatted: string }[] = [];
        for (let i = 6; i >= 0; i--) {
            const day = subDays(now, i);
            const dateKey = format(day, "yyyy-MM-dd");
            const minutes = minutesByDate.get(dateKey) || 0;

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const formatted = minutes > 0 ? (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`) : "0m";

            dailyTracked.push({
                date: format(day, "EEE"),
                minutes,
                formatted,
            });
        }

        timeTracking = {
            totalTrackedMinutes,
            totalEstimatedMinutes,
            accuracyPercent,
            entriesCount: allTimeEntries.length,
            dailyTracked,
        };
    } catch (error) {
        // timeEntries table may not exist yet - graceful degradation
        console.warn("Time tracking data unavailable:", error);
    }

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
        duePrecisionDist,
        energyStats,
        energyCompleted,
        productivityByDay,
        heatmapData,
        timeTracking,
    };
}
