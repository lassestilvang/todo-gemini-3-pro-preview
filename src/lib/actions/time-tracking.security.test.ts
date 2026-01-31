import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { startTimeEntry, getTimeStats } from "@/lib/actions/time-tracking";
import { sqliteConnection } from "@/db";

// Helper functions (since they aren't exported from setup.tsx)
async function createTestList(userId: string, name: string) {
    sqliteConnection.run(
        "INSERT INTO lists (user_id, name, slug, position) VALUES (?, ?, ?, ?)",
        [userId, name, name.toLowerCase().replace(/\s+/g, '-'), 0]
    );
    return sqliteConnection.query("SELECT * FROM lists WHERE user_id = ? AND name = ?").get(userId, name) as { id: number; user_id: string; name: string };
}

async function createTestTask(userId: string, listId: number, title: string) {
    sqliteConnection.run(
        "INSERT INTO tasks (user_id, list_id, title) VALUES (?, ?, ?)",
        [userId, listId, title]
    );
    return sqliteConnection.query("SELECT * FROM tasks WHERE user_id = ? AND title = ?").get(userId, title) as { id: number; user_id: string; list_id: number; title: string };
}

describe("Security Tests: Time Tracking Actions", () => {
    let victimId: string;
    let victimTaskId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();

        // Create attacker and victim
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        const victim = await createTestUser("victim", "victim@innocent.com");
        victimId = victim.id;

        // Create a task for victim
        const victimList = await createTestList(victimId, "Victim List");
        const victimTask = await createTestTask(victimId, victimList.id, "Victim Task");
        victimTaskId = victimTask.id;

        // Authenticate as Attacker
        setMockAuthUser({
            id: attacker.id,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    it("should prevent cross-user start time entry (IDOR)", async () => {
        // Attacker tries to start time for Victim
        const result = await startTimeEntry(victimTaskId, victimId);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should prevent cross-user get time stats (IDOR)", async () => {
        // Attacker tries to get stats for Victim
        const result = await getTimeStats(victimId);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });
});
