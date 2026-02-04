/**
 * @module actions/dependencies
 * @description Server Actions for task dependency management.
 * Dependencies allow tasks to block other tasks until they are completed.
 */
"use server";

import {
  db,
  tasks,
  taskDependencies,
  taskLogs,
  eq,
  and,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
} from "./shared";
import { requireUser } from "@/lib/auth";

/**
 * Internal implementation for adding a dependency between tasks.
 *
 * @param userId - The ID of the user adding the dependency
 * @param taskId - The ID of the task that will be blocked
 * @param blockerId - The ID of the task that blocks
 * @throws {ValidationError} When task tries to block itself or circular dependency detected
 */
async function addDependencyImpl(userId: string, taskId: number, blockerId: number) {
  await requireUser(userId);

  if (taskId === blockerId) {
    throw new ValidationError("Task cannot block itself", {
      blockerId: "A task cannot be its own blocker",
    });
  }

  // Check for circular dependency (simple check: is blocker blocked by task?)
  const reverse = await db
    .select()
    .from(taskDependencies)
    .where(and(eq(taskDependencies.taskId, blockerId), eq(taskDependencies.blockerId, taskId)));

  if (reverse.length > 0) {
    throw new ValidationError("Circular dependency detected", {
      blockerId: "This would create a circular dependency",
    });
  }

  await db.insert(taskDependencies).values({
    taskId,
    blockerId,
  });

  await db.insert(taskLogs).values({
    userId,
    taskId,
    action: "dependency_added",
    details: `Blocked by task #${blockerId}`,
  });

  revalidatePath("/");
}

/**
 * Adds a dependency between tasks (blocker relationship).
 *
 * @param userId - The ID of the user adding the dependency
 * @param taskId - The ID of the task that will be blocked
 * @param blockerId - The ID of the task that blocks
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When task tries to block itself or circular dependency detected
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const addDependency: (
  userId: string,
  taskId: number,
  blockerId: number
) => Promise<ActionResult<void>> = withErrorHandling(addDependencyImpl);

/**
 * Internal implementation for removing a dependency between tasks.
 *
 * @param userId - The ID of the user removing the dependency
 * @param taskId - The ID of the task that was blocked
 * @param blockerId - The ID of the task that was blocking
 */
async function removeDependencyImpl(userId: string, taskId: number, blockerId: number) {
  await requireUser(userId);

  await db
    .delete(taskDependencies)
    .where(and(eq(taskDependencies.taskId, taskId), eq(taskDependencies.blockerId, blockerId)));

  await db.insert(taskLogs).values({
    userId,
    taskId,
    action: "dependency_removed",
    details: `No longer blocked by task #${blockerId}`,
  });

  revalidatePath("/");
}

/**
 * Removes a dependency between tasks.
 *
 * @param userId - The ID of the user removing the dependency
 * @param taskId - The ID of the task that was blocked
 * @param blockerId - The ID of the task that was blocking
 * @returns ActionResult with void on success or error
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const removeDependency: (
  userId: string,
  taskId: number,
  blockerId: number
) => Promise<ActionResult<void>> = withErrorHandling(removeDependencyImpl);

/**
 * Gets all tasks that block a specific task.
 *
 * @param taskId - The ID of the task to get blockers for
 * @returns Array of blocking tasks with id, title, and completion status
 */
export async function getBlockers(taskId: number) {
  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      isCompleted: tasks.isCompleted,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
    .where(eq(taskDependencies.taskId, taskId));

  return result;
}

/**
 * Gets all tasks that are blocked by a specific task.
 *
 * @param blockerId - The ID of the blocking task
 * @returns Array of blocked tasks with id, title, and completion status
 */
export async function getBlockedTasks(blockerId: number) {
  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      isCompleted: tasks.isCompleted,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
    .where(eq(taskDependencies.blockerId, blockerId));

  return result;
}
