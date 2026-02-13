import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { db, lists } from "@/db";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { setTodoistProjectMappings, setTodoistLabelMappings } from "@/lib/actions/todoist";
import { setMockAuthUser } from "@/test/mocks";

describe("Security: List IDOR in Task Operations", () => {
    const userAId = "user-a";
    const userBId = "user-b";

    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
        await createTestUser(userAId, "a@example.com");
        await createTestUser(userBId, "b@example.com");
    });

    it("should prevent creating a task in another user's list", async () => {
        // User A creates a list
        setMockAuthUser({ id: userAId, email: "a@example.com" });
        const listA = await db.insert(lists).values({
            userId: userAId,
            name: "User A List",
            slug: "user-a-list",
            position: 0,
        }).returning().then(res => res[0]);

        // User B tries to create a task in User A's list
        setMockAuthUser({ id: userBId, email: "b@example.com" });

        // This should fail
        const result = await createTask({
            userId: userBId,
            listId: listA.id,
            title: "Malicious Task",
            priority: "none",
        });

        // Verify the action failed
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.message).toContain("List not found");
            expect(result.error.code).toBe("NOT_FOUND");
        }

        // Verify the task was NOT created in the DB
        const maliciousTask = await db.query.tasks.findFirst({
            where: (tasks, { eq, and }) => and(eq(tasks.userId, userBId), eq(tasks.listId, listA.id)),
        });

        expect(maliciousTask).toBeUndefined();
    });

    it("should prevent moving a task to another user's list", async () => {
        // User A creates a list
        setMockAuthUser({ id: userAId, email: "a@example.com" });
        const listA = await db.insert(lists).values({
            userId: userAId,
            name: "User A List",
            slug: "user-a-list",
            position: 0,
        }).returning().then(res => res[0]);

        // User B creates a task in their own list (or no list)
        setMockAuthUser({ id: userBId, email: "b@example.com" });
        const taskB = await createTask({
            userId: userBId,
            title: "User B Task",
            priority: "none",
        });

        if (!taskB.success || !taskB.data) throw new Error("Failed to create task B");

        // User B tries to update the task to move it to User A's list
        const updateResult = await updateTask(taskB.data.id, userBId, {
            listId: listA.id,
        });

        // Verify the action failed
        expect(updateResult.success).toBe(false);
        if (!updateResult.success) {
            expect(updateResult.error.message).toContain("List not found");
            expect(updateResult.error.code).toBe("NOT_FOUND");
        }

        // Verify the task is still NOT in List A
        const updatedTask = await db.query.tasks.findFirst({
            where: (tasks, { eq }) => eq(tasks.id, taskB.data!.id),
        });

        expect(updatedTask?.listId).not.toBe(listA.id);
        expect(updatedTask?.listId).toBeNull();
    });

    it("should prevent Todoist project mappings with another user's list", async () => {
        // User A creates a list
        setMockAuthUser({ id: userAId, email: "a@example.com" });
        const listA = await db.insert(lists).values({
            userId: userAId,
            name: "User A List",
            slug: "user-a-list",
            position: 0,
        }).returning().then(res => res[0]);

        // User B tries to map their Todoist project to User A's list
        setMockAuthUser({ id: userBId, email: "b@example.com" });

        const result = await setTodoistProjectMappings([
            { projectId: "123", listId: listA.id }
        ]);

        // Verify the action failed
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("One or more lists not found or access denied");
        }
    });

    it("should prevent Todoist label mappings with another user's list", async () => {
        // User A creates a list
        setMockAuthUser({ id: userAId, email: "a@example.com" });
        const listA = await db.insert(lists).values({
            userId: userAId,
            name: "User A List",
            slug: "user-a-list",
            position: 0,
        }).returning().then(res => res[0]);

        // User B tries to map their Todoist label to User A's list
        setMockAuthUser({ id: userBId, email: "b@example.com" });

        const result = await setTodoistLabelMappings([
            { labelId: "456", listId: listA.id }
        ]);

        // Verify the action failed
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("One or more lists not found or access denied");
        }
    });
});
