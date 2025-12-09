import { describe, it, expect } from "bun:test";
import * as fc from "fast-check";
import {
    success,
    failure,
    withErrorHandling,
    sanitizeError,
    isSuccess,
    isFailure,
    ValidationError,
    AuthorizationError,
    DatabaseError,
    NotFoundError,
    NetworkError,
    type ActionResult,
    type ErrorCode,
    type ActionError,
} from "@/lib/action-result";

// Configure fast-check for reproducibility in CI
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
    ? parseInt(process.env.FAST_CHECK_SEED, 10)
    : undefined;

fc.configureGlobal({
    numRuns: 100,
    verbose: false,
    seed: FAST_CHECK_SEED,
});

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

describe("Property Tests: Action Result", () => {
    /**
     * **Feature: codebase-quality-improvements, Property 7: Result type validity**
     * **Validates: Requirements 7.1, 7.2**
     * 
     * For any call to the success() or failure() helper functions, the returned value
     * SHALL be a valid ActionResult that is either a success variant with data or an
     * error variant with an ActionError, never both or neither.
     */
    describe("Property 7: Result type validity", () => {
        it("success() always returns a valid success ActionResult with data", () => {
            fc.assert(
                fc.property(
                    fc.anything(),
                    (data) => {
                        const result = success(data);

                        // Must have success: true
                        expect(result.success).toBe(true);

                        // Must have data property
                        expect("data" in result).toBe(true);

                        // Must NOT have error property
                        expect("error" in result).toBe(false);

                        // Data should match input
                        if (isSuccess(result)) {
                            expect(result.data).toEqual(data);
                        }
                    }
                )
            );
        });

        it("failure() always returns a valid failure ActionResult with error", () => {
            fc.assert(
                fc.property(
                    actionErrorArb,
                    (error) => {
                        const result = failure<unknown>(error);

                        // Must have success: false
                        expect(result.success).toBe(false);

                        // Must have error property
                        expect("error" in result).toBe(true);

                        // Must NOT have data property
                        expect("data" in result).toBe(false);

                        // Error should match input
                        if (isFailure(result)) {
                            expect(result.error.code).toBe(error.code);
                            expect(result.error.message).toBe(error.message);
                        }
                    }
                )
            );
        });

        it("ActionResult is always exactly one of success or failure, never both", () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.anything().map(data => success(data)),
                        actionErrorArb.map(error => failure<unknown>(error))
                    ),
                    (result: ActionResult<unknown>) => {
                        // XOR: exactly one of success or failure
                        const hasData = "data" in result;
                        const hasError = "error" in result;

                        // Cannot have both
                        expect(hasData && hasError).toBe(false);

                        // Must have exactly one
                        expect(hasData || hasError).toBe(true);

                        // success flag must match structure
                        if (result.success) {
                            expect(hasData).toBe(true);
                            expect(hasError).toBe(false);
                        } else {
                            expect(hasData).toBe(false);
                            expect(hasError).toBe(true);
                        }
                    }
                )
            );
        });

        it("isSuccess and isFailure type guards are mutually exclusive", () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.anything().map(data => success(data)),
                        actionErrorArb.map(error => failure<unknown>(error))
                    ),
                    (result: ActionResult<unknown>) => {
                        const successCheck = isSuccess(result);
                        const failureCheck = isFailure(result);

                        // Exactly one must be true
                        expect(successCheck !== failureCheck).toBe(true);

                        // Must match the success flag
                        expect(successCheck).toBe(result.success);
                        expect(failureCheck).toBe(!result.success);
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 8: Error wrapper always returns Result**
     * **Validates: Requirements 7.4**
     * 
     * For any function wrapped with withErrorHandling(), regardless of whether the
     * wrapped function throws or returns normally, the wrapper SHALL always return
     * a valid ActionResult.
     */
    describe("Property 8: Error wrapper always returns Result", () => {
        it("withErrorHandling returns success ActionResult when function succeeds", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.anything(),
                    async (data) => {
                        const fn = async () => data;
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        // Must be a valid ActionResult
                        expect(typeof result).toBe("object");
                        expect(result).not.toBeNull();
                        expect("success" in result).toBe(true);

                        // Must be success
                        expect(result.success).toBe(true);
                        expect(isSuccess(result)).toBe(true);

                        if (isSuccess(result)) {
                            expect(result.data).toEqual(data);
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns failure ActionResult when function throws generic Error", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (errorMessage) => {
                        const fn = async () => {
                            throw new Error(errorMessage);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        // Must be a valid ActionResult
                        expect(typeof result).toBe("object");
                        expect(result).not.toBeNull();
                        expect("success" in result).toBe(true);

                        // Must be failure with UNKNOWN_ERROR
                        expect(result.success).toBe(false);
                        expect(isFailure(result)).toBe(true);

                        if (isFailure(result)) {
                            expect(result.error.code).toBe("UNKNOWN_ERROR");
                            expect(result.error.message).toBe("An unexpected error occurred. Please try again.");
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns VALIDATION_ERROR for ValidationError", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    fc.dictionary(
                        fc.string({ minLength: 1, maxLength: 20 }),
                        fc.string({ minLength: 1, maxLength: 100 })
                    ),
                    async (message, fieldErrors) => {
                        const fn = async () => {
                            throw new ValidationError(message, fieldErrors);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        expect(result.success).toBe(false);
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("VALIDATION_ERROR");
                            expect(result.error.message).toBe(message);
                            expect(result.error.details).toEqual(fieldErrors);
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns FORBIDDEN for AuthorizationError", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (message) => {
                        const fn = async () => {
                            throw new AuthorizationError(message);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        expect(result.success).toBe(false);
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("FORBIDDEN");
                            // Message should be generic, not exposing internal details
                            expect(result.error.message).toBe("You do not have permission to perform this action");
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns DATABASE_ERROR for DatabaseError", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (message) => {
                        const fn = async () => {
                            throw new DatabaseError(message);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        expect(result.success).toBe(false);
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("DATABASE_ERROR");
                            // Message should be generic
                            expect(result.error.message).toBe("Unable to complete the operation. Please try again.");
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns NOT_FOUND for NotFoundError", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (message) => {
                        const fn = async () => {
                            throw new NotFoundError(message);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        expect(result.success).toBe(false);
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("NOT_FOUND");
                            expect(result.error.message).toBe(message);
                        }
                    }
                )
            );
        });

        it("withErrorHandling returns NETWORK_ERROR for NetworkError", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }),
                    async (message) => {
                        const fn = async () => {
                            throw new NetworkError(message);
                        };
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped();

                        expect(result.success).toBe(false);
                        if (isFailure(result)) {
                            expect(result.error.code).toBe("NETWORK_ERROR");
                            // Message should be generic
                            expect(result.error.message).toBe("A network error occurred. Please check your connection and try again.");
                        }
                    }
                )
            );
        });

        it("withErrorHandling preserves function arguments", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer(),
                    fc.string(),
                    async (num, str) => {
                        const fn = async (a: number, b: string) => ({ a, b });
                        const wrapped = withErrorHandling(fn);
                        const result = await wrapped(num, str);

                        expect(result.success).toBe(true);
                        if (isSuccess(result)) {
                            expect(result.data).toEqual({ a: num, b: str });
                        }
                    }
                )
            );
        });
    });

    /**
     * **Feature: codebase-quality-improvements, Property 9: Error logging sanitizes sensitive data**
     * **Validates: Requirements 7.5**
     * 
     * For any error containing sensitive patterns (passwords, tokens, API keys,
     * connection strings), the logged output SHALL not contain those sensitive values.
     */
    describe("Property 9: Error logging sanitizes sensitive data", () => {
        // Sensitive keywords that should be redacted
        const sensitiveKeywords = [
            "password",
            "PASSWORD",
            "Password",
            "token",
            "TOKEN",
            "Token",
            "api_key",
            "API_KEY",
            "apiKey",
            "secret",
            "SECRET",
            "Secret",
            "credential",
            "CREDENTIAL",
            "Credential",
            "connection_string",
            "connectionString",
            "CONNECTION_STRING",
        ];

        it("sanitizeError redacts sensitive keywords from error messages", () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...sensitiveKeywords),
                    fc.string({ minLength: 0, maxLength: 50 }),
                    fc.string({ minLength: 0, maxLength: 50 }),
                    (sensitiveWord, prefix, suffix) => {
                        const errorMessage = `${prefix}${sensitiveWord}${suffix}`;
                        const sanitized = sanitizeError(new Error(errorMessage));

                        // The sensitive keyword should be replaced with [REDACTED]
                        expect(sanitized.toLowerCase()).not.toContain(sensitiveWord.toLowerCase());
                        expect(sanitized).toContain("[REDACTED]");
                    }
                )
            );
        });

        it("sanitizeError redacts bearer tokens", () => {
            fc.assert(
                fc.property(
                    fc.stringMatching(/^[a-zA-Z0-9._-]{10,50}$/),
                    (tokenValue) => {
                        const errorMessage = `Authorization failed: Bearer ${tokenValue}`;
                        const sanitized = sanitizeError(new Error(errorMessage));

                        // The bearer token should be redacted
                        expect(sanitized).not.toContain(tokenValue);
                        expect(sanitized).toContain("[REDACTED]");
                    }
                )
            );
        });

        it("sanitizeError redacts email addresses", () => {
            // Generate realistic email addresses that match common patterns
            // (alphanumeric local part with dots/underscores/hyphens)
            const realisticEmailArb = fc.tuple(
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9._-]{2,20}$/),
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9-]{1,10}$/),
                fc.constantFrom("com", "org", "net", "io", "dev")
            ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

            fc.assert(
                fc.property(
                    realisticEmailArb,
                    (email) => {
                        const errorMessage = `User not found: ${email}`;
                        const sanitized = sanitizeError(new Error(errorMessage));

                        // The email should be redacted
                        expect(sanitized).not.toContain(email);
                        expect(sanitized).toContain("[REDACTED]");
                    }
                )
            );
        });

        it("sanitizeError handles non-Error objects", () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.string(),
                        fc.integer(),
                        fc.constant(null),
                        fc.constant(undefined),
                        fc.object()
                    ),
                    (value) => {
                        // Should not throw
                        const sanitized = sanitizeError(value);
                        expect(typeof sanitized).toBe("string");
                    }
                )
            );
        });

        it("sanitizeError preserves non-sensitive content", () => {
            fc.assert(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
                        // Filter out strings that contain sensitive patterns
                        const lower = s.toLowerCase();
                        return !lower.includes("password") &&
                            !lower.includes("token") &&
                            !lower.includes("api") &&
                            !lower.includes("key") &&
                            !lower.includes("secret") &&
                            !lower.includes("credential") &&
                            !lower.includes("connection") &&
                            !lower.includes("bearer") &&
                            !s.includes("@"); // No emails
                    }),
                    (safeMessage) => {
                        const sanitized = sanitizeError(new Error(safeMessage));

                        // Non-sensitive content should be preserved
                        expect(sanitized).toBe(safeMessage);
                    }
                )
            );
        });
    });
});
