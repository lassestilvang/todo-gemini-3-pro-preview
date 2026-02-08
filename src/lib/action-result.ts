/**
 * Error Handling Infrastructure for Server Actions
 * 
 * This module provides a consistent Result type pattern for Server Actions,
 * ensuring all operations return structured responses that the UI can handle.
 * 
 * @module action-result
 */

import { ForbiddenError as AuthForbiddenError, UnauthorizedError as AuthUnauthorizedError } from "./auth-errors";
import { ZodError } from "zod";

/**
 * Error codes for categorizing Server Action failures
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DATABASE_ERROR"
  | "NETWORK_ERROR"
  | "CONFLICT"
  | "UNKNOWN_ERROR";

/**
 * Structured error response from Server Actions
 */
export interface ActionError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, string>;
}

/**
 * Result type for Server Actions - either success with data or failure with error
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

/**
 * Helper to create a success result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

/**
 * Helper to create an error result
 */
export function failure<T>(error: ActionError): ActionResult<T> {
  return { success: false, error };
}

/**
 * Patterns for detecting sensitive data in error messages
 */
const SENSITIVE_PATTERNS = [
  /password/gi,
  /token/gi,
  /api[_-]?key/gi,
  /secret/gi,
  /credential/gi,
  /connection[_-]?string/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, // Email pattern
];

/**
 * Sanitizes error messages by removing sensitive information
 */
export function sanitizeError(error: unknown): string {
  let message: string;
  try {
    message = error instanceof Error ? error.message : String(error);
  } catch {
    message = "Unknown error";
  }
  let sanitized = message;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized;
}

/**
 * Error code mapping for custom error classes
 */
export const ERROR_CODE_MAP: Record<string, ErrorCode> = {
  ValidationError: "VALIDATION_ERROR",
  AuthorizationError: "FORBIDDEN",
  DatabaseError: "DATABASE_ERROR",
  NotFoundError: "NOT_FOUND",
  NetworkError: "NETWORK_ERROR",
};

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  public readonly fieldErrors: Record<string, string>;
  public readonly code: ErrorCode = "VALIDATION_ERROR";

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Custom error class for authorization errors
 */
export class AuthorizationError extends Error {
  public readonly code: ErrorCode = "FORBIDDEN";

  constructor(message: string = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Custom error class for database errors
 */
export class DatabaseError extends Error {
  public readonly code: ErrorCode = "DATABASE_ERROR";

  constructor(message: string = "A database error occurred") {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Custom error class for not found errors
 */
export class NotFoundError extends Error {
  public readonly code: ErrorCode = "NOT_FOUND";

  constructor(message: string = "The requested resource was not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Custom error class for network errors
 */
export class NetworkError extends Error {
  public readonly code: ErrorCode = "NETWORK_ERROR";

  constructor(message: string = "A network error occurred") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Custom error class for conflict errors (optimistic concurrency)
 */
export class ConflictError extends Error {
  public readonly code: ErrorCode = "CONFLICT";
  public readonly serverData: unknown;

  constructor(message: string = "The resource was modified by another client", serverData?: unknown) {
    super(message);
    this.name = "ConflictError";
    this.code = "CONFLICT";
    this.serverData = serverData;

    // Ensure properties are enumerable for JSON serialization if needed
    Object.defineProperty(this, 'code', { enumerable: true });
    Object.defineProperty(this, 'serverData', { enumerable: true });
  }
}

/**
 * Wrapper for Server Actions that handles try-catch and returns Result type
 * 
 * @param fn - The async function to wrap
 * @returns A wrapped function that always returns ActionResult<T>
 */
export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args: Args): Promise<ActionResult<T>> => {
    try {
      const result = await fn(...args);
      return success(result);
    } catch (error) {
      // 1. Conflict Errors (priority for sync)
      const err = error as any;
      const isConflict = error instanceof ConflictError ||
        err?.code === "CONFLICT" ||
        err?.name === "ConflictError" ||
        err?.message?.includes("modified by another device");

      if (isConflict) {
        return failure({
          code: "CONFLICT",
          message: err.message || "This task was modified by another device. Please review the changes.",
          details: err.serverData
            ? { serverData: typeof err.serverData === 'string' ? err.serverData : JSON.stringify(err.serverData) }
            : undefined,
        });
      }

      // 2. Auth Errors
      if (error instanceof AuthorizationError || (error as any)?.code === "FORBIDDEN" || error instanceof AuthForbiddenError) {
        return failure({
          code: "FORBIDDEN",
          message: "You do not have permission to perform this action",
        });
      }

      if (error instanceof AuthUnauthorizedError || (error as any)?.code === "UNAUTHORIZED") {
        return failure({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // 3. Validation Errors
      if (error instanceof ValidationError || (error as any)?.code === "VALIDATION_ERROR") {
        return failure({
          code: "VALIDATION_ERROR",
          message: (error as any).message || "Validation failed",
          details: (error as any).fieldErrors || (error as any).details,
        });
      }

      if (error instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path.join(".")] = err.message;
          }
        });

        return failure({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: fieldErrors,
        });
      }

      // 4. Other Domain Errors
      if (error instanceof NotFoundError || (error as any)?.code === "NOT_FOUND") {
        return failure({
          code: "NOT_FOUND",
          message: (error as any).message || "Resource not found",
        });
      }

      if (error instanceof DatabaseError || (error as any)?.code === "DATABASE_ERROR") {
        return failure({
          code: "DATABASE_ERROR",
          message: "Unable to complete the operation. Please try again.",
        });
      }

      if (error instanceof NetworkError || (error as any)?.code === "NETWORK_ERROR") {
        return failure({
          code: "NETWORK_ERROR",
          message: "A network error occurred. Please check your connection and try again.",
        });
      }

      // 5. Generic error for unexpected exceptions
      return failure({
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred. Please try again.",
      });
    }
  };
}

/**
 * Type guard to check if a result is successful
 */
export function isSuccess<T>(result: ActionResult<T>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a result is a failure
 */
export function isFailure<T>(result: ActionResult<T>): result is { success: false; error: ActionError } {
  return result.success === false;
}
