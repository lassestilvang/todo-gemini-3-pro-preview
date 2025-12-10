/**
 * @module actions/task-safe
 * @description Server Actions for task operations with error handling.
 * These functions wrap the base task functions with validation and error handling.
 */
"use server";

import { tasks } from "@/db";
import {
  type ActionResult,
  success,
  failure,
  ValidationError,
  AuthorizationError,
  NotFoundError,
} from "../action-result";
import { getTask, createTask, updateTask, deleteTask, toggleTaskCompletion } from "./tasks";

/**
 * Validates task input data and returns field-level errors
 */
function validateTaskInput(data: {
  title?: string;
  userId?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length === 0) {
    errors.title = "Title is required";
  } else if (data.title.length > 500) {
    errors.title = "Title must be 500 characters or less";
  }

  if (!data.userId || data.userId.trim().length === 0) {
    errors.userId = "User ID is required";
  }

  return errors;
}

/**
 * Creates a task with error handling
 * Returns ActionResult instead of throwing
 */
export async function createTaskSafe(
  data: typeof tasks.$inferInsert & { labelIds?: number[] }
): Promise<ActionResult<typeof tasks.$inferSelect>> {
  try {
    const validationErrors = validateTaskInput(data);
    if (Object.keys(validationErrors).length > 0) {
      throw new ValidationError("Invalid task data", validationErrors);
    }

    if (!data.userId) {
      throw new AuthorizationError("User ID is required to create a task");
    }

    const task = await createTask(data);
    return success(task);
  } catch (error) {
    if (error instanceof ValidationError) {
      return failure({
        code: "VALIDATION_ERROR",
        message: error.message,
        details: error.fieldErrors,
      });
    }

    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("SQLITE") ||
        error.message.includes("database") ||
        error.message.includes("constraint"))
    ) {
      console.error("[Database Error]", error.message);
      return failure({
        code: "DATABASE_ERROR",
        message: "Unable to create task. Please try again.",
      });
    }

    console.error("[Server Action Error]", error);
    return failure({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}

/**
 * Updates a task with error handling
 * Returns ActionResult instead of throwing
 */
export async function updateTaskSafe(
  id: number,
  userId: string,
  data: Partial<Omit<typeof tasks.$inferInsert, "userId">> & {
    labelIds?: number[];
  }
): Promise<ActionResult<void>> {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new AuthorizationError("User ID is required");
    }

    const existingTask = await getTask(id, userId);
    if (!existingTask) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        throw new ValidationError("Invalid task data", {
          title: "Title cannot be empty",
        });
      }
      if (data.title.length > 500) {
        throw new ValidationError("Invalid task data", {
          title: "Title must be 500 characters or less",
        });
      }
    }

    await updateTask(id, userId, data);
    return success(undefined);
  } catch (error) {
    if (error instanceof ValidationError) {
      return failure({
        code: "VALIDATION_ERROR",
        message: error.message,
        details: error.fieldErrors,
      });
    }

    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    if (error instanceof NotFoundError) {
      return failure({
        code: "NOT_FOUND",
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("SQLITE") ||
        error.message.includes("database") ||
        error.message.includes("constraint"))
    ) {
      console.error("[Database Error]", error.message);
      return failure({
        code: "DATABASE_ERROR",
        message: "Unable to update task. Please try again.",
      });
    }

    console.error("[Server Action Error]", error);
    return failure({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}

/**
 * Deletes a task with error handling
 * Returns ActionResult instead of throwing
 */
export async function deleteTaskSafe(
  id: number,
  userId: string
): Promise<ActionResult<void>> {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new AuthorizationError("User ID is required");
    }

    const existingTask = await getTask(id, userId);
    if (!existingTask) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    await deleteTask(id, userId);
    return success(undefined);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    if (error instanceof NotFoundError) {
      return failure({
        code: "NOT_FOUND",
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("SQLITE") ||
        error.message.includes("database") ||
        error.message.includes("constraint"))
    ) {
      console.error("[Database Error]", error.message);
      return failure({
        code: "DATABASE_ERROR",
        message: "Unable to delete task. Please try again.",
      });
    }

    console.error("[Server Action Error]", error);
    return failure({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}

/**
 * Toggles task completion with error handling
 * Returns ActionResult instead of throwing
 */
export async function toggleTaskCompletionSafe(
  id: number,
  userId: string,
  isCompleted: boolean
): Promise<
  ActionResult<
    { newXP: number; newLevel: number; leveledUp: boolean } | undefined
  >
> {
  try {
    if (!userId || userId.trim().length === 0) {
      throw new AuthorizationError("User ID is required");
    }

    const existingTask = await getTask(id, userId);
    if (!existingTask) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    const result = await toggleTaskCompletion(id, userId, isCompleted);
    return success(result);
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return failure({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
      });
    }

    if (error instanceof NotFoundError) {
      return failure({
        code: "NOT_FOUND",
        message: error.message,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("SQLITE") ||
        error.message.includes("database") ||
        error.message.includes("constraint"))
    ) {
      console.error("[Database Error]", error.message);
      return failure({
        code: "DATABASE_ERROR",
        message: "Unable to update task completion. Please try again.",
      });
    }

    console.error("[Server Action Error]", error);
    return failure({
      code: "UNKNOWN_ERROR",
      message: "An unexpected error occurred. Please try again.",
    });
  }
}
