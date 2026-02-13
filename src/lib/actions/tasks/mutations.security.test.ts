import { describe, expect, it, beforeAll, beforeEach, mock } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { createTask, createList } from "@/lib/actions";
import { setMockAuthUser } from "@/test/mocks";
import { tasks, db } from "@/db";
import { eq } from "drizzle-orm";

// Mock suggestMetadata to simulate prompt injection returning another user's list ID
let maliciousListId: number | null = null;

mock.module("@/lib/smart-tags", () => ({
    suggestMetadata: mock(async () => {
        if (maliciousListId) {
            return { listId: maliciousListId, labelIds: [] };
        }
        return { listId: null, labelIds: [] };
    })
}));

describe("Security: Task Mutations", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        attackerId = `attacker_${Math.random().toString(36).substring(7)}`;
        victimId = `victim_${Math.random().toString(36).substring(7)}`;

        await createTestUser(attackerId, `${attackerId}@example.com`);
        await createTestUser(victimId, `${victimId}@example.com`);

        maliciousListId = null;
    });

    it("should prevent creating task in another user's list via smart tags injection", async () => {
        // 1. Victim creates a list
        setMockAuthUser({ id: victimId, email: "victim@example.com" });
        const listResult = await createList({ userId: victimId, name: "Secret List", slug: "secret" });
        if (!listResult.success || !listResult.data) throw new Error("Failed to create list");
        const victimListId = listResult.data.id;

        // 2. Attacker tries to create a task, and smart tags "suggests" the victim's list
        setMockAuthUser({ id: attackerId, email: "attacker@example.com" });
        maliciousListId = victimListId;

        // Attacker creates a task without listId, triggering smart tags
        // The title doesn't matter here because we mocked suggestMetadata
        const taskResult = await createTask({
            userId: attackerId,
            title: "Hacked Task",
        });

        if (!taskResult.success || !taskResult.data) throw new Error("Failed to create task");
        const task = taskResult.data;

        // 3. Verification
        // The task should NOT be in the victim's list
        // If the vulnerability exists, this expectation will fail
        expect(task.listId).not.toBe(victimListId);

        // Check DB to be sure
        const [dbTask] = await db.select().from(tasks).where(eq(tasks.id, task.id));
        expect(dbTask.listId).not.toBe(victimListId);
    });
});
