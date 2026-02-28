import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser, resetTestDb } from "@/test/setup";
import { runInAuthContext } from "@/test/mocks";
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
        let victimTaskId: number;
        await runInAuthContext({ id: victimId, email: "victim@target.com" }, async () => {
            const victimTaskResult = await createTask({
                userId: victimId,
                title: "Victim Task",
            });
            if (isFailure(victimTaskResult)) throw new Error("Failed to create victim task");
            victimTaskId = victimTaskResult.data.id;
        });

        // 2. Create a task for the attacker
        let attackerTaskId: number;
        await runInAuthContext({ id: attackerId, email: "attacker@evil.com" }, async () => {
            const attackerTaskResult = await createTask({
                userId: attackerId,
                title: "Attacker Task",
            });
            if (isFailure(attackerTaskResult)) throw new Error("Failed to create attacker task");
            attackerTaskId = attackerTaskResult.data.id;
        });

        // 3. Try to update attacker's task to be a child of victim's task
        await runInAuthContext({ id: attackerId, email: "attacker@evil.com" }, async () => {
            const updateResult = await updateTask(attackerTaskId, attackerId, {
                parentId: victimTaskId
            });

            // 4. Expect failure or verify if it succeeded (vulnerability check)
            expect(isFailure(updateResult)).toBe(true);
            if (isFailure(updateResult)) {
                expect(updateResult.error.code).toBe("NOT_FOUND");
                expect(updateResult.error.message).toContain("Parent task not found or access denied");
            }
        });
    });

    it("should prevent setting a task as its own parent", async () => {
        // Create a task
        await runInAuthContext({ id: victimId, email: "victim@target.com" }, async () => {
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
});
