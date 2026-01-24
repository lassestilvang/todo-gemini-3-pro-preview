/**
 * @module actions/time-tracking
 * @description Server Actions for time tracking including starting, stopping,
 * and managing time entries for tasks.
 */
"use server";

import {
    db,
    tasks,
    timeEntries,
    eq,
    and,
    desc,
    gte,
    lte,
    isNull,
    revalidatePath,
    success,
    failure,
    withErrorHandling,
    type ActionResult,
} from "./shared";
import { rateLimit } from "@/lib/rate-limit";

// ============================================================================
// Time Entry CRUD Operations
// ============================================================================

/**
 * Start a new time entry for a task.
 * 
 * @param taskId - The task ID to track time for
 * @param userId - The ID of the user
 * @returns The created time entry
 */
export async function startTimeEntry(
    taskId: number,
    userId: string
): Promise<ActionResult<typeof timeEntries.$inferSelect>> {
    return withErrorHandling(async () => {
        await rateLimit(userId, "time-tracking", 100);

        // Check if there's already an active entry for this task
        const existingActive = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, taskId),
                    eq(timeEntries.userId, userId),
                    isNull(timeEntries.endedAt)
                )
            )
            .limit(1);

        if (existingActive.length > 0) {
            return failure({
                code: "VALIDATION_ERROR",
                message: "A time entry is already active for this task",
            });
        }

        const [entry] = await db
            .insert(timeEntries)
            .values({
                taskId,
                userId,
                startedAt: new Date(),
                isManual: false,
            })
            .returning();

        revalidatePath("/");
        return success(entry);
    }, "startTimeEntry");
}

/**
 * Stop an active time entry.
 * 
 * @param entryId - The time entry ID to stop
 * @param userId - The ID of the user who owns the entry
 * @returns The updated time entry
 */
export async function stopTimeEntry(
    entryId: number,
    userId: string
): Promise<ActionResult<typeof timeEntries.$inferSelect>> {
    return withErrorHandling(async () => {
        const [existing] = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.id, entryId),
                    eq(timeEntries.userId, userId)
                )
            )
            .limit(1);

        if (!existing) {
            return failure({
                code: "NOT_FOUND",
                message: "Time entry not found",
            });
        }

        if (existing.endedAt) {
            return failure({
                code: "VALIDATION_ERROR",
                message: "Time entry is already stopped",
            });
        }

        const endedAt = new Date();
        const durationMinutes = Math.round(
            (endedAt.getTime() - existing.startedAt.getTime()) / 60000
        );

        const [entry] = await db
            .update(timeEntries)
            .set({
                endedAt,
                durationMinutes,
            })
            .where(eq(timeEntries.id, entryId))
            .returning();

        // Update the task's actualMinutes
        const allEntries = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, existing.taskId),
                    eq(timeEntries.userId, userId)
                )
            );

        const totalMinutes = allEntries.reduce(
            (sum, e) => sum + (e.durationMinutes || 0),
            0
        );

        await db
            .update(tasks)
            .set({ actualMinutes: totalMinutes })
            .where(
                and(
                    eq(tasks.id, existing.taskId),
                    eq(tasks.userId, userId)
                )
            );

        revalidatePath("/");
        return success(entry);
    }, "stopTimeEntry");
}

/**
 * Get the active time entry for a task (if any).
 * 
 * @param taskId - The task ID
 * @param userId - The ID of the user
 * @returns The active time entry or null
 */
export async function getActiveTimeEntry(
    taskId: number,
    userId: string
): Promise<ActionResult<typeof timeEntries.$inferSelect | null>> {
    return withErrorHandling(async () => {
        const [entry] = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, taskId),
                    eq(timeEntries.userId, userId),
                    isNull(timeEntries.endedAt)
                )
            )
            .limit(1);

        return success(entry || null);
    }, "getActiveTimeEntry");
}

