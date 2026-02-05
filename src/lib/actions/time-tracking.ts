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
    sql,
    isNull,
    revalidatePath,
    withErrorHandling,
    ValidationError,
    NotFoundError,
    type ActionResult,
} from "./shared";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { createManualTimeEntrySchema, updateTimeEntrySchema, getTimeStatsSchema } from "@/lib/validation/time-tracking";

// ============================================================================
// Time Entry CRUD Operations
// ============================================================================

async function updateTaskActualMinutes(taskId: number, userId: string) {
    // ⚡ Bolt Opt: Shared aggregation keeps time tracking updates consistent and avoids duplicated queries.
    const [sumResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${timeEntries.durationMinutes}), 0)` })
        .from(timeEntries)
        .where(
            and(
                eq(timeEntries.taskId, taskId),
                eq(timeEntries.userId, userId),
                sql`${timeEntries.endedAt} IS NOT NULL`
            )
        );

    const totalMinutes = Number(sumResult.total);

    await db
        .update(tasks)
        .set({ actualMinutes: totalMinutes })
        .where(
            and(
                eq(tasks.id, taskId),
                eq(tasks.userId, userId)
            )
        );

    return totalMinutes;
}

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
        await requireUser(userId);
        await rateLimit(`${userId}:time-tracking`, 20, 60);

        // Ensure task belongs to user
        const [task] = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
            .limit(1);

        if (!task) {
            throw new NotFoundError("Task not found");
        }

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
            throw new ValidationError("A time entry is already active for this task");
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
        return entry;

    })();
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
        await requireUser(userId);

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
            throw new NotFoundError("Time entry not found");
        }

        if (existing.endedAt) {
            throw new ValidationError("Time entry is already stopped");
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

        // ⚡ Bolt Opt: Replace O(N) fetch-and-sum in memory with O(1) SQL aggregation.
        // For tasks with many sessions, this avoids transferring the entire history to calculate one number.
        await updateTaskActualMinutes(existing.taskId, userId);

        revalidatePath("/");
        return entry;
    })();
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
        await requireUser(userId);

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

        return entry || null;
    })();
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
        await requireUser(userId);

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

        return entries;
    })();
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
        await requireUser(userId);
        await rateLimit(`${userId}:time-tracking`, 20, 60);

        // Ensure task belongs to user
        const [task] = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
            .limit(1);

        if (!task) {
            throw new NotFoundError("Task not found");
        }

        const validated = createManualTimeEntrySchema.parse({
            taskId,
            userId,
            durationMinutes,
            date,
            notes
        });
        const startedAt = validated.date || new Date();
        const endedAt = new Date(startedAt.getTime() + validated.durationMinutes * 60000);

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

        // ⚡ Bolt Opt: Replace O(N) fetch-and-sum in memory with O(1) SQL aggregation.
        await updateTaskActualMinutes(taskId, userId);

        revalidatePath("/");
        return entry;
    })();
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
        await requireUser(userId);
        const validatedData = updateTimeEntrySchema.parse(data);

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
            throw new NotFoundError("Time entry not found");
        }

        const [entry] = await db
            .update(timeEntries)
            .set(validatedData)
            .where(eq(timeEntries.id, entryId))
            .returning();

        // ⚡ Bolt Opt: Replace O(N) fetch-and-sum in memory with O(1) SQL aggregation.
        await updateTaskActualMinutes(existing.taskId, userId);

        revalidatePath("/");
        return entry;
    })();
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
        await requireUser(userId);

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
            throw new NotFoundError("Time entry not found");
        }

        await db.delete(timeEntries).where(eq(timeEntries.id, entryId));

        // ⚡ Bolt Opt: Replace O(N) fetch-and-sum in memory with O(1) SQL aggregation.
        await updateTaskActualMinutes(existing.taskId, userId);

        revalidatePath("/");
        return { deleted: true };
    })();
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
        await requireUser(userId);
        const { dateRange: validatedDateRange } = getTimeStatsSchema.parse({ userId, dateRange });

        // ⚡ Bolt Opt: Use SQL aggregations to calculate stats instead of loading all entries into memory.
        // This scales O(1) with data size for the application layer.
        const whereConditions = [eq(timeEntries.userId, userId)];
        if (validatedDateRange) {
            whereConditions.push(
                gte(timeEntries.startedAt, validatedDateRange.from),
                lte(timeEntries.startedAt, validatedDateRange.to)
            );
        }

        const [statsResult] = await db
            .select({
                totalMinutes: sql<number>`COALESCE(SUM(${timeEntries.durationMinutes}), 0)`,
                count: sql<number>`COUNT(*)`,
                avgMinutes: sql<number>`COALESCE(AVG(${timeEntries.durationMinutes}), 0)`,
            })
            .from(timeEntries)
            .where(and(...whereConditions, sql`${timeEntries.durationMinutes} IS NOT NULL`));

        // Grouped task breakdown in a single query
        const taskBreakdown = await db
            .select({
                taskId: timeEntries.taskId,
                title: tasks.title,
                totalMinutes: sql<number>`CAST(SUM(${timeEntries.durationMinutes}) AS INTEGER)`,
            })
            .from(timeEntries)
            .innerJoin(tasks, eq(timeEntries.taskId, tasks.id))
            .where(and(...whereConditions, sql`${timeEntries.durationMinutes} IS NOT NULL`))
            .groupBy(timeEntries.taskId, tasks.title)
            .orderBy(desc(sql`SUM(${timeEntries.durationMinutes})`));

        return {
            totalTrackedMinutes: Number(statsResult.totalMinutes),
            entriesCount: Number(statsResult.count),
            averageSessionMinutes: Math.round(Number(statsResult.avgMinutes)),
            taskBreakdown: taskBreakdown.map(t => ({
                ...t,
                totalMinutes: Number(t.totalMinutes)
            })),
        };
    })();
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
        await requireUser(userId);

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
            throw new NotFoundError("Task not found");
        }

        revalidatePath("/");
        return task;

    })();
}
