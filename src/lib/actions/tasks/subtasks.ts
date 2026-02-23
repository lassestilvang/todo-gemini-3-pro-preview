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
  withErrorHandling,
} from "../shared";
import { requireUser } from "@/lib/auth";
import { isValidId } from "./helpers";

async function getSubtasksImpl(taskId: number, userId: string) {
  await requireUser(userId);

  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, taskId), eq(tasks.userId, userId)))
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
  await requireUser(userId);

  const parentTask = await db
    .select({ id: tasks.id, userId: tasks.userId })
    .from(tasks)
    .where(eq(tasks.id, parentId))
    .limit(1);

  if (parentTask.length === 0 || parentTask[0].userId !== userId) {
    throw new NotFoundError("Parent task not found or access denied");
  }

  const result = await db
    .insert(tasks)
    .values({
      userId,
      title,
      parentId,
      listId: null,
      estimateMinutes: estimateMinutes || null,
    })
    .returning();

  const subtask = result[0];

  await db.insert(taskLogs).values({
    userId,
    taskId: parentId,
    action: "subtask_created",
    details: `Subtask created: ${title}`,
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
  await requireUser(userId);

  if (!isValidId(id)) return;

  await db
    .update(tasks)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  revalidatePath("/", "layout");
}

export const updateSubtask: (
  id: number,
  userId: string,
  isCompleted: boolean
) => Promise<ActionResult<void>> = withErrorHandling(updateSubtaskImpl);

async function deleteSubtaskImpl(id: number, userId: string) {
  await requireUser(userId);

  if (!isValidId(id)) return;

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  revalidatePath("/", "layout");
}

export const deleteSubtask: (
  id: number,
  userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteSubtaskImpl);
