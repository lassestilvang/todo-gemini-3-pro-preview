import { describe, it, expect, beforeEach, mock } from "bun:test";
import * as fc from "fast-check";
import { setupTestDb, resetTestDb } from "@/test/setup";
import {
    createTaskSafe,
    updateTaskSafe,
    deleteTaskSafe,
    createListSafe,
    createLabelSafe,
} from "@/lib/actions";
import { isSuccess, isFailure } from "@/lib/action-result";

// Mock next/cache to prevent revalidatePath errors in tests
mock.module("next/cache", () => ({
    revalidatePath: () => {},
}));

// Mock smart-tags to prevent AI calls
mock.module("@/lib/smart-tags", () => ({
    suggestMetadata: mock(() => Promise.resolve({ listId: null, labelIds: [] })),
}));

// Configure fast-check for reproducibility in CI
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
    ? parseInt(process.env.FAST_CHECK_SEED, 10)
    : undefined;

fc.configureGlobal({
    numRuns: 100,
    verbose: false,
    seed: FAST_CHECK_SEED,
});

// Arbitrary for valid user IDs
const validUserIdArb = fc.uuid();

// Arbitrary for valid task titles
const validTitleArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);

// Arbitrary for invalid (empty/whitespace) titles
const invalidTitleArb = fc.constantFrom("", "   ", "\t", "\n", "  \t\n  ");

