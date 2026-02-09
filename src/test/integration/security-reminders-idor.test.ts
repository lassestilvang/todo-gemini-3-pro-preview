import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { getReminders, createReminder } from "@/lib/actions/reminders";
import { createTask } from "@/lib/actions/tasks";
import { setMockAuthUser } from "@/test/mocks";

describe("Security: IDOR in Reminders", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
    });

    it("should NOT allow User B to access User A's reminders", async () => {
        // 1. Create User A and User B
        const userA = await createTestUser("user-a", "user.a@example.com");
        const userB = await createTestUser("user-b", "user.b@example.com");

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
