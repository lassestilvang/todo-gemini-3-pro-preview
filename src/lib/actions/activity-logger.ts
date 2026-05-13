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

  // Truncate details to prevent excessively large payload insertion
  const truncatedDetails = params.details && params.details.length > 5000
    ? params.details.substring(0, 5000)
    : params.details;

  await db.insert(taskLogs).values({
    ...params,
    details: truncatedDetails
  });
}
