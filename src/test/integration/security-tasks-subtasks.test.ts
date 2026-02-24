import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { runInAuthContext, clearMockAuthUser } from "@/test/auth-helpers";
import { createTask, createSubtask, getTasks } from "@/lib/actions/tasks";
import { isSuccess } from "@/lib/action-result";

describe("Integration: Security Subtask IDOR", () => {
    let victim: any;
    let attacker: any;
    let victimId: string;
    let attackerId: string;
    let victimTaskId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        clearMockAuthUser();
        // Create users
        const suffix = Math.random().toString(36).substring(7);
        victim = await createTestUser(`victim_${suffix}`, `victim_${suffix}@target.com`);
        attacker = await createTestUser(`attacker_${suffix}`, `attacker_${suffix}@evil.com`);
        victimId = victim.id;
        attackerId = attacker.id;

        // Login as Victim to create a task
        await runInAuthContext(victim, async () => {
            const taskResult = await createTask({
                userId: victimId,
                title: "Sensitive Project Task",
                description: "Top secret",
            });

            if (!isSuccess(taskResult)) {
                throw new Error("Failed to create victim task");
            }
            victimTaskId = taskResult.data.id;
        });
    });

    it("should prevent creating a subtask under another user's task", async () => {
        await runInAuthContext(attacker, async () => {
            // Attacker tries to create a subtask linked to Victim's task
            const result = await createSubtask(victimTaskId, attackerId, "Evil Subtask");
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("NOT_FOUND");
            }
        });

        // Double check: Ensure no linkage happened in DB
        await runInAuthContext(victim, async () => {
            const tasksResult = await getTasks(victimId);
            expect(isSuccess(tasksResult)).toBe(true);
            if (!isSuccess(tasksResult)) return;
            const victimTask = tasksResult.data.find(t => t.id === victimTaskId);
            const leakedSubtask = victimTask?.subtasks?.find(t => t.title === "Evil Subtask");
            expect(leakedSubtask).toBeUndefined();
        });
    });

    it("should prevent creating a task with parentId pointing to another user's task", async () => {
        await runInAuthContext(attacker, async () => {
            // Attacker tries to create a task with parentId set to Victim's task
            const result = await createTask({
                userId: attackerId,
                title: "Evil Child Task",
                parentId: victimTaskId
            });
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("NOT_FOUND");
            }
        });
    });
});
