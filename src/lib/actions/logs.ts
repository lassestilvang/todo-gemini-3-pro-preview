/**
 * @module actions/logs
 * @description Server Actions for activity log retrieval.
 * Logs track all changes made to tasks for audit and history purposes.
 */
"use server";

import { db, tasks, taskLogs, eq, desc, sql } from "./shared";

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
 * Retrieves recent activity log for a user across all tasks.
 *
 * @param userId - The ID of the user whose activity to retrieve
 * @returns Array of activity log entries with task titles, limited to 50 most recent
 */
export async function getActivityLog(userId: string) {
  return await db
    .select({
      id: taskLogs.id,
      taskId: taskLogs.taskId,
      taskTitle: sql<string>`COALESCE(${tasks.title}, 'Unknown Task')`.as("task_title"),
      action: taskLogs.action,
      details: taskLogs.details,
      createdAt: taskLogs.createdAt,
    })
    .from(taskLogs)
    .leftJoin(tasks, eq(taskLogs.taskId, tasks.id))
    .where(eq(taskLogs.userId, userId))
    .orderBy(desc(taskLogs.createdAt))
    .limit(50);
}
