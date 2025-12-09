/**
 * Custom error classes for authentication and authorization.
 * These allow consumers to use instanceof for type-safe error handling.
 */

/**
 * Thrown when a user is not authenticated (no valid session).
 */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  readonly statusCode = 401;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthorizedError);
    }
  }
}

/**
 * Thrown when a user is authenticated but lacks permission to access a resource.
 */
export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  readonly statusCode = 403;

  constructor(message = "Access denied") {
    super(message);
    this.name = "ForbiddenError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError);
    }
  }
}

/**
 * Type guard to check if an error is an UnauthorizedError.
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Type guard to check if an error is a ForbiddenError.
 */
export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

/**
 * Type guard to check if an error is any auth-related error.
 */
export function isAuthError(error: unknown): error is UnauthorizedError | ForbiddenError {
  return isUnauthorizedError(error) || isForbiddenError(error);
}
