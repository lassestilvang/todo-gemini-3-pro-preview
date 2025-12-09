"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActionResult, ActionError, ErrorCode } from "@/lib/action-result";

/**
 * Options for the useActionResult hook
 */
interface UseActionResultOptions {
  /** Custom success message to display */
  successMessage?: string;
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Callback when action succeeds */
  onSuccess?: () => void;
  /** Callback when action fails */
  onError?: (error: ActionError) => void;
  /** Number of retry attempts for network errors (default: 0) */
  retryCount?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
}

/**
 * Return type for the useActionResult hook
 */
interface UseActionResultReturn<T> {
  /** Execute an action and handle the result */
  execute: <Args extends unknown[]>(
    action: (...args: Args) => Promise<ActionResult<T>>,
    ...args: Args
  ) => Promise<ActionResult<T>>;
  /** Whether an action is currently executing */
  isLoading: boolean;
  /** The last error that occurred */
  error: ActionError | null;
  /** Field-level validation errors */
  fieldErrors: Record<string, string>;
  /** Clear the current error state */
  clearError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for handling ActionResult responses from Server Actions.
 * Integrates with toast notifications and handles common error scenarios.
 * 
 * @param options - Configuration options for the hook
 * @returns Object with execute function and state
 * 
 * @example
 * ```tsx
 * const { execute, isLoading, fieldErrors } = useActionResult({
 *   successMessage: "Task created!",
 *   onSuccess: () => closeDialog(),
 * });
 * 
 * const handleSubmit = async () => {
 *   await execute(createTask, taskData);
 * };
 * ```
 */
export function useActionResult<T = unknown>(
  options: UseActionResultOptions = {}
): UseActionResultReturn<T> {
  const {
    successMessage,
    showSuccessToast = true,
    showErrorToast = true,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setFieldErrors({});
  }, []);

  const handleError = useCallback(
    (actionError: ActionError) => {
      setError(actionError);

      // Handle field-level validation errors
      if (actionError.code === "VALIDATION_ERROR" && actionError.details) {
        setFieldErrors(actionError.details);
      }

      // Handle authentication errors - redirect to login
      if (actionError.code === "UNAUTHORIZED" || actionError.code === "FORBIDDEN") {
        if (actionError.code === "UNAUTHORIZED") {
          toast.error("Session expired. Please log in again.");
          router.push("/login?message=session_expired");
          return;
        }
      }

      // Show error toast
      if (showErrorToast) {
        toast.error(actionError.message);
      }

      // Call custom error handler
      onError?.(actionError);
    },
    [showErrorToast, onError, router]
  );

  const execute = useCallback(
    async <Args extends unknown[]>(
      action: (...args: Args) => Promise<ActionResult<T>>,
      ...args: Args
    ): Promise<ActionResult<T>> => {
      setIsLoading(true);
      clearError();

      let lastResult: ActionResult<T> | null = null;
      let attempts = 0;
      const maxAttempts = retryCount + 1;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const result = await action(...args);
          lastResult = result;

          if (result.success) {
            if (showSuccessToast && successMessage) {
              toast.success(successMessage);
            }
            onSuccess?.();
            setIsLoading(false);
            return result;
          }

          // Check if we should retry (only for network errors)
          const shouldRetry =
            result.error.code === "NETWORK_ERROR" && attempts < maxAttempts;

          if (shouldRetry) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }

          // Handle the error
          handleError(result.error);
          setIsLoading(false);
          return result;
        } catch {
          // Unexpected error during action execution
          const unexpectedError: ActionError = {
            code: "UNKNOWN_ERROR" as ErrorCode,
            message: "An unexpected error occurred. Please try again.",
          };
          lastResult = { success: false, error: unexpectedError };

          if (attempts >= maxAttempts) {
            handleError(unexpectedError);
            setIsLoading(false);
            return lastResult;
          }

          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }

      // Should not reach here, but return last result as fallback
      setIsLoading(false);
      return lastResult!;
    },
    [
      clearError,
      handleError,
      onSuccess,
      retryCount,
      retryDelay,
      showSuccessToast,
      successMessage,
    ]
  );

  return {
    execute,
    isLoading,
    error,
    fieldErrors,
    clearError,
    reset,
  };
}

/**
 * Helper function to check if an ActionResult is a success
 */
export function isActionSuccess<T>(
  result: ActionResult<T>
): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Helper function to check if an ActionResult is a failure
 */
export function isActionFailure<T>(
  result: ActionResult<T>
): result is { success: false; error: ActionError } {
  return result.success === false;
}
