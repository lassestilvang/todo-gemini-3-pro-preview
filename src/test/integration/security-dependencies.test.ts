import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { addDependency, removeDependency } from "@/lib/actions/dependencies";
import { createReminder, deleteReminder } from "@/lib/actions/reminders";
import { isFailure } from "@/lib/action-result";
import { db, tasks, reminders, taskDependencies } from "@/db";
import { eq, and } from "drizzle-orm";

const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip("Integration: Security Dependencies & Reminders", () => {
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

    it("should fail when attacker tries to add dependency between victim's tasks (IDOR)", async () => {
        // Attacker uses THEIR own ID (so requireUser passes), but tries to link victim's tasks
        const result = await addDependency(attackerId, task1Id, task2Id);

        // Should be NOT_FOUND because the tasks don't belong to attacker
        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            // Can be NOT_FOUND or FORBIDDEN depending on implementation details,
            // but NOT_FOUND is what we threw
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Verify dependency was NOT created
        const dep = await db.select().from(taskDependencies)
            .where(and(
                eq(taskDependencies.taskId, task1Id),
                eq(taskDependencies.blockerId, task2Id)
            ));

        expect(dep.length).toBe(0);
    });

    it("should fail when attacker tries to block their task with victim's task (IDOR)", async () => {
        // Create attacker's task
        const [at1] = await db.insert(tasks).values({
            userId: attackerId,
            title: "Attacker Task 1",
            position: 0
        }).returning();

        const result = await addDependency(attackerId, at1.id, task1Id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("NOT_FOUND");
        }

        const dep = await db.select().from(taskDependencies)
            .where(and(
                eq(taskDependencies.taskId, at1.id),
                eq(taskDependencies.blockerId, task1Id)
            ));

        expect(dep.length).toBe(0);
    });

    it("should fail when attacker tries to remove dependency between victim's tasks (IDOR)", async () => {
        // First, create a legitimate dependency for victim (as victim)
        await db.insert(taskDependencies).values({
            taskId: task1Id,
            blockerId: task2Id
        });

        // Switch back to attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        const result = await removeDependency(attackerId, task1Id, task2Id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Verify dependency STILL exists
        const dep = await db.select().from(taskDependencies)
            .where(and(
                eq(taskDependencies.taskId, task1Id),
                eq(taskDependencies.blockerId, task2Id)
            ));

        expect(dep.length).toBe(1);
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

    it("should fail when creating reminder for another user's task (IDOR)", async () => {
        // Attacker uses THEIR own ID but tries to add reminder to victim's task
        const result = await createReminder(attackerId, task1Id, new Date());

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Verify reminder was NOT created
        const rem = await db.select().from(reminders).where(eq(reminders.taskId, task1Id));
        expect(rem.length).toBe(0);
    });

    it("should fail when deleting another user's reminder (IDOR)", async () => {
         // Create a reminder first (as victim)
         setMockAuthUser({ id: victimId, email: "victim@target.com" });
         const [r1] = await db.insert(reminders).values({
             taskId: task1Id,
             remindAt: new Date()
         }).returning();

         // Switch back to attacker
         setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        // Attacker uses THEIR own ID but tries to delete victim's reminder
        const result = await deleteReminder(attackerId, r1.id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Verify reminder STILL exists
        const rem = await db.select().from(reminders).where(eq(reminders.id, r1.id));
        expect(rem.length).toBe(1);
    });
});
