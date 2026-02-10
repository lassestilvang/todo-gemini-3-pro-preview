import { describe, it, expect, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { getReminders, createReminder } from "@/lib/actions/reminders";
import { createTask } from "@/lib/actions/tasks";
import { setMockAuthUser } from "@/test/mocks";

describe("Security: IDOR in Reminders", () => {
    beforeAll(async () => {
        await setupTestDb();
        // Do NOT call resetTestDb() here or in beforeEach to avoid interfering with parallel tests
    });

    it("should NOT allow User B to access User A's reminders", async () => {
        // Use unique IDs to ensure isolation
        const idSuffix = Math.random().toString(36).substring(7);
        const userA = await createTestUser(`user-a-${idSuffix}`, `user.a.${idSuffix}@example.com`);
        const userB = await createTestUser(`user-b-${idSuffix}`, `user.b.${idSuffix}@example.com`);

        // 2. User A creates a task and a reminder
        setMockAuthUser(userA);
        const taskA = await createTask({
            userId: userA.id,
            title: "User A's Task",
        });

        await createReminder(userA.id, taskA.id, new Date());

        // 3. User B tries to access User A's reminders
        setMockAuthUser(userB);

        // getReminders now takes userId and verifies ownership
        const reminders = await getReminders(taskA.id, userB.id);

        // 4. Assert that User B receives an empty array (Access Denied)
        expect(reminders.length).toBe(0);
    });
});
