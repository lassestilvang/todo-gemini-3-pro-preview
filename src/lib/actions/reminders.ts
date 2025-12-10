/**
 * @module actions/reminders
 * @description Server Actions for reminder management including CRUD operations.
 * Reminders are used to notify users about upcoming task deadlines.
 */
"use server";

import {
  db,
  reminders,
  taskLogs,
  eq,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
} from "./shared";

/**
 * Retrieves all reminders for a specific task.
 *
 * @param taskId - The ID of the task whose reminders to retrieve
 * @returns Array of reminders for the task
 */
export async function getReminders(taskId: number) {
  return await db.select().from(reminders).where(eq(reminders.taskId, taskId));
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
  if (!userId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }
  if (!taskId) {
    throw new ValidationError("Task ID is required", { taskId: "Task ID cannot be empty" });
  }
  if (!remindAt) {
    throw new ValidationError("Reminder time is required", { remindAt: "Reminder time cannot be empty" });
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
  // Get reminder to log it before deleting
  const reminder = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
  if (reminder.length > 0) {
    await db.insert(taskLogs).values({
      userId,
      taskId: reminder[0].taskId,
      action: "reminder_removed",
      details: `Reminder removed for ${reminder[0].remindAt.toLocaleString()}`,
    });
  }

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