/**
 * Get all time entries for a task.
 * 
 * @param taskId - The task ID
 * @param userId - The ID of the user
 * @returns Array of time entries
 */
export async function getTimeEntries(
    taskId: number,
    userId: string
): Promise<ActionResult<Array<typeof timeEntries.$inferSelect>>> {
    return withErrorHandling(async () => {
        const entries = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, taskId),
                    eq(timeEntries.userId, userId)
                )
            )
            .orderBy(desc(timeEntries.startedAt));

        return success(entries);
    }, "getTimeEntries");
}

/**
 * Create a manual time entry.
 * 
 * @param taskId - The task ID
 * @param userId - The user ID
 * @param durationMinutes - Duration in minutes
 * @param date - The date of the entry (defaults to today)
 * @param notes - Optional notes
 * @returns The created time entry
 */
export async function createManualTimeEntry(
    taskId: number,
    userId: string,
    durationMinutes: number,
    date?: Date,
    notes?: string
): Promise<ActionResult<typeof timeEntries.$inferSelect>> {
    return withErrorHandling(async () => {
        await rateLimit(userId, "time-tracking", 100);

        const startedAt = date || new Date();
        const endedAt = new Date(startedAt.getTime() + durationMinutes * 60000);

        const [entry] = await db
            .insert(timeEntries)
            .values({
                taskId,
                userId,
                startedAt,
                endedAt,
                durationMinutes,
                notes,
                isManual: true,
            })
            .returning();

        // Update the task's actualMinutes
        const allEntries = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, taskId),
                    eq(timeEntries.userId, userId)
                )
            );

        const totalMinutes = allEntries.reduce(
            (sum, e) => sum + (e.durationMinutes || 0),
            0
        );

        await db
            .update(tasks)
            .set({ actualMinutes: totalMinutes })
            .where(
                and(
                    eq(tasks.id, taskId),
                    eq(tasks.userId, userId)
                )
            );

        revalidatePath("/");
        return success(entry);
    }, "createManualTimeEntry");
}

/**
 * Update an existing time entry.
 * 
 * @param entryId - The time entry ID
 * @param userId - The user ID
 * @param data - The data to update
 * @returns The updated time entry
 */
export async function updateTimeEntry(
    entryId: number,
    userId: string,
    data: {
        durationMinutes?: number;
        notes?: string;
        startedAt?: Date;
        endedAt?: Date;
    }
): Promise<ActionResult<typeof timeEntries.$inferSelect>> {
    return withErrorHandling(async () => {
        const [existing] = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.id, entryId),
                    eq(timeEntries.userId, userId)
                )
            )
            .limit(1);

        if (!existing) {
            return failure({
                code: "NOT_FOUND",
                message: "Time entry not found",
            });
        }

        const [entry] = await db
            .update(timeEntries)
            .set(data)
            .where(eq(timeEntries.id, entryId))
            .returning();

        // Recalculate task's actualMinutes
        const allEntries = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, existing.taskId),
                    eq(timeEntries.userId, userId)
                )
            );

        const totalMinutes = allEntries.reduce(
            (sum, e) => sum + (e.durationMinutes || 0),
            0
        );

        await db
            .update(tasks)
            .set({ actualMinutes: totalMinutes })
            .where(
                and(
                    eq(tasks.id, existing.taskId),
                    eq(tasks.userId, userId)
                )
            );

        revalidatePath("/");
        return success(entry);
    }, "updateTimeEntry");
}

/**
 * Delete a time entry.
 * 
 * @param entryId - The time entry ID
 * @param userId - The user ID
 * @returns Success status
 */
