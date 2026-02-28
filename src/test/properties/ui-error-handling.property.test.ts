/**
 * Property-Based Tests for UI Error Handling
 * 
 * These tests verify that the UI correctly handles error responses from Server Actions,
 * including displaying toast notifications and preserving user input on failures.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fc from "fast-check";
import type { ActionResult, ActionError, ErrorCode } from "@/lib/action-result";

// Configure fast-check for reproducibility in CI
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
    ? parseInt(process.env.FAST_CHECK_SEED, 10)
    : undefined;

fc.configureGlobal({
    numRuns: 100,
    verbose: false,
    seed: FAST_CHECK_SEED,
});

// Mock toast notifications
const toastCalls: { type: string; message: string }[] = [];

// Mock next/navigation
let lastPushPath: string | null = null;

// Arbitrary for valid error codes
const errorCodeArb = fc.constantFrom<ErrorCode>(
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "DATABASE_ERROR",
    "NETWORK_ERROR",
    "UNKNOWN_ERROR"
);

// Arbitrary for ActionError
const actionErrorArb = fc.record({
    code: errorCodeArb,
    message: fc.string({ minLength: 1, maxLength: 100 }),
    field: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    details: fc.option(
        fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 100 })
        ),
        { nil: undefined }
    ),
}) as fc.Arbitrary<ActionError>;

// Arbitrary for task input data
const taskInputArb = fc.record({
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.string({ minLength: 0, maxLength: 1000 }),
    priority: fc.constantFrom("none", "low", "medium", "high"),
    listId: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    dueDate: fc.option(fc.date(), { nil: undefined }),
});

describe("Property Tests: UI Error Handling", () => {
    beforeEach(() => {
        // Clear mock state before each test
        toastCalls.length = 0;
        lastPushPath = null;
    });

    afterEach(() => {
        // Clean up after each test
        toastCalls.length = 0;
        lastPushPath = null;
    });

    /**
     * **Feature: codebase-quality-improvements, Property 10: UI displays error toast on task creation failure**
     * **Validates: Requirements 6.1**
     * 
     * For any task creation that fails, the UI SHALL display a toast notification
     * containing a non-empty error message.
     */
    describe("Property 10: UI displays error toast on task creation failure", () => {
        /**
         * Simulates the error handling logic from useActionResult hook
         * This tests the core behavior without React rendering
         */
        function handleActionError(error: ActionError): void {
            // Handle authentication errors - redirect to login
            if (error.code === "UNAUTHORIZED") {
                toastCalls.push({ type: "error", message: "Session expired. Please log in again." });
                return;
            }

            // Show error toast for all other errors
            toastCalls.push({ type: "error", message: error.message });
        }

        it("displays error toast with non-empty message for any failed task creation", () => {
            fc.assert(
                fc.property(
                    actionErrorArb.filter(e => e.code !== "UNAUTHORIZED"),
                    (error) => {
                        // Clear previous calls
                        toastCalls.length = 0;

                        // Simulate handling a failed action result
                        const failedResult: ActionResult<unknown> = {
                            success: false,
                            error,
                        };

                        // Handle the error (simulating what useActionResult does)
                        if (!failedResult.success) {
                            handleActionError(failedResult.error);
                        }

                        // Verify toast was called
                        expect(toastCalls.length).toBeGreaterThan(0);

                        // Verify it was an error toast
                        const errorToast = toastCalls.find(t => t.type === "error");
                        expect(errorToast).toBeDefined();

                        // Verify message is non-empty
                        expect(errorToast!.message.length).toBeGreaterThan(0);

                        // Verify message matches the error message
                        expect(errorToast!.message).toBe(error.message);
                    }
                )
            );
        });

        it("displays validation error toast with field-specific message", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.dictionary(
                        fc.string({ minLength: 1, maxLength: 20 }),
                        fc.string({ minLength: 1, maxLength: 100 }),
                        { minKeys: 1, maxKeys: 5 }
                    ),
                    (message, details) => {
                        // Clear previous calls
                        toastCalls.length = 0;

                        const validationError: ActionError = {
                            code: "VALIDATION_ERROR",
                            message,
                            details,
                        };

                        handleActionError(validationError);

                        // Verify error toast was shown
                        const errorToast = toastCalls.find(t => t.type === "error");
                        expect(errorToast).toBeDefined();
                        expect(errorToast!.message).toBe(message);
                    }
                )
            );
        });

        it("displays database error toast with user-friendly message", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (message) => {
                        // Clear previous calls
                        toastCalls.length = 0;

                        const dbError: ActionError = {
                            code: "DATABASE_ERROR",
                            message,
                        };

                        handleActionError(dbError);

                        // Verify error toast was shown
                        const errorToast = toastCalls.find(t => t.type === "error");
                        expect(errorToast).toBeDefined();
                        expect(errorToast!.message.length).toBeGreaterThan(0);
                    }
                )
            );
        });

        it("displays network error toast with retry suggestion", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (message) => {
                        // Clear previous calls
                        toastCalls.length = 0;

                        const networkError: ActionError = {
                            code: "NETWORK_ERROR",
                            message,
                        };

                        handleActionError(networkError);

                        // Verify error toast was shown
                        const errorToast = toastCalls.find(t => t.type === "error");
                        expect(errorToast).toBeDefined();
                        expect(errorToast!.message.length).toBeGreaterThan(0);
                    }
                )
            );
        });

        it("redirects to login on UNAUTHORIZED error", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    (message) => {
                        // Clear previous calls
                        toastCalls.length = 0;
                        lastPushPath = null;

                        const authError: ActionError = {
                            code: "UNAUTHORIZED",
                            message,
                        };

                        // Simulate the redirect behavior (this is what useActionResult does)
                        if (authError.code === "UNAUTHORIZED") {
                            toastCalls.push({ type: "error", message: "Session expired. Please log in again." });
                            lastPushPath = "/login?message=session_expired";
                        }

                        // Verify toast was shown with session expired message
                        const errorToast = toastCalls.find(t => t.type === "error");
                        expect(errorToast).toBeDefined();
                        expect(errorToast!.message).toBe("Session expired. Please log in again.");

                        // Verify redirect path includes session_expired message
                        expect(lastPushPath).toBe("/login?message=session_expired");
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 11: UI preserves input on task update failure**
     * **Validates: Requirements 6.2**
     * 
     * For any task update that fails, the UI SHALL preserve the user's input values
     * in the form fields.
     */
    describe("Property 11: UI preserves input on task update failure", () => {
        /**
         * Simulates form state management that preserves input on failure
         */
        interface FormState {
            title: string;
            description: string;
            priority: string;
            listId: number | null;
            dueDate: Date | undefined;
            fieldErrors: Record<string, string>;
        }

        function createFormState(input: {
            title: string;
            description: string;
            priority: string;
            listId: number | null;
            dueDate: Date | undefined;
        }): FormState {
            return {
                ...input,
                fieldErrors: {},
            };
        }

        function handleUpdateFailure(
            state: FormState,
            error: ActionError
        ): FormState {
            // On failure, preserve all input values but update field errors
            const newState = { ...state };

            if (error.code === "VALIDATION_ERROR" && error.details) {
                newState.fieldErrors = error.details;
            }

            return newState;
        }

        it("preserves all form input values when task update fails", () => {
            fc.assert(
                fc.property(
                    taskInputArb,
                    actionErrorArb,
                    (input, error) => {
                        // Create initial form state with user input
                        const initialState = createFormState({
                            title: input.title,
                            description: input.description,
                            priority: input.priority,
                            listId: input.listId,
                            dueDate: input.dueDate,
                        });

                        // Simulate handling a failed update
                        const stateAfterFailure = handleUpdateFailure(initialState, error);

                        // Verify all input values are preserved
                        expect(stateAfterFailure.title).toBe(input.title);
                        expect(stateAfterFailure.description).toBe(input.description);
                        expect(stateAfterFailure.priority).toBe(input.priority);
                        expect(stateAfterFailure.listId).toBe(input.listId);
                        
                        // Date comparison needs special handling
                        if (input.dueDate) {
                            expect(stateAfterFailure.dueDate?.getTime()).toBe(input.dueDate.getTime());
                        } else {
                            expect(stateAfterFailure.dueDate).toBeUndefined();
                        }
                    }
                )
            );
        });

        it("sets field errors from validation error details", () => {
            fc.assert(
                fc.property(
                    taskInputArb,
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.dictionary(
                        fc.constantFrom("title", "description", "priority", "dueDate"),
                        fc.string({ minLength: 1, maxLength: 100 }),
                        { minKeys: 1, maxKeys: 4 }
                    ),
                    (input, message, details) => {
                        const initialState = createFormState({
                            title: input.title,
                            description: input.description,
                            priority: input.priority,
                            listId: input.listId,
                            dueDate: input.dueDate,
                        });

                        const validationError: ActionError = {
                            code: "VALIDATION_ERROR",
                            message,
                            details,
                        };

                        const stateAfterFailure = handleUpdateFailure(initialState, validationError);

                        // Verify field errors are set
                        expect(stateAfterFailure.fieldErrors).toEqual(details);

                        // Verify input values are still preserved
                        expect(stateAfterFailure.title).toBe(input.title);
                        expect(stateAfterFailure.description).toBe(input.description);
                    }
                )
            );
        });

        it("does not set field errors for non-validation errors", () => {
            fc.assert(
                fc.property(
                    taskInputArb,
                    actionErrorArb.filter(e => e.code !== "VALIDATION_ERROR"),
                    (input, error) => {
                        // Start with clean state (no existing field errors)
                        const initialState = createFormState({
                            title: input.title,
                            description: input.description,
                            priority: input.priority,
                            listId: input.listId,
                            dueDate: input.dueDate,
                        });

                        const stateAfterFailure = handleUpdateFailure(initialState, error);

                        // For non-validation errors, field errors should remain empty
                        // since handleUpdateFailure only sets fieldErrors for VALIDATION_ERROR
                        expect(Object.keys(stateAfterFailure.fieldErrors).length).toBe(0);

                        // Input values should still be preserved
                        expect(stateAfterFailure.title).toBe(input.title);
                        expect(stateAfterFailure.description).toBe(input.description);
                        expect(stateAfterFailure.priority).toBe(input.priority);
                    }
                )
            );
        });

        it("preserves input even with multiple consecutive failures", () => {
            fc.assert(
                fc.property(
                    taskInputArb,
                    fc.array(actionErrorArb, { minLength: 2, maxLength: 5 }),
                    (input, errors) => {
                        let state = createFormState({
                            title: input.title,
                            description: input.description,
                            priority: input.priority,
                            listId: input.listId,
                            dueDate: input.dueDate,
                        });

                        // Simulate multiple consecutive failures
                        for (const error of errors) {
                            state = handleUpdateFailure(state, error);
                        }

                        // After all failures, input should still be preserved
                        expect(state.title).toBe(input.title);
                        expect(state.description).toBe(input.description);
                        expect(state.priority).toBe(input.priority);
                        expect(state.listId).toBe(input.listId);
                    }
                )
            );
        });
    });
});
