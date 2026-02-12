import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { calculateStreakUpdate } from "@/lib/gamification";
import { toggleTaskCompletion, createTask, getUserStats } from "@/lib/actions";
import { isSuccess } from "@/lib/action-result";
import { db, userAchievements, achievements } from "@/db";
import { setMockAuthUser } from "@/test/mocks";

import { setupTestDb, createTestUser } from "@/test/setup";

describe("Gamification Logic", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
        // await resetTestDb();
    });

    beforeEach(async () => {
        // Use unique ID per test for isolation
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;

        await createTestUser(testUserId, `${testUserId}@gamification.com`);
        setMockAuthUser({ id: testUserId, email: `${testUserId}@gamification.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });

        // Seed achievements with unique ID if needed, but here id is constant.
        // Use onConflictDoNothing to avoid errors if another test already seeded it.
        await db.insert(achievements).values([
            {
                id: "first_blood",
                name: "First Blood",
                description: "Complete your first task",
                icon: "⚔️",
                conditionType: "count_total",
                conditionValue: 1,
                xpReward: 50
            }
        ]).onConflictDoNothing();
    });

    it("should calculate streak correctly", () => {
        // No previous activity
        let result = calculateStreakUpdate(0, null);
        expect(result.newStreak).toBe(1);
        expect(result.shouldUpdate).toBe(true);

        // Activity yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        result = calculateStreakUpdate(1, yesterday);
        expect(result.newStreak).toBe(2);
        expect(result.shouldUpdate).toBe(true);

        // Activity today
        const today = new Date();
        result = calculateStreakUpdate(5, today);
        expect(result.newStreak).toBe(5);
        expect(result.shouldUpdate).toBe(false); // No update needed if already active today

        // Activity 2 days ago (streak broken)
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        result = calculateStreakUpdate(5, twoDaysAgo);
        expect(result.newStreak).toBe(1);
        expect(result.shouldUpdate).toBe(true);
    });

    it("should update streak in DB on task completion", async () => {
        // Create a task
        const taskResult = await createTask({ userId: testUserId, title: "Test Task" });
        expect(isSuccess(taskResult)).toBe(true);
        if (!isSuccess(taskResult)) return;
        const task = taskResult.data;

        // Complete it
        expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);

        // Check stats
        const stats = await getUserStats(testUserId);
        expect(stats.currentStreak).toBe(1);
        expect(stats.longestStreak).toBe(1);
    });

    it("should unlock 'First Blood' achievement", async () => {
        const taskResult = await createTask({ userId: testUserId, title: "First Task" });
        expect(isSuccess(taskResult)).toBe(true);
        if (!isSuccess(taskResult)) return;
        const task = taskResult.data;
        expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);

        const achievementsList = await db.select().from(userAchievements);
        expect(achievementsList.length).toBeGreaterThan(0);
        expect(achievementsList.some(a => a.achievementId === "first_blood")).toBe(true);
    });
});
