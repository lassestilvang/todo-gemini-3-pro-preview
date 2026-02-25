import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { runInAuthContext, clearMockAuthUser } from "@/test/auth-helpers";
import { runInAuthContext } from "@/test/mocks";
import { createTask, getTasks } from "@/lib/actions/tasks";
import { createLabel } from "@/lib/actions/labels";
import { isSuccess } from "@/lib/action-result";

describe("Integration: Security Task Labels IDOR", () => {
    let victim: any;
    let attacker: any;
    let victimId: string;
    let attackerId: string;
    let victimLabelId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        clearMockAuthUser();

        // Create users with random IDs to avoid collisions
        const suffix = Math.random().toString(36).substring(7);
        victim = await createTestUser(`victim_${suffix}`, `victim_${suffix}@target.com`);
        attacker = await createTestUser(`attacker_${suffix}`, `attacker_${suffix}@evil.com`);
        victimId = victim.id;
        attackerId = attacker.id;

        // Login as Victim to create a private label
        await runInAuthContext(victim, async () => {
            const labelResult = await createLabel({
                userId: victimId,
                name: "Secret Project",
                color: "#ff0000",
                icon: "lock",
                position: 0
            });

            if (!labelResult.success || !labelResult.data) {
                throw new Error("Failed to create victim label");
            }
            victimLabelId = labelResult.data.id;
        });
    });

    it("should NOT allow linking another user's label to my task", async () => {
        // Attacker tries to create a task using Victim's label ID
        await runInAuthContext(attacker, async () => {
            const taskResult = await createTask({
                userId: attackerId,
                title: "My Evil Task",
                labelIds: [victimLabelId]
            });
            expect(isSuccess(taskResult)).toBe(true);
            if (!isSuccess(taskResult)) return;

            // Fetch tasks to see if the label was attached and leaked
            // Add small delay to mitigate potential CI race conditions with SQLite
            await new Promise(resolve => setTimeout(resolve, 100));
            const tasksResult = await getTasks(attackerId);
            expect(isSuccess(tasksResult)).toBe(true);
            if (!isSuccess(tasksResult)) return;
            const createdTask = tasksResult.data.find(t => t.id === taskResult.data.id);

            expect(createdTask).toBeDefined();

            // VULNERABILITY CHECK:
            // If the vulnerability exists, the task WILL have the label.
            // We assert the SECURE behavior: the task should have NO labels.
            expect(createdTask?.labels).toHaveLength(0);

            // If it failed above, it means we successfully stole the label details:
            if (createdTask?.labels.length && createdTask.labels.length > 0) {
                 const leakedLabel = createdTask.labels[0];
                 console.log("VULNERABILITY CONFIRMED: Leaked label details:", leakedLabel);
                 expect(leakedLabel.name).not.toBe("Secret Project"); // This should fail if vulnerable
            }
        });
    });
});
