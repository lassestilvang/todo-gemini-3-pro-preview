import { describe, it, expect, beforeEach } from "bun:test";
import { calculateStreakUpdate } from "@/lib/gamification";
import { toggleTaskCompletion, createTask } from "@/lib/actions";
import { db, userStats, userAchievements, achievements } from "@/db";
import { eq } from "drizzle-orm";

import { setupTestDb, resetTestDb } from "@/test/setup";

describe("Gamification Logic", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();

        // Seed initial stats
        await db.insert(userStats).values({ id: 1, xp: 0, level: 1, currentStreak: 0, longestStreak: 0 });

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
        const task = await createTask({ title: "Test Task" });

        // Complete it
        await toggleTaskCompletion(task.id, true);

        // Check stats
        const stats = await db.select().from(userStats).where(eq(userStats.id, 1));
        expect(stats[0].currentStreak).toBe(1);
        expect(stats[0].longestStreak).toBe(1);
    });

    it("should unlock 'First Blood' achievement", async () => {
        const task = await createTask({ title: "First Task" });
        await toggleTaskCompletion(task.id, true);

        const achievements = await db.select().from(userAchievements);
        expect(achievements.length).toBeGreaterThan(0);
        expect(achievements.some(a => a.achievementId === "first_blood")).toBe(true);
    });
});
