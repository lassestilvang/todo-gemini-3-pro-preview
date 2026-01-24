/**
 * @module actions/logs
 * @description Server Actions for activity log retrieval.
 * Logs track all changes made to tasks for audit and history purposes.
 */
"use server";

import { db, tasks, lists, labels, taskLogs, eq, desc, sql, and, asc, gte, lte, or, type SQL } from "./shared";

/**
 * Retrieves all logs for a specific task.
 *
 * @param taskId - The ID of the task whose logs to retrieve
 * @returns Array of task logs ordered by creation date (newest first)
 */
export async function getTaskLogs(taskId: number) {
  return await db
    .select()
    .from(taskLogs)
    .where(eq(taskLogs.taskId, taskId))
    .orderBy(desc(taskLogs.createdAt), desc(taskLogs.id));
}

/**
 * Retrieves recent activity log for a user with optional filtering.
 *
 * @param userId - The ID of the user whose activity to retrieve
 * @param filters - Optional filters: type, search, date range
 * @returns Array of activity log entries
 */
export async function getActivityLog(
  userId: string,
  filters?: {
    type?: "task" | "list" | "label" | "all";
    query?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const whereConditions: SQL[] = [eq(taskLogs.userId, userId)];

  if (filters?.type && filters.type !== "all") {
    if (filters.type === "task") whereConditions.push(sql`${taskLogs.taskId} IS NOT NULL`);
    if (filters.type === "list") whereConditions.push(sql`${taskLogs.listId} IS NOT NULL`);
    if (filters.type === "label") whereConditions.push(sql`${taskLogs.labelId} IS NOT NULL`);
  }

  if (filters?.from) whereConditions.push(gte(taskLogs.createdAt, filters.from));
  if (filters?.to) whereConditions.push(lte(taskLogs.createdAt, filters.to));

  if (filters?.query) {
    const searchTerm = `%${filters.query}%`;
    whereConditions.push(
      or(
        sql`${tasks.title} ILIKE ${searchTerm}`,
        sql`${lists.name} ILIKE ${searchTerm}`,
        sql`${labels.name} ILIKE ${searchTerm}`,
        sql`${taskLogs.details} ILIKE ${searchTerm}`
      ) as SQL
    );
  }

  return await db
    .select({
      id: taskLogs.id,
      taskId: taskLogs.taskId,
      taskTitle: tasks.title,
      listId: taskLogs.listId,
      listName: lists.name,
      listSlug: lists.slug,
      labelId: taskLogs.labelId,
      labelName: labels.name,
      action: taskLogs.action,
      details: taskLogs.details,
      createdAt: taskLogs.createdAt,
    })
    .from(taskLogs)
    .leftJoin(tasks, eq(taskLogs.taskId, tasks.id))
    .leftJoin(lists, eq(taskLogs.listId, lists.id))
    .leftJoin(labels, eq(taskLogs.labelId, labels.id))
    .where(and(...whereConditions))
    .orderBy(desc(taskLogs.createdAt))
    .limit(filters?.limit ?? 100)
    .offset(filters?.offset ?? 0);
}
/**
 * Retrieves recenet occupancy/completion history for the heatmap.
 * 
 * @param userId - The ID of the user whose completion history to retrieve
 * @returns Array of completion counts grouped by date
 */
export async function getCompletionHistory(userId: string) {
  return await db
    .select({
      date: sql<string>`DATE(${taskLogs.createdAt})`.as("date"),
      count: sql<number>`CAST(COUNT(*) AS INT)`.as("count"),
    })
    .from(taskLogs)
    .where(and(eq(taskLogs.userId, userId), eq(taskLogs.action, "completed")))
    .groupBy(sql`DATE(${taskLogs.createdAt})`)
    .orderBy(asc(sql`DATE(${taskLogs.createdAt})`));
}
/**
 * Log an activity to the task_logs table.
 * 
 * @param params - Activity log details
 */
export async function logActivity(params: {
  userId: string;
  action: string;
  taskId?: number;
  listId?: number;
  labelId?: number;
  details?: string;
}) {
  await db.insert(taskLogs).values({
    userId: params.userId,
    action: params.action,
    taskId: params.taskId,
    listId: params.listId,
    labelId: params.labelId,
    details: params.details,
  });
}
