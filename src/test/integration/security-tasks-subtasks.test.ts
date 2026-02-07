import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createTask, createSubtask, getTasks } from "@/lib/actions/tasks";
import { NotFoundError } from "@/lib/action-result";

describe("Integration: Security Subtask IDOR", () => {
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

        const task = await createTask({
            userId: victimId,
            title: "Sensitive Project Task",
            description: "Top secret",
        });

        if (!task) {
            throw new Error("Failed to create victim task");
        }
        victimTaskId = task.id;

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
        let error: unknown = null;
        let subtask = null;
        try {
             subtask = await createSubtask(victimTaskId, attackerId, "Evil Subtask");
        } catch (e) {
            error = e;
        }

        // Should fail
        expect(subtask).toBeNull();
        expect(error).toBeDefined();

        // Check if it's the expected error
        // createSubtask throws NotFoundError if parent task is not found/owned
        expect(error).toBeInstanceOf(NotFoundError);

        // Double check: Ensure no linkage happened in DB
        setMockAuthUser({ id: victimId, email: "victim@target.com", firstName: "Test", lastName: "User", profilePictureUrl: null });
        const tasks = await getTasks(victimId);
        const victimTask = tasks.find(t => t.id === victimTaskId);
        const leakedSubtask = victimTask?.subtasks?.find(t => t.title === "Evil Subtask");
        expect(leakedSubtask).toBeUndefined();
    });

    it("should prevent creating a task with parentId pointing to another user's task", async () => {
        // Attacker tries to create a task with parentId set to Victim's task
        let error: unknown = null;
        let task = null;
        try {
             task = await createTask({
                userId: attackerId,
                title: "Evil Child Task",
                parentId: victimTaskId
             });
        } catch (e) {
            error = e;
        }

        // Should fail
        expect(task).toBeNull();
        expect(error).toBeDefined();
        expect(error).toBeInstanceOf(NotFoundError);
    });
});
