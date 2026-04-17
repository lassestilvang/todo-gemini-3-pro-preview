import { db, taskLogs } from "./shared";
import { requireUser } from "@/lib/auth";

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
  await requireUser(params.userId);
  await db.insert(taskLogs).values(params);
}
