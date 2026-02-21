import { describe, expect, it } from "bun:test";
import { createTaskSchema, updateTaskSchema } from "./tasks";

describe("Task Validation Schemas", () => {
    describe("createTaskSchema", () => {
        it("should validate a valid task", () => {
            const validTask = {
                userId: "user_123",
                title: "Buy groceries",
                description: "Milk, eggs, bread",
                priority: "medium",
                isRecurring: false,
            };

            const result = createTaskSchema.safeParse(validTask);
            expect(result.success).toBe(true);
        });

        it("should fail when title is too long", () => {
            const longTitle = "a".repeat(256);
            const invalidTask = {
                userId: "user_123",
                title: longTitle,
            };

            const result = createTaskSchema.safeParse(invalidTask);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain("must be at most 255 characters");
            }
        });

        it("should fail when description is too long", () => {
            const longDescription = "a".repeat(5001);
            const invalidTask = {
                userId: "user_123",
                title: "Valid title",
                description: longDescription,
            };

            const result = createTaskSchema.safeParse(invalidTask);
            expect(result.success).toBe(false);
        });

        it("should fail when icon is too long", () => {
            const longIcon = "a".repeat(256);
            const invalidTask = {
                userId: "user_123",
                title: "Valid title",
                icon: longIcon,
            };

            const result = createTaskSchema.safeParse(invalidTask);
            expect(result.success).toBe(false);
        });
    });

    describe("updateTaskSchema", () => {
        it("should validate a valid update", () => {
            const validUpdate = {
                title: "New title",
                description: "New description",
            };

            const result = updateTaskSchema.safeParse(validUpdate);
            expect(result.success).toBe(true);
        });

        it("should fail when update title is too long", () => {
            const longTitle = "a".repeat(256);
            const invalidUpdate = {
                title: longTitle,
            };

            const result = updateTaskSchema.safeParse(invalidUpdate);
            expect(result.success).toBe(false);
        });

        it("should fail when update description is too long", () => {
            const longDescription = "a".repeat(5001);
            const invalidUpdate = {
                description: longDescription,
            };

            const result = updateTaskSchema.safeParse(invalidUpdate);
            expect(result.success).toBe(false);
        });
    });
});
