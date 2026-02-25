import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { updateUserPreferences } from "./user";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { isSuccess, isFailure } from "../action-result";

describe("User Actions", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;
        const user = await createTestUser(testUserId, `${testUserId}@example.com`);
        setMockAuthUser(user);
    });

    describe("updateUserPreferences", () => {
        it("should update valid preferences", async () => {
            const result = await updateUserPreferences(testUserId, {
                use24HourClock: true,
                calendarDenseTooltipThreshold: 5
            });
            expect(isSuccess(result)).toBe(true);

            const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId)
            });
            expect(user?.use24HourClock).toBe(true);
            expect(user?.calendarDenseTooltipThreshold).toBe(5);
        });

        it("should reject invalid calendarDenseTooltipThreshold (too low)", async () => {
            const result = await updateUserPreferences(testUserId, {
                calendarDenseTooltipThreshold: 0
            });
            expect(isFailure(result)).toBe(true);
            if (isFailure(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
                expect(result.error.details?.calendarDenseTooltipThreshold).toBeDefined();
            }
        });

        it("should reject invalid calendarDenseTooltipThreshold (too high)", async () => {
            const result = await updateUserPreferences(testUserId, {
                calendarDenseTooltipThreshold: 21
            });
            expect(isFailure(result)).toBe(true);
             if (isFailure(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("should reject float calendarDenseTooltipThreshold", async () => {
             const result = await updateUserPreferences(testUserId, {
                calendarDenseTooltipThreshold: 5.5
            });
            expect(isFailure(result)).toBe(true);
             if (isFailure(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("should ignore extra fields (Mass Assignment protection)", async () => {
             // We can't easily test this directly because TypeScript won't let us pass extra fields.
             // But we can cast to any.
             const maliciousData = {
                 use24HourClock: true,
                 isAdmin: true, // Hypothetical field
                 email: "hacked@example.com"
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             } as any;

             const result = await updateUserPreferences(testUserId, maliciousData);
             expect(isSuccess(result)).toBe(true);

             const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId)
            });
            // Email should NOT change (users table has email, but updateUserPreferences logic doesn't touch it)
            expect(user?.email).toBe(`${testUserId}@example.com`);
        });

        it("should handle null values correctly", async () => {
             // First set a value
             await updateUserPreferences(testUserId, { calendarDenseTooltipThreshold: 10 });

             // Then unset it
             const result = await updateUserPreferences(testUserId, { calendarDenseTooltipThreshold: null });
             expect(isSuccess(result)).toBe(true);

             const user = await db.query.users.findFirst({
                where: eq(users.id, testUserId)
            });
            expect(user?.calendarDenseTooltipThreshold).toBeNull();
        });
    });
});
