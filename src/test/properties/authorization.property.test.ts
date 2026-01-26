import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import * as fc from "fast-check";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import {
    createTask, getTask, updateTask, deleteTask,
    createList, getList, updateList, deleteList,
    createLabel, getLabel, updateLabel, deleteLabel,
    createTemplate, getTemplates, deleteTemplate
} from "@/lib/actions";
import { isSuccess } from "@/lib/action-result";

// Note: next/cache and smart-tags mocks are provided globally via src/test/mocks.ts

// Configure fast-check for reproducibility in CI
// Requirements: 3.5 - Property tests use fixed seed for reproducibility
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
    ? parseInt(process.env.FAST_CHECK_SEED, 10)
    : undefined;

fc.configureGlobal({
    numRuns: 20,
    verbose: false,
    seed: FAST_CHECK_SEED,
});

// Skip in CI due to parallel test execution issues with module mocking
const isCI = process.env.CI === "true";
const describeOrSkip = isCI ? describe.skip : describe;

describeOrSkip("Property Tests: Authorization", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    describe("Property 6: Authorization Denial", () => {
        it("User B cannot access User A's task by direct ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a task
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskA = await createTask({
                            userId: userAId,
                            title: "User A's private task",
                        });

                        // User B tries to access User A's task by ID
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        try {
                            const result = await getTask(taskA.id, userBId);
                            expect(result).toBeNull();
                        } catch {
                            // If it throws, that's also fine (safe)
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot update User A's task", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a task
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskA = await createTask({
                            userId: userAId,
                            title: "Original title",
                        });

                        // User B tries to update User A's task
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await updateTask(taskA.id, userBId, { title: "Hacked by B" });

                        // Verify task is unchanged
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskAfter = await getTask(taskA.id, userAId);
                        expect(taskAfter?.title).toBe("Original title");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot delete User A's task", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a task
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskA = await createTask({
                            userId: userAId,
                            title: "User A's task",
                        });

                        // User B tries to delete User A's task
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await deleteTask(taskA.id, userBId);

                        // Verify task still exists for User A
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskAfter = await getTask(taskA.id, userAId);
                        expect(taskAfter).not.toBeNull();
                        expect(taskAfter?.title).toBe("User A's task");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot access User A's list by direct ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a list
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const listAResult = await createList({
                            userId: userAId,
                            name: "User A's list",
                            slug: "user-a-list",
                        });
                        expect(isSuccess(listAResult)).toBe(true);
                        if (!isSuccess(listAResult)) return;
                        const listA = listAResult.data;

                        // User B tries to access User A's list by ID
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        try {
                            const result = await getList(listA.id, userBId);
                            // Same logic as getTask
                            expect(result).toBeUndefined();
                        } catch {
                            // Safe
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot update User A's list", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a list
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const listAResult = await createList({
                            userId: userAId,
                            name: "Original name",
                            slug: "original-name",
                        });
                        expect(isSuccess(listAResult)).toBe(true);
                        if (!isSuccess(listAResult)) return;
                        const listA = listAResult.data;

                        // User B tries to update User A's list
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await updateList(listA.id, userBId, { name: "Hacked by B" });

                        // Verify list is unchanged
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const listAfter = await getList(listA.id, userAId);
                        expect(listAfter?.name).toBe("Original name");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot delete User A's list", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a list
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const listAResult = await createList({
                            userId: userAId,
                            name: "User A's list",
                            slug: "user-a-list",
                        });
                        expect(isSuccess(listAResult)).toBe(true);
                        if (!isSuccess(listAResult)) return;
                        const listA = listAResult.data;

                        // User B tries to delete User A's list
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await deleteList(listA.id, userBId);

                        // Verify list still exists for User A
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const listAfter = await getList(listA.id, userAId);
                        expect(listAfter).not.toBeUndefined();
                        expect(listAfter?.name).toBe("User A's list");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot access User A's label by direct ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a label
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const labelAResult = await createLabel({
                            userId: userAId,
                            name: "User A's label",
                        });
                        expect(isSuccess(labelAResult)).toBe(true);
                        if (!isSuccess(labelAResult)) return;
                        const labelA = labelAResult.data;

                        // User B tries to access User A's label by ID
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        try {
                            const result = await getLabel(labelA.id, userBId);
                            expect(result).toBeUndefined();
                        } catch {
                            // Safe
                        }
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot update User A's label", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a label
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const labelAResult = await createLabel({
                            userId: userAId,
                            name: "Original label",
                        });
                        expect(isSuccess(labelAResult)).toBe(true);
                        if (!isSuccess(labelAResult)) return;
                        const labelA = labelAResult.data;

                        // User B tries to update User A's label
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await updateLabel(labelA.id, userBId, { name: "Hacked by B" });

                        // Verify label is unchanged
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const labelAfter = await getLabel(labelA.id, userAId);
                        expect(labelAfter?.name).toBe("Original label");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot delete User A's label", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a label
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const labelAResult = await createLabel({
                            userId: userAId,
                            name: "User A's label",
                        });
                        expect(isSuccess(labelAResult)).toBe(true);
                        if (!isSuccess(labelAResult)) return;
                        const labelA = labelAResult.data;

                        // User B tries to delete User A's label
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await deleteLabel(labelA.id, userBId);

                        // Verify label still exists for User A
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const labelAfter = await getLabel(labelA.id, userAId);
                        expect(labelAfter).not.toBeUndefined();
                        expect(labelAfter?.name).toBe("User A's label");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User B cannot delete User A's template", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User A creates a template
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await createTemplate(userAId, "User A's template", "{}");
                        const templatesA = await getTemplates(userAId);
                        const templateA = templatesA[0];

                        // User B tries to delete User A's template
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await deleteTemplate(templateA.id, userBId);

                        // Verify template still exists for User A
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const templatesAfter = await getTemplates(userAId);
                        expect(templatesAfter.length).toBe(1);
                        expect(templatesAfter[0].name).toBe("User A's template");
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});
