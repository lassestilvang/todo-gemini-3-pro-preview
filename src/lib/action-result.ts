/**
 * Error Handling Infrastructure for Server Actions
 * 
 * This module provides a consistent Result type pattern for Server Actions,
 * ensuring all operations return structured responses that the UI can handle.
 * 
 * @module action-result
 */

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
  const message = error instanceof Error ? error.message : String(error);
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
      // Log sanitized error for debugging
      console.error("[Server Action Error]", sanitizeError(error));

      // Return appropriate error response based on error type
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

      if (error instanceof DatabaseError) {
        return failure({
          code: "DATABASE_ERROR",
          message: "Unable to complete the operation. Please try again.",
        });
      }

      if (error instanceof NetworkError) {
        return failure({
          code: "NETWORK_ERROR",
          message: "A network error occurred. Please check your connection and try again.",
        });
      }

      // Generic error for unexpected exceptions
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