export async function deleteTimeEntry(
    entryId: number,
    userId: string
): Promise<ActionResult<{ deleted: boolean }>> {
    return withErrorHandling(async () => {
        const [existing] = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.id, entryId),
                    eq(timeEntries.userId, userId)
                )
            )
            .limit(1);

        if (!existing) {
            return failure({
                code: "NOT_FOUND",
                message: "Time entry not found",
            });
        }

        await db.delete(timeEntries).where(eq(timeEntries.id, entryId));

        // Recalculate task's actualMinutes
        const allEntries = await db
            .select()
            .from(timeEntries)
            .where(
                and(
                    eq(timeEntries.taskId, existing.taskId),
                    eq(timeEntries.userId, userId)
                )
            );

        const totalMinutes = allEntries.reduce(
            (sum, e) => sum + (e.durationMinutes || 0),
            0
        );

        await db
            .update(tasks)
            .set({ actualMinutes: totalMinutes })
            .where(
                and(
                    eq(tasks.id, existing.taskId),
                    eq(tasks.userId, userId)
                )
            );

        revalidatePath("/");
        return success({ deleted: true });
    }, "deleteTimeEntry");
}

// ============================================================================
// Time Statistics
// ============================================================================

/**
 * Get time tracking statistics for a user.
 * 
 * @param userId - The user ID
 * @param dateRange - Optional date range filter
 * @returns Time tracking statistics
 */
export async function getTimeStats(
    userId: string,
    dateRange?: { from: Date; to: Date }
): Promise<ActionResult<{
    totalTrackedMinutes: number;
    entriesCount: number;
    averageSessionMinutes: number;
    taskBreakdown: Array<{ taskId: number; title: string; totalMinutes: number }>;
}>> {
    return withErrorHandling(async () => {
        let query = db
            .select()
            .from(timeEntries)
            .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
            .where(eq(timeEntries.userId, userId));

        if (dateRange) {
            query = db
                .select()
                .from(timeEntries)
                .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
                .where(
                    and(
                        eq(timeEntries.userId, userId),
                        gte(timeEntries.startedAt, dateRange.from),
                        lte(timeEntries.startedAt, dateRange.to)
                    )
                );
        }

        const entries = await query;

        const totalTrackedMinutes = entries.reduce(
            (sum, e) => sum + (e.time_entries.durationMinutes || 0),
            0
        );

        const completedEntries = entries.filter(e => e.time_entries.durationMinutes);
        const averageSessionMinutes = completedEntries.length > 0
            ? Math.round(totalTrackedMinutes / completedEntries.length)
            : 0;

        // Group by task
        const taskMap = new Map<number, { title: string; totalMinutes: number }>();
        for (const entry of entries) {
            const existing = taskMap.get(entry.tasks.id);
            if (existing) {
                existing.totalMinutes += entry.time_entries.durationMinutes || 0;
            } else {
                taskMap.set(entry.tasks.id, {
                    title: entry.tasks.title,
                    totalMinutes: entry.time_entries.durationMinutes || 0,
                });
            }
        }

        const taskBreakdown = Array.from(taskMap.entries())
            .map(([taskId, data]) => ({ taskId, ...data }))
            .sort((a, b) => b.totalMinutes - a.totalMinutes);

        return success({
            totalTrackedMinutes,
            entriesCount: entries.length,
            averageSessionMinutes,
            taskBreakdown,
        });
    }, "getTimeStats");
}

/**
 * Update a task's time estimate.
 * 
 * @param taskId - The task ID
 * @param userId - The user ID  
 * @param estimateMinutes - The new estimate in minutes
 * @returns The updated task
 */
export async function updateTaskEstimate(
    taskId: number,
    userId: string,
    estimateMinutes: number | null
): Promise<ActionResult<typeof tasks.$inferSelect>> {
    return withErrorHandling(async () => {
        const [task] = await db
            .update(tasks)
            .set({ estimateMinutes })
            .where(
                and(
                    eq(tasks.id, taskId),
                    eq(tasks.userId, userId)
                )
            )
            .returning();

        if (!task) {
            return failure({
                code: "NOT_FOUND",
                message: "Task not found",
            });
        }

        revalidatePath("/");
        return success(task);
    }, "updateTaskEstimate");
}
