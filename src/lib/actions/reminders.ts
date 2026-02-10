/**
 * @module actions/reminders
 * @description Server Actions for reminder management including CRUD operations.
 * Reminders are used to notify users about upcoming task deadlines.
 */
"use server";

import {
  db,
  tasks,
  reminders,
  taskLogs,
  eq,
  and,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  NotFoundError,
} from "./shared";
import { requireUser } from "@/lib/auth";
import { createReminderSchema } from "@/lib/validation/reminders";

/**
 * Retrieves all reminders for a specific task.
 *
 * @param taskId - The ID of the task whose reminders to retrieve
 * @param userId - The ID of the user requesting the reminders
 * @returns Array of reminders for the task, or empty if access denied
 */
export async function getReminders(taskId: number, userId: string) {
  await requireUser(userId);

  // By joining with the tasks table, we can verify ownership and fetch
  // reminders in a single database query.
  return await db
    .select({
      id: reminders.id,
      taskId: reminders.taskId,
      remindAt: reminders.remindAt,
      isSent: reminders.isSent,
      createdAt: reminders.createdAt,
    })
    .from(reminders)
    .innerJoin(tasks, eq(reminders.taskId, tasks.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

/**
 * Internal implementation for creating a new reminder.
 *
 * @param userId - The ID of the user creating the reminder
 * @param taskId - The ID of the task to add the reminder to
 * @param remindAt - The date/time when the reminder should trigger
 * @throws {ValidationError} When required fields are missing
 */
async function createReminderImpl(userId: string, taskId: number, remindAt: Date) {
  await requireUser(userId);

  createReminderSchema.parse({ userId, taskId, remindAt });

  // Validate task ownership to prevent IDOR
  const task = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (task.length === 0) {
    throw new NotFoundError("Task not found or access denied");
  }

  await db.insert(reminders).values({
    taskId,
    remindAt,
  });

  await db.insert(taskLogs).values({
    userId,
    taskId,
    action: "reminder_added",
    details: `Reminder set for ${remindAt.toLocaleString()}`,
  });

  revalidatePath("/");
}

/**
 * Creates a new reminder for a task.
 *
 * @param userId - The ID of the user creating the reminder
 * @param taskId - The ID of the task to add the reminder to
 * @param remindAt - The date/time when the reminder should trigger
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When required fields are missing
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const createReminder: (
  userId: string,
  taskId: number,
  remindAt: Date
) => Promise<ActionResult<void>> = withErrorHandling(createReminderImpl);

/**
 * Internal implementation for deleting a reminder.
 *
 * @param userId - The ID of the user deleting the reminder
 * @param id - The reminder ID to delete
 */
async function deleteReminderImpl(userId: string, id: number) {
  await requireUser(userId);

  // Get reminder to log it before deleting and verify ownership
  const reminder = await db
    .select({
      id: reminders.id,
      taskId: reminders.taskId,
      remindAt: reminders.remindAt,
    })
    .from(reminders)
    .innerJoin(tasks, eq(reminders.taskId, tasks.id))
    .where(and(eq(reminders.id, id), eq(tasks.userId, userId)))
    .limit(1);

  if (reminder.length === 0) {
    throw new NotFoundError("Reminder not found or access denied");
  }

  await db.insert(taskLogs).values({
    userId,
    taskId: reminder[0].taskId,
    action: "reminder_removed",
    details: `Reminder removed for ${reminder[0].remindAt.toLocaleString()}`,
  });

  await db.delete(reminders).where(eq(reminders.id, id));
  revalidatePath("/");
}

/**
 * Deletes a reminder.
 *
 * @param userId - The ID of the user deleting the reminder
 * @param id - The reminder ID to delete
 * @returns ActionResult with void on success or error
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const deleteReminder: (
  userId: string,
  id: number
) => Promise<ActionResult<void>> = withErrorHandling(deleteReminderImpl);
