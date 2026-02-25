import { describe, it, expect, beforeEach, beforeAll, afterEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser, runInAuthContext } from "@/test/mocks";
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
        // Create users with unique IDs to prevent collisions
        victim = await createTestUser(`victim-${crypto.randomUUID()}`, "victim@target.com");
        attacker = await createTestUser(`attacker-${crypto.randomUUID()}`, "attacker@evil.com");
        victimId = victim.id;
        attackerId = attacker.id;

        // Login as Victim to create a task
        setMockAuthUser(victim);
        const taskResult = await createTask({
            userId: victimId,
            title: "Sensitive Project Task",
            description: "Top secret",
        });

        if (!isSuccess(taskResult)) {
            throw new Error("Failed to create victim task");
        }
        victimTaskId = taskResult.data.id;
        clearMockAuthUser();
    });

    afterEach(() => {
        clearMockAuthUser();
    });

    it("should prevent creating a subtask under another user's task", async () => {
        // Attacker tries to create a subtask linked to Victim's task
        await runInAuthContext(attacker, async () => {
            const result = await createSubtask(victimTaskId, attackerId, "Evil Subtask");
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                // If the user context is lost, we get UNAUTHORIZED (401)
                // If the user context is present but IDOR is blocked, we get NOT_FOUND (404) or FORBIDDEN (403)
                // We expect NOT_FOUND as per security best practices (hiding resource existence)
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
        // Attacker tries to create a task with parentId set to Victim's task
        await runInAuthContext(attacker, async () => {
            const result = await createTask({
                userId: attackerId,
                title: "Evil Child Task",
                parentId: victimTaskId
            });
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(["NOT_FOUND", "UNAUTHORIZED"]).toContain(result.error.code);
            }
        });
    });
});
