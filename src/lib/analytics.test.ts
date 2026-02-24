import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getAnalytics } from "./analytics";
import { db, tasks, timeEntries } from "@/db";
import { format, subDays } from "date-fns";

describe("Analytics", () => {
    let testUserId: string;
    let testUserCounter = 0;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        testUserCounter++;
        testUserId = `user_analytics_${testUserCounter}`;
        await createTestUser(testUserId, `${testUserId}@example.com`);
        setMockAuthUser({ id: testUserId, email: `${testUserId}@example.com` });
    });

    it("should return empty analytics for new user", async () => {
        const data = await getAnalytics(testUserId);
        expect(data.summary.totalTasks).toBe(0);
        expect(data.tasksOverTime.length).toBe(30);
    });

    it("should calculate summary stats correctly", async () => {
        // Create some tasks
        const now = new Date();

        await db.insert(tasks).values([
            { userId: testUserId, title: "Task 1", isCompleted: true, completedAt: now, estimateMinutes: 30, actualMinutes: 25 },
            { userId: testUserId, title: "Task 2", isCompleted: false, estimateMinutes: 60 },
            { userId: testUserId, title: "Task 3", isCompleted: true, completedAt: now, estimateMinutes: 45, actualMinutes: 50 },
        ]);

        const data = await getAnalytics(testUserId);
        expect(data.summary.totalTasks).toBe(3);
        expect(data.summary.completedTasks).toBe(2);
        expect(data.summary.completionRate).toBe(67); // 2/3 * 100
        expect(data.summary.avgEstimate).toBe(38); // (30+45)/2 = 37.5 -> 38
        expect(data.summary.avgActual).toBe(38); // (25+50)/2 = 37.5 -> 38
    });

    it("should aggregate date-based data correctly", async () => {
        const now = new Date();
        const yesterday = subDays(now, 1);

        await db.insert(tasks).values([
            { userId: testUserId, title: "Today Task", isCompleted: true, completedAt: now, createdAt: now },
            { userId: testUserId, title: "Yesterday Task", isCompleted: true, completedAt: yesterday, createdAt: yesterday },
        ]);

        const data = await getAnalytics(testUserId);

        // Check tasksOverTime
        const todayKey = format(now, "MMM d");
        const yesterdayKey = format(yesterday, "MMM d");

        const todayStat = data.tasksOverTime.find(t => t.date === todayKey);
        const yesterdayStat = data.tasksOverTime.find(t => t.date === yesterdayKey);

        expect(todayStat?.created).toBe(1);
        expect(todayStat?.completed).toBe(1);
        expect(yesterdayStat?.created).toBe(1);
        expect(yesterdayStat?.completed).toBe(1);
    });

    it("should aggregate time tracking correctly", async () => {
        const now = new Date();

        // Insert time entries
        // Note: Task ID reference is required, so create a task first
        const [task] = await db.insert(tasks).values({ userId: testUserId, title: "Task" }).returning();

        await db.insert(timeEntries).values([
            { userId: testUserId, taskId: task.id, startedAt: now, durationMinutes: 30 },
            { userId: testUserId, taskId: task.id, startedAt: now, durationMinutes: 45 },
        ]);

        const data = await getAnalytics(testUserId);

        expect(data.timeTracking.totalTrackedMinutes).toBe(75);
        expect(data.timeTracking.entriesCount).toBe(2);

        const todayKey = format(now, "EEE");
        const dailyStat = data.timeTracking.dailyTracked.find(d => d.date === todayKey);
        expect(dailyStat?.minutes).toBe(75);
    });
});
