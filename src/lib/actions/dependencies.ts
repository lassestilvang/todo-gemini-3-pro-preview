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
  inArray,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
  NotFoundError,
} from "./shared";
import { requireUser } from "@/lib/auth";

console.error("[ACTION] src/lib/actions/dependencies.ts loaded");

/**
 * Internal implementation for adding a dependency between tasks.
 *
 * @param userId - The ID of the user adding the dependency
 * @param taskId - The ID of the task that will be blocked
 * @param blockerId - The ID of the task that blocks
 * @throws {ValidationError} When task tries to block itself or circular dependency detected
 */
async function addDependencyImpl(userId: string, taskId: number, blockerId: number) {
  console.log(`[ACTION] addDependencyImpl START: userId=${userId}, taskId=${taskId}, blockerId=${blockerId}`);
  
  try {
    const user = await requireUser(userId);
    console.log(`[ACTION] addDependencyImpl: requireUser success. User=${user.id}`);
  } catch (error) {
    console.error(`[ACTION] addDependencyImpl: requireUser failed. Error=${error}`);
    throw error;
  }

  if (taskId === blockerId) {
    throw new ValidationError("Task cannot block itself", {
      blockerId: "A task cannot be its own blocker",
    });
  }

  // Validate ownership of both tasks to prevent IDOR
  const tasksCheck = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, [taskId, blockerId])));

  if (tasksCheck.length !== 2) {
    throw new NotFoundError("One or both tasks not found or access denied");
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

  // Validate ownership of both tasks to prevent IDOR
  const tasksCheck = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), inArray(tasks.id, [taskId, blockerId])));

  if (tasksCheck.length !== 2) {
    throw new NotFoundError("One or both tasks not found or access denied");
  }

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
 * @param userId - The ID of the user who owns the task
 * @param taskId - The ID of the task to get blockers for
 * @returns Array of blocking tasks with id, title, and completion status
 */
export async function getBlockers(userId: string, taskId: number) {
  await requireUser(userId);

  // Check if user owns the task
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) {
    return [];
  }

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
 * @param userId - The ID of the user who owns the task
 * @param blockerId - The ID of the blocking task
 * @returns Array of blocked tasks with id, title, and completion status
 */
export async function getBlockedTasks(userId: string, blockerId: number) {
  await requireUser(userId);

  // Check if user owns the task
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, blockerId), eq(tasks.userId, userId)))
    .limit(1);

  if (!task) {
    return [];
  }

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
