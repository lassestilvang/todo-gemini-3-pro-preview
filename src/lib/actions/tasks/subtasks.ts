"use server";

import {
  db,
  tasks,
  taskLogs,
  eq,
  and,
  revalidatePath,
  type ActionResult,
  NotFoundError,
  ValidationError,
  withErrorHandling,
} from "../shared";
import { requireUser } from "@/lib/auth";
import { isValidId } from "./helpers";

async function getSubtasksImpl(taskId: number, userId: string) {
  const user = await requireUser(userId);

  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, taskId), eq(tasks.userId, user.id)))
    .orderBy(tasks.createdAt);
  return result;
}

export const getSubtasks = withErrorHandling(getSubtasksImpl);

async function createSubtaskImpl(
  parentId: number,
  userId: string,
  title: string,
  estimateMinutes?: number
) {
  const user = await requireUser(userId);

  const MAX_TITLE_LENGTH = 255;
  if (!title || title.trim().length === 0) {
    throw new ValidationError("Subtask title is required");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ValidationError(`Subtask title must be at most ${MAX_TITLE_LENGTH} characters`);
  }

  const parentTask = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, parentId), eq(tasks.userId, user.id)))
    .limit(1);

  if (parentTask.length === 0) {
    throw new NotFoundError("Parent task not found or access denied");
  }

  const subtask = await db.transaction(async (tx) => {
    const result = await tx
      .insert(tasks)
      .values({
        userId: user.id,
        title,
        parentId,
        listId: null,
        estimateMinutes: estimateMinutes || null,
      })
      .returning();

    const newSubtask = result[0];

    await tx.insert(taskLogs).values({
      userId: user.id,
      taskId: parentId,
      action: "subtask_created",
      details: `Subtask created: ${title}`,
    });

    return newSubtask;
  });

  revalidatePath("/", "layout");
  return subtask;
}

export const createSubtask: (
  parentId: number,
  userId: string,
  title: string,
  estimateMinutes?: number
) => Promise<ActionResult<typeof tasks.$inferSelect>> = withErrorHandling(createSubtaskImpl);

async function updateSubtaskImpl(id: number, userId: string, isCompleted: boolean) {
  const user = await requireUser(userId);

  if (!isValidId(id)) return;

  await db
    .update(tasks)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidatePath("/", "layout");
}

export const updateSubtask: (
  id: number,
  userId: string,
  isCompleted: boolean
) => Promise<ActionResult<void>> = withErrorHandling(updateSubtaskImpl);

async function deleteSubtaskImpl(id: number, userId: string) {
  const user = await requireUser(userId);

  if (!isValidId(id)) return;

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
  revalidatePath("/", "layout");
}

export const deleteSubtask: (
  id: number,
  userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteSubtaskImpl);