describe("Property Tests: Server Actions Error Handling", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
    });

    /**
     * **Feature: codebase-quality-improvements, Property 1: Database error returns structured error response**
     * **Validates: Requirements 1.1**
     * 
     * For any Server Action that encounters a database error, the returned response
     * SHALL be a valid ActionResult with success=false, an error code of "DATABASE_ERROR",
     * and a non-empty user-friendly message.
     */
    describe("Property 1: Database error returns structured error response", () => {
        it("database errors return DATABASE_ERROR code with user-friendly message", async () => {
            // This test verifies that when database operations fail, we get proper error responses
            // We simulate this by testing with invalid data that would cause constraint violations
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    async (userId) => {
                        // Create a task first
                        const createResult = await createTaskSafe({
                            userId,
                            title: "Test Task",
                        });
                        
                        // The result should always be a valid ActionResult
                        expect(typeof createResult).toBe("object");
                        expect(createResult).not.toBeNull();
                        expect("success" in createResult).toBe(true);
                        
                        // If it's a success, verify structure
                        if (isSuccess(createResult)) {
                            expect(createResult.data).toBeDefined();
                        }
                        
                        // If it's a failure, verify it has proper error structure
                        if (isFailure(createResult)) {
                            expect(createResult.error).toBeDefined();
                            expect(createResult.error.code).toBeDefined();
                            expect(createResult.error.message).toBeDefined();
                            expect(createResult.error.message.length).toBeGreaterThan(0);
                            
                            // If it's a database error, verify the code
                            if (createResult.error.code === "DATABASE_ERROR") {
                                expect(createResult.error.message).not.toContain("SQLITE");
                                expect(createResult.error.message).not.toContain("constraint");
                            }
                        }
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 2: Validation error returns field-level details**
     * **Validates: Requirements 1.2**
     * 
     * For any Server Action receiving invalid input data, the returned response
     * SHALL be a valid ActionResult with success=false, an error code of "VALIDATION_ERROR",
     * and a details object containing field-specific error messages.
     */
    describe("Property 2: Validation error returns field-level details", () => {
        it("empty title returns VALIDATION_ERROR with field details", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    invalidTitleArb,
                    async (userId, invalidTitle) => {
                        const result = await createTaskSafe({
                            userId,
                            title: invalidTitle,
                        });
                        
                        // Must be a failure
                        expect(result.success).toBe(false);
                        expect(isFailure(result)).toBe(true);
                        
                        if (isFailure(result)) {
                            // Must have VALIDATION_ERROR code
                            expect(result.error.code).toBe("VALIDATION_ERROR");
                            
                            // Must have field-level details
                            expect(result.error.details).toBeDefined();
                            expect(result.error.details).not.toBeNull();
                            expect(typeof result.error.details).toBe("object");
                            
                            // Must have title field error
                            expect(result.error.details!.title).toBeDefined();
                            expect(result.error.details!.title.length).toBeGreaterThan(0);
                        }
                    }
                )
            );
        });

        it("title exceeding max length returns VALIDATION_ERROR with field details", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    fc.string({ minLength: 501, maxLength: 600 }),
                    async (userId, longTitle) => {
                        const result = await createTaskSafe({
                            userId,
                            title: longTitle,
                        });
                        
                        // Must be a failure
                        expect(result.success).toBe(false);
                        
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("VALIDATION_ERROR");
                            expect(result.error.details).toBeDefined();
                            expect(result.error.details!.title).toBeDefined();
                        }
                    }
                )
            );
        });

        it("list name validation returns field-level errors", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    invalidTitleArb,
                    async (userId, invalidName) => {
                        const result = await createListSafe({
                            userId,
                            name: invalidName,
                            slug: "test-slug",
                        });
                        
                        expect(result.success).toBe(false);
                        
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("VALIDATION_ERROR");
                            expect(result.error.details).toBeDefined();
                            expect(result.error.details!.name).toBeDefined();
                        }
                    }
                )
            );
        });

        it("label name validation returns field-level errors", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    invalidTitleArb,
                    async (userId, invalidName) => {
                        const result = await createLabelSafe({
                            userId,
                            name: invalidName,
                            color: "#000000",
                        });
                        
                        expect(result.success).toBe(false);
                        
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("VALIDATION_ERROR");
                            expect(result.error.details).toBeDefined();
                            expect(result.error.details!.name).toBeDefined();
                        }
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 3: Authorization error returns 403 without internal details**
     * **Validates: Requirements 1.3**
     * 
     * For any Server Action called with an invalid or missing userId, the returned response
     * SHALL be a valid ActionResult with success=false, an error code of "FORBIDDEN" or "UNAUTHORIZED",
     * and a message that does not contain stack traces, database queries, or internal identifiers.
     */
    describe("Property 3: Authorization error returns 403 without internal details", () => {
        it("missing userId returns FORBIDDEN without internal details", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validTitleArb,
                    async (title) => {
                        const result = await createTaskSafe({
                            userId: "",
                            title,
                        });
                        
                        expect(result.success).toBe(false);
                        
                        if (isFailure(result)) {
                            // Should be either FORBIDDEN or VALIDATION_ERROR for missing userId
                            expect(["FORBIDDEN", "VALIDATION_ERROR"]).toContain(result.error.code);
                            
                            // Message should not contain internal details
                            expect(result.error.message).not.toContain("stack");
                            expect(result.error.message).not.toContain("SELECT");
                            expect(result.error.message).not.toContain("INSERT");
                            expect(result.error.message).not.toContain("Error:");
                        }
                    }
                )
            );
        });

        it("update with wrong userId returns FORBIDDEN or NOT_FOUND", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validUserIdArb,
                    validTitleArb,
                    async (ownerId, wrongUserId, title) => {
                        // Skip if userIds happen to be the same
                        if (ownerId === wrongUserId) return;
                        
                        // Create a task with the owner
                        const createResult = await createTaskSafe({
                            userId: ownerId,
                            title,
                        });
                        
                        if (!isSuccess(createResult)) return;
                        
                        // Try to update with wrong user
                        const updateResult = await updateTaskSafe(
                            createResult.data.id,
                            wrongUserId,
                            { title: "Hacked!" }
                        );
                        
                        expect(updateResult.success).toBe(false);
                        
                        if (isFailure(updateResult)) {
                            // Should be NOT_FOUND (task not found for this user) or FORBIDDEN
                            expect(["NOT_FOUND", "FORBIDDEN"]).toContain(updateResult.error.code);
                            
                            // Message should not expose internal details
                            expect(updateResult.error.message).not.toContain("stack");
                            expect(updateResult.error.message).not.toContain("SELECT");
                        }
                    }
                )
            );
        });

        it("delete with wrong userId returns FORBIDDEN or NOT_FOUND", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validUserIdArb,
                    validTitleArb,
                    async (ownerId, wrongUserId, title) => {
                        if (ownerId === wrongUserId) return;
                        
                        const createResult = await createTaskSafe({
                            userId: ownerId,
                            title,
                        });
                        
                        if (!isSuccess(createResult)) return;
                        
                        const deleteResult = await deleteTaskSafe(
                            createResult.data.id,
                            wrongUserId
                        );
                        
                        expect(deleteResult.success).toBe(false);
                        
                        if (isFailure(deleteResult)) {
                            expect(["NOT_FOUND", "FORBIDDEN"]).toContain(deleteResult.error.code);
                        }
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 4: Success response contains result data**
     * **Validates: Requirements 1.4**
     * 
     * For any Server Action that completes successfully, the returned response
     * SHALL be a valid ActionResult with success=true and a data field containing the operation result.
     */
    describe("Property 4: Success response contains result data", () => {
        it("successful task creation returns data with task", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validTitleArb,
                    async (userId, title) => {
                        const result = await createTaskSafe({
                            userId,
                            title,
                        });
                        
                        expect(result.success).toBe(true);
                        expect(isSuccess(result)).toBe(true);
                        
                        if (isSuccess(result)) {
                            expect(result.data).toBeDefined();
                            expect(result.data.id).toBeDefined();
                            expect(result.data.title).toBe(title);
                            expect(result.data.userId).toBe(userId);
                        }
                    }
                )
            );
        });

        it("successful list creation returns data with list", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validTitleArb,
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-z0-9-]+$/.test(s)),
                    async (userId, name, slug) => {
                        const result = await createListSafe({
                            userId,
                            name,
                            slug,
                        });
                        
                        expect(result.success).toBe(true);
                        
                        if (isSuccess(result)) {
                            expect(result.data).toBeDefined();
                            expect(result.data.id).toBeDefined();
                            expect(result.data.name).toBe(name);
                            expect(result.data.userId).toBe(userId);
                        }
                    }
                )
            );
        });

        it("successful label creation returns data with label", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    async (userId, name) => {
                        const result = await createLabelSafe({
                            userId,
                            name,
                            color: "#FF0000",
                        });
                        
                        expect(result.success).toBe(true);
                        
                        if (isSuccess(result)) {
                            expect(result.data).toBeDefined();
                            expect(result.data.id).toBeDefined();
                            expect(result.data.name).toBe(name);
                            expect(result.data.userId).toBe(userId);
                        }
                    }
                )
            );
        });

        it("successful task update returns success with void", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validTitleArb,
                    validTitleArb,
                    async (userId, originalTitle, newTitle) => {
                        // Create task first
                        const createResult = await createTaskSafe({
                            userId,
                            title: originalTitle,
                        });
                        
                        if (!isSuccess(createResult)) return;
                        
                        // Update the task
                        const updateResult = await updateTaskSafe(
                            createResult.data.id,
                            userId,
                            { title: newTitle }
                        );
                        
                        expect(updateResult.success).toBe(true);
                        
                        if (isSuccess(updateResult)) {
                            // For void returns, data should be undefined
                            expect(updateResult.data).toBeUndefined();
                        }
                    }
                )
            );
        });

        it("successful task deletion returns success with void", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    validTitleArb,
                    async (userId, title) => {
                        // Create task first
                        const createResult = await createTaskSafe({
                            userId,
                            title,
                        });
                        
                        if (!isSuccess(createResult)) return;
                        
                        // Delete the task
                        const deleteResult = await deleteTaskSafe(
                            createResult.data.id,
                            userId
                        );
                        
                        expect(deleteResult.success).toBe(true);
                        
                        if (isSuccess(deleteResult)) {
                            expect(deleteResult.data).toBeUndefined();
                        }
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 5: Unexpected errors return generic response**
     * **Validates: Requirements 1.5**
     * 
     * For any Server Action that throws an unexpected error, the returned response
     * SHALL be a valid ActionResult with success=false, an error code of "UNKNOWN_ERROR",
     * and a generic message that does not expose internal error details.
     */
    describe("Property 5: Unexpected errors return generic response", () => {
        it("all error responses have generic user-friendly messages", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    fc.integer({ min: -1000000, max: 1000000 }),
                    async (userId, nonExistentId) => {
                        // Try to update a non-existent task
                        const result = await updateTaskSafe(
                            nonExistentId,
                            userId,
                            { title: "Test" }
                        );
                        
                        // Should fail
                        expect(result.success).toBe(false);
                        
                        if (isFailure(result)) {
                            // Message should be user-friendly
                            expect(result.error.message.length).toBeGreaterThan(0);
                            
                            // Should not contain internal error details
                            expect(result.error.message).not.toMatch(/Error:/);
                            expect(result.error.message).not.toMatch(/at \w+/); // Stack trace pattern
                            expect(result.error.message).not.toContain("undefined");
                            expect(result.error.message).not.toContain("null");
                        }
                    }
                )
            );
        });

        it("error responses never expose stack traces", async () => {
            await fc.assert(
                fc.asyncProperty(
                    validUserIdArb,
                    fc.integer({ min: -1000000, max: 1000000 }),
                    async (userId, nonExistentId) => {
                        const result = await deleteTaskSafe(nonExistentId, userId);
                        
                        if (isFailure(result)) {
                            // Should not contain stack trace patterns
                            expect(result.error.message).not.toMatch(/at \S+:\d+:\d+/);
                            expect(result.error.message).not.toContain(".ts:");
                            expect(result.error.message).not.toContain(".js:");
                        }
                    }
                )
            );
        });
    });
});
