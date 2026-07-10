import { db, taskLogs, ValidationError } from "./shared";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

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

  const limit = await rateLimit(`activity-log:create:${params.userId}`, 200, 3600);
  if (!limit.success) {
    throw new ValidationError("Rate limit exceeded. Please try again later.");
  }

  // 🛡️ Sentinel: Enforce input length limits to prevent DoS via excessive storage consumption.
  // Silently truncate since this is a non-critical helper and shouldn't crash the main application flow.
  let safeAction = params.action;
  if (safeAction && safeAction.length > 255) {
    safeAction = safeAction.substring(0, 255);
  }

  let safeDetails = params.details;
  if (safeDetails && safeDetails.length > 2000) {
    safeDetails = safeDetails.slice(0, 1985) + "... [TRUNCATED]";
  }

  await db.insert(taskLogs).values({
    ...params,
    action: safeAction,
    details: safeDetails,
  });
}
