import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser, resetTestDb } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { isFailure } from "@/lib/action-result";

describe("Integration: Security Task Parent IDOR", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        const victim = await createTestUser("victim", "victim@target.com");

        attackerId = attacker.id;
        victimId = victim.id;
    });

    it("should prevent setting a parent task that belongs to another user", async () => {
        // 1. Create a task for the victim
        setMockAuthUser({ id: victimId, email: "victim@target.com" });
        const victimTaskResult = await createTask({
            userId: victimId,
            title: "Victim Task",
        });
        if (isFailure(victimTaskResult)) throw new Error("Failed to create victim task");
        const victimTask = victimTaskResult.data;

        // 2. Create a task for the attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });
        const attackerTaskResult = await createTask({
            userId: attackerId,
            title: "Attacker Task",
        });
        if (isFailure(attackerTaskResult)) throw new Error("Failed to create attacker task");
        const attackerTask = attackerTaskResult.data;

        // 3. Try to update attacker's task to be a child of victim's task
        const updateResult = await updateTask(attackerTask.id, attackerId, {
            parentId: victimTask.id
        });

        // 4. Expect failure or verify if it succeeded (vulnerability check)
        // If the vulnerability exists, this might succeed or fail depending on validation
        // But if it succeeds, we have a problem.

        // If it fails with "NotFound" or "Forbidden", we are good.
        // If it succeeds, we verify if the task is linked.

        expect(isFailure(updateResult)).toBe(true);
        if (isFailure(updateResult)) {
           expect(updateResult.error.code).toBe("NOT_FOUND");
           expect(updateResult.error.message).toContain("Parent task not found or access denied");
        }
    });

    it("should prevent setting a task as its own parent", async () => {
        // Create a task
        setMockAuthUser({ id: victimId, email: "victim@target.com" });
        const taskResult = await createTask({
            userId: victimId,
            title: "Task with self-parent",
        });
        if (isFailure(taskResult)) throw new Error("Failed to create task");
        const task = taskResult.data;

        // Try to update task to be its own parent
        const updateResult = await updateTask(task.id, victimId, {
            parentId: task.id
        });

        expect(isFailure(updateResult)).toBe(true);
        if (isFailure(updateResult)) {
            // It might fail with "Task cannot be its own parent" (which I added)
            // OR "Parent task not found" if my logic for getting parent task runs first?
            // The check I added is before the DB query.
            expect(updateResult.error.message).toContain("Task cannot be its own parent");
        }
    });
});
