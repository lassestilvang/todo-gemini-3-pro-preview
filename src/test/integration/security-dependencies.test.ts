import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { addDependency, removeDependency } from "@/lib/actions/dependencies";
import { createReminder, deleteReminder } from "@/lib/actions/reminders";
import { isFailure } from "@/lib/action-result";
import { db, tasks, reminders } from "@/db";

describe("Integration: Security Dependencies & Reminders", () => {
    let attackerId: string;
    let victimId: string;
    let task1Id: number;
    let task2Id: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        const attacker = await createTestUser("attacker_dep", "attacker_dep@evil.com");
        const victim = await createTestUser("victim_dep", "victim_dep@target.com");

        attackerId = attacker.id;
        victimId = victim.id;

        // Create tasks for victim directly in DB to avoid using potentially broken actions
        const [t1] = await db.insert(tasks).values({
            userId: victimId,
            title: "Victim Task 1",
            listId: null,
            position: 0
        }).returning();

        const [t2] = await db.insert(tasks).values({
            userId: victimId,
            title: "Victim Task 2",
            listId: null,
            position: 0
        }).returning();

        task1Id = t1.id;
        task2Id = t2.id;

        // Set auth context to attacker
        setMockAuthUser({
            id: attacker.id,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    it("should fail when adding dependency for another user (Impersonation)", async () => {
        // Attacker tries to use victimId as the first argument
        const result = await addDependency(victimId, task1Id, task2Id);

        // Should be forbidden because auth user (attacker) != userId arg (victim)
        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when removing dependency for another user (Impersonation)", async () => {
        const result = await removeDependency(victimId, task1Id, task2Id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    // Reminders tests
    it("should fail when creating reminder for another user (Impersonation)", async () => {
        const result = await createReminder(victimId, task1Id, new Date());

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when deleting reminder for another user (Impersonation)", async () => {
         // Create a reminder first (as victim)
         setMockAuthUser({ id: victimId, email: "victim@target.com" });
         const [r1] = await db.insert(reminders).values({
             taskId: task1Id,
             remindAt: new Date()
         }).returning();

         // Switch back to attacker
         setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        const result = await deleteReminder(victimId, r1.id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });
});
