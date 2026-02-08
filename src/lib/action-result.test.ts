import { describe, expect, it } from "bun:test";
import { withErrorHandling, ConflictError, ValidationError } from "./action-result";
import { z } from "zod";

describe("withErrorHandling", () => {
    it("should return success for successful function", async () => {
        const fn = async (n: number) => n * 2;
        const wrapped = withErrorHandling(fn);
        const result = await wrapped(5);

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe(10);
        }
    });

    it("should catch ConflictError and return CONFLICT failure", async () => {
        const serverData = { id: 1, title: "Server version" };
        const fn = async () => {
            throw new ConflictError("Conflict message", serverData);
        };
        const wrapped = withErrorHandling(fn);
        const result = await wrapped();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("CONFLICT");
            expect(result.error.message).toBe("Conflict message");
            expect(result.error.details?.serverData).toBe(JSON.stringify(serverData));
        }
    });

    it("should catch ZodError and return VALIDATION_ERROR failure", async () => {
        const schema = z.object({
            title: z.string().min(1, "Title too short"),
        });
        const fn = async (data: unknown) => schema.parse(data);
        const wrapped = withErrorHandling(fn);
        const result = await wrapped({ title: "" });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
            expect(result.error.details?.title).toBe("Title too short");
        }
    });

    it("should catch ValidationError and return VALIDATION_ERROR failure", async () => {
        const fn = async () => {
            throw new ValidationError("Custom validation error", { field: "Field error" });
        };
        const wrapped = withErrorHandling(fn);
        const result = await wrapped();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
            expect(result.error.message).toBe("Custom validation error");
            expect(result.error.details?.field).toBe("Field error");
        }
    });

    it("should catch unexpected errors and return UNKNOWN_ERROR failure", async () => {
        const fn = async () => {
            throw new Error("Unexpected crash");
        };
        const wrapped = withErrorHandling(fn);
        const result = await wrapped();

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("UNKNOWN_ERROR");
            expect(result.error.message).toBe("An unexpected error occurred. Please try again.");
        }
    });
});
