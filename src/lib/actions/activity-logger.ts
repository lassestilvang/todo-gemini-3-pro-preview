import { db, taskLogs } from "./shared";

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
