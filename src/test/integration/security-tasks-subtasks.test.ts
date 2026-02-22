import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createTask, createSubtask, getTasks } from "@/lib/actions/tasks";
import { isSuccess } from "@/lib/action-result";

const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip("Integration: Security Subtask IDOR", () => {
    let victimId: string;
    let attackerId: string;
    let victimTaskId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        // Create users
        const victim = await createTestUser("victim", "victim@target.com");
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        victimId = victim.id;
        attackerId = attacker.id;

        // Login as Victim to create a task
        setMockAuthUser({
            id: victimId,
            email: victim.email,
            firstName: victim.firstName,
            lastName: victim.lastName,
            profilePictureUrl: null
        });

        const taskResult = await createTask({
            userId: victimId,
            title: "Sensitive Project Task",
            description: "Top secret",
        });

        if (!isSuccess(taskResult)) {
            throw new Error("Failed to create victim task");
        }
        victimTaskId = taskResult.data.id;

        // Switch to Attacker
        setMockAuthUser({
            id: attackerId,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    it("should prevent creating a subtask under another user's task", async () => {
        // Attacker tries to create a subtask linked to Victim's task
        const result = await createSubtask(victimTaskId, attackerId, "Evil Subtask");
        expect(isSuccess(result)).toBe(false);
        if (!isSuccess(result)) {
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Double check: Ensure no linkage happened in DB
        setMockAuthUser({ id: victimId, email: "victim@target.com", firstName: "Test", lastName: "User", profilePictureUrl: null });
        const tasksResult = await getTasks(victimId);
        expect(isSuccess(tasksResult)).toBe(true);
        if (!isSuccess(tasksResult)) return;
        const victimTask = tasksResult.data.find(t => t.id === victimTaskId);
        const leakedSubtask = victimTask?.subtasks?.find(t => t.title === "Evil Subtask");
        expect(leakedSubtask).toBeUndefined();
    });

    it("should prevent creating a task with parentId pointing to another user's task", async () => {
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
