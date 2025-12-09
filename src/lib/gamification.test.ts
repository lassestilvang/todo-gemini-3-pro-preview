import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { calculateStreakUpdate } from "@/lib/gamification";
import { toggleTaskCompletion, createTask, getUserStats } from "@/lib/actions";
import { db, userAchievements, achievements } from "@/db";

import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";

describe("Gamification Logic", () => {
    let testUserId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        // Create a test user for each test
        const user = await createTestUser("test_user_gamification", "test@gamification.com");
        testUserId = user.id;

        // Seed achievements
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
        ]);
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
        const task = await createTask({ userId: testUserId, title: "Test Task" });

        // Complete it
        await toggleTaskCompletion(task.id, testUserId, true);

        // Check stats
        const stats = await getUserStats(testUserId);
        expect(stats.currentStreak).toBe(1);
        expect(stats.longestStreak).toBe(1);
    });

    it("should unlock 'First Blood' achievement", async () => {
        const task = await createTask({ userId: testUserId, title: "First Task" });
        await toggleTaskCompletion(task.id, testUserId, true);

        const achievementsList = await db.select().from(userAchievements);
        expect(achievementsList.length).toBeGreaterThan(0);
        expect(achievementsList.some(a => a.achievementId === "first_blood")).toBe(true);
    });
});
