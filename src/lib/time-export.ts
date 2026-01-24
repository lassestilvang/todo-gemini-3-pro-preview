"use server";

import { db, tasks, timeEntries } from "@/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { format, startOfDay, endOfDay } from "date-fns";

interface TimeEntry {
    id: number;
    taskId: number;
    taskTitle: string;
    startedAt: Date;
    endedAt: Date | null;
    durationMinutes: number | null;
    notes: string | null;
    isManual: boolean;
}

interface ExportOptions {
    format: "json" | "csv";
    startDate?: Date;
    endDate?: Date;
    taskId?: number;
    includeTaskDetails?: boolean;
}

export async function exportTimeData(userId: string, options: ExportOptions) {
    if (!userId) {
        return { success: false, error: "User not authenticated" };
    }

    const { format: exportFormat, startDate, endDate, taskId, includeTaskDetails = true } = options;

    // Build query conditions
    const conditions = [eq(timeEntries.userId, userId)];

    if (startDate) {
        conditions.push(gte(timeEntries.startedAt, startOfDay(startDate)));
    }
    if (endDate) {
        conditions.push(lte(timeEntries.startedAt, endOfDay(endDate)));
    }
    if (taskId) {
        conditions.push(eq(timeEntries.taskId, taskId));
    }

    // Fetch time entries
    const entries = await db
        .select({
            id: timeEntries.id,
            taskId: timeEntries.taskId,
            startedAt: timeEntries.startedAt,
            endedAt: timeEntries.endedAt,
            durationMinutes: timeEntries.durationMinutes,
            notes: timeEntries.notes,
            isManual: timeEntries.isManual,
        })
        .from(timeEntries)
        .where(and(...conditions))
        .orderBy(desc(timeEntries.startedAt));

    // Fetch task titles if needed
    const taskMap: Map<number, string> = new Map();
    if (includeTaskDetails) {
        const taskIds = [...new Set(entries.map(e => e.taskId))];
        if (taskIds.length > 0) {
            const taskRows = await db
                .select({ id: tasks.id, title: tasks.title })
                .from(tasks)
                .where(eq(tasks.userId, userId));
            taskRows.forEach(t => taskMap.set(t.id, t.title));
        }
    }

    // Format entries
    const formattedEntries: TimeEntry[] = entries.map(e => ({
        id: e.id,
        taskId: e.taskId,
        taskTitle: taskMap.get(e.taskId) || `Task #${e.taskId}`,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        durationMinutes: e.durationMinutes,
        notes: e.notes,
        isManual: e.isManual ?? false,
    }));

    // Calculate summary
    const totalMinutes = formattedEntries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (exportFormat === "json") {
        return {
            success: true,
            data: JSON.stringify({
                exportedAt: new Date().toISOString(),
                summary: {
                    totalEntries: formattedEntries.length,
                    totalTime: `${hours}h ${minutes}m`,
                    totalMinutes,
                    dateRange: {
                        start: startDate?.toISOString() || "all",
                        end: endDate?.toISOString() || "all",
                    },
                },
                entries: formattedEntries.map(e => ({
                    ...e,
                    startedAt: e.startedAt.toISOString(),
                    endedAt: e.endedAt?.toISOString() || null,
                })),
            }, null, 2),
            filename: `time-tracking-${format(new Date(), "yyyy-MM-dd")}.json`,
            mimeType: "application/json",
        };
    }

    // CSV format
    const headers = ["Date", "Task", "Start Time", "End Time", "Duration (min)", "Duration", "Notes", "Manual"];
    const rows = formattedEntries.map(e => {
        const duration = e.durationMinutes || 0;
        const durationFormatted = `${Math.floor(duration / 60)}h ${duration % 60}m`;
        return [
            format(e.startedAt, "yyyy-MM-dd"),
            `"${e.taskTitle.replace(/"/g, '""')}"`,
            format(e.startedAt, "HH:mm"),
            e.endedAt ? format(e.endedAt, "HH:mm") : "-",
            duration.toString(),
            durationFormatted,
            e.notes ? `"${e.notes.replace(/"/g, '""')}"` : "",
            e.isManual ? "Yes" : "No",
        ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return {
        success: true,
        data: csvContent,
        filename: `time-tracking-${format(new Date(), "yyyy-MM-dd")}.csv`,
        mimeType: "text/csv",
    };
}

// Get time entries for a specific date range (for UI display)
export async function getTimeEntriesForRange(
    userId: string,
    startDate: Date,
    endDate: Date
) {
    if (!userId) {
        return [];
    }

    const entries = await db
        .select()
        .from(timeEntries)
        .where(
            and(
                eq(timeEntries.userId, userId),
                gte(timeEntries.startedAt, startOfDay(startDate)),
                lte(timeEntries.startedAt, endOfDay(endDate))
            )
        )
        .orderBy(desc(timeEntries.startedAt));

    // Get task titles
    const taskIds = [...new Set(entries.map(e => e.taskId))];
    const taskMap = new Map<number, string>();

    if (taskIds.length > 0) {
        const taskRows = await db
            .select({ id: tasks.id, title: tasks.title })
            .from(tasks)
            .where(eq(tasks.userId, userId));
        taskRows.forEach(t => taskMap.set(t.id, t.title));
    }

    return entries.map(e => ({
        ...e,
        taskTitle: taskMap.get(e.taskId) || `Task #${e.taskId}`,
    }));
}
