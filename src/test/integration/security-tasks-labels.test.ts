import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { createTask, getTasks } from "@/lib/actions/tasks";
import { createLabel } from "@/lib/actions/labels";

describe("Integration: Security Task Labels IDOR", () => {
    let victimId: string;
    let attackerId: string;
    let victimLabelId: number;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        // Create users
        const victim = await createTestUser("victim", "victim@target.com");
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        victimId = victim.id;
        attackerId = attacker.id;

        // Login as Victim to create a private label
        setMockAuthUser({
            id: victimId,
            email: victim.email,
            firstName: victim.firstName,
            lastName: victim.lastName,
            profilePictureUrl: null
        });

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

        // Switch to Attacker
        setMockAuthUser({
            id: attackerId,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    it("should NOT allow linking another user's label to my task", async () => {
        // Attacker tries to create a task using Victim's label ID
        const task = await createTask({
            userId: attackerId,
            title: "My Evil Task",
            labelIds: [victimLabelId]
        });

        // Fetch tasks to see if the label was attached and leaked
        const tasks = await getTasks(attackerId);
        const createdTask = tasks.find(t => t.id === task.id);

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
