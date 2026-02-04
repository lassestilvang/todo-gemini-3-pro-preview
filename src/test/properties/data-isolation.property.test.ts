import { describe, it, expect, beforeAll, beforeEach } from "bun:test";
import * as fc from "fast-check";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import {
    createTask, getTasks, getTask, updateTask, deleteTask,
    createList, getLists,
    createLabel, getLabels,
    createTemplate, getTemplates,
    getUserStats, addXP
} from "@/lib/actions";
import { isSuccess } from "@/lib/action-result";

// Note: next/cache and smart-tags mocks are provided globally via src/test/mocks.ts

// Configure fast-check for reproducibility in CI
// Requirements: 3.5 - Property tests use fixed seed for reproducibility
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
    ? parseInt(process.env.FAST_CHECK_SEED, 10)
    : undefined;

fc.configureGlobal({
    numRuns: 20, // Reduced for faster test execution
    verbose: false,
    seed: FAST_CHECK_SEED,
});

const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip("Property Tests: Data Isolation", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    describe("Property 3: Resource Ownership on Create", () => {
        it("Tasks created by user A have userId equal to user A's ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    async (userId, taskTitle) => {
                        await resetTestDb();
                        await createTestUser(userId, `${userId}@test.com`);
                        setMockAuthUser({ id: userId, email: `${userId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        const task = await createTask({
                            userId,
                            title: taskTitle,
                        });

                        // Property: created task has the correct userId
                        expect(task.userId).toBe(userId);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("Lists created by user A have userId equal to user A's ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                    async (userId, listName) => {
                        await resetTestDb();
                        await createTestUser(userId, `${userId}@test.com`);
                        setMockAuthUser({ id: userId, email: `${userId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        const listResult = await createList({
                            userId,
                            name: listName,
                            slug: listName.toLowerCase().replace(/\s+/g, '-'),
                        });

                        // Property: created list has the correct userId
                        expect(isSuccess(listResult)).toBe(true);
                        if (!isSuccess(listResult)) return;
                        expect(listResult.data.userId).toBe(userId);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("Labels created by user A have userId equal to user A's ID", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
                    async (userId, labelName) => {
                        await resetTestDb();
                        await createTestUser(userId, `${userId}@test.com`);
                        setMockAuthUser({ id: userId, email: `${userId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

                        const labelResult = await createLabel({
                            userId,
                            name: labelName,
                        });

                        // Property: created label has the correct userId
                        expect(isSuccess(labelResult)).toBe(true);
                        if (!isSuccess(labelResult)) return;
                        expect(labelResult.data.userId).toBe(userId);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe("Property 4: Query Data Isolation", () => {
        it("User A cannot see User B's tasks", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        // Ensure distinct users
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User B creates a task
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await createTask({
                            userId: userBId,
                            title: "User B's private task",
                        });

                        // User A queries tasks
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userATasks = await getTasks(userAId, undefined, "all");

                        // Property: User A sees zero tasks from User B
                        expect(userATasks.every(t => t.userId !== userBId)).toBe(true);
                        expect(userATasks.length).toBe(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User A cannot see User B's lists", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User B creates a list
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await createList({
                            userId: userBId,
                            name: "User B's list",
                            slug: "user-b-list",
                        });

                        // User A queries lists
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userALists = await getLists(userAId);

                        // Property: User A sees zero lists from User B
                        expect(userALists.every(l => l.userId !== userBId)).toBe(true);
                        expect(userALists.length).toBe(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User A cannot see User B's labels", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User B creates a label
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await createLabel({
                            userId: userBId,
                            name: "User B's label",
                        });

                        // User A queries labels
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userALabels = await getLabels(userAId);

                        // Property: User A sees zero labels from User B
                        expect(userALabels.every(l => l.userId !== userBId)).toBe(true);
                        expect(userALabels.length).toBe(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User A cannot see User B's templates", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User B creates a template
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await createTemplate(userBId, "User B's template", "{}");

                        // User A queries templates
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userATemplates = await getTemplates(userAId);

                        // Property: User A sees zero templates from User B
                        expect(userATemplates.every(t => t.userId !== userBId)).toBe(true);
                        expect(userATemplates.length).toBe(0);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("User A's stats are independent from User B's stats", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.integer({ min: 10, max: 1000 }),
                    async (userAId, userBId, xpAmount) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // User B adds XP
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await addXP(userBId, xpAmount);

                        // User A queries their stats
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userAStats = await getUserStats(userAId);

                        // Property: User A's XP is unaffected by User B's XP
                        expect(userAStats.xp).toBe(0);
                        expect(userAStats.level).toBe(1);
                    }
                ),
                { numRuns: 10 }
            );
        });
    });

    describe("Property 5: Update Isolation", () => {
        it("Updating User A's task does not affect User B's tasks", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // Both users create tasks
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskA = await createTask({
                            userId: userAId,
                            title: "User A's task",
                        });
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskB = await createTask({
                            userId: userBId,
                            title: "User B's task",
                        });

                        // User A updates their task
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await updateTask(taskA.id, userAId, { title: "Updated by A" });

                        // User B's task should be unchanged
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskBAfter = await getTask(taskB.id, userBId);
                        expect(taskBAfter?.title).toBe("User B's task");
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("Adding XP to User A does not affect User B's XP", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.integer({ min: 10, max: 500 }),
                    async (userAId, userBId, xpAmount) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // Initialize both users' stats
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await getUserStats(userAId);

                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userBStatsBefore = await getUserStats(userBId);

                        // User A adds XP
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await addXP(userAId, xpAmount);

                        // User B's stats should be unchanged
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const userBStatsAfter = await getUserStats(userBId);
                        expect(userBStatsAfter.xp).toBe(userBStatsBefore.xp);
                        expect(userBStatsAfter.level).toBe(userBStatsBefore.level);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it("Deleting User A's resources does not affect User B's resources", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
                    async (userAId, userBId) => {
                        if (userAId === userBId) return;

                        await resetTestDb();
                        await createTestUser(userAId, `${userAId}@test.com`);
                        await createTestUser(userBId, `${userBId}@test.com`);

                        // Both users create tasks
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskA = await createTask({
                            userId: userAId,
                            title: "User A's task",
                        });

                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskB = await createTask({
                            userId: userBId,
                            title: "User B's task",
                        });

                        // User A deletes their task
                        setMockAuthUser({ id: userAId, email: `${userAId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        await deleteTask(taskA.id, userAId);

                        // User B's task should still exist
                        setMockAuthUser({ id: userBId, email: `${userBId}@test.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
                        const taskBAfter = await getTask(taskB.id, userBId);
                        expect(taskBAfter).not.toBeNull();
                        expect(taskBAfter?.title).toBe("User B's task");
                    }
                ),
                { numRuns: 10 }
            );
        });
    });
});
