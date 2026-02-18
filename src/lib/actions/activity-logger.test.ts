
import { logActivity } from "./activity-logger";
import { db, taskLogs, eq, and } from "./shared";
import { expect, test, describe, beforeAll, afterAll } from "bun:test";

describe("logActivity internal helper", () => {
    const testUserId = "test-user-logger";
    const victimUserId = "victim-user-logger";

    beforeAll(async () => {
        // Clean up any existing logs for test users
        await db.delete(taskLogs).where(eq(taskLogs.userId, testUserId));
        await db.delete(taskLogs).where(eq(taskLogs.userId, victimUserId));
    });

    afterAll(async () => {
        // Clean up
        await db.delete(taskLogs).where(eq(taskLogs.userId, testUserId));
        await db.delete(taskLogs).where(eq(taskLogs.userId, victimUserId));
    });

    test("should log activity correctly", async () => {
        // Log activity (internal helper usage)
        await logActivity({
            userId: testUserId,
            action: "test_action",
            details: "Test details",
        });

        // Verify the log was created
        const logs = await db
            .select()
            .from(taskLogs)
            .where(and(eq(taskLogs.userId, testUserId), eq(taskLogs.action, "test_action")));

        expect(logs.length).toBe(1);
        expect(logs[0].details).toBe("Test details");
    });
});
