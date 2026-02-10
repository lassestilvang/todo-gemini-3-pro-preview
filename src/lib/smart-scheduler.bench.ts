import { describe, test, beforeAll, expect } from "bun:test";
import { db, tasks, sqliteConnection, users } from "@/db";
import { eq, and, isNull } from "drizzle-orm";

describe("Smart Scheduler Performance Benchmark", () => {
    const targetUserId = "target-user";
    const noiseTaskCount = 10000;
    const targetTaskCount = 100;

    beforeAll(async () => {
        // Ensure index exists for fair comparison (mimic production)
        sqliteConnection.run("CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)");

        // Clear existing data to ensure clean benchmark
        await db.delete(tasks);
        await db.delete(users);

        // Create users
        await db.insert(users).values([
            { id: targetUserId, email: "target@example.com", firstName: "Target", lastName: "User" },
            { id: "other-user", email: "other@example.com", firstName: "Other", lastName: "User" }
        ]);

        // Seed noise tasks (random users)
        const noiseTasks = Array.from({ length: noiseTaskCount }).map((_, i) => ({
            userId: "other-user", // Simplified to one other user for bulk insert efficiency, or random string
            title: `Noise Task ${i}`,
            isCompleted: false,
            dueDate: null, // Unscheduled
        }));

        // Batch insert noise tasks
        // SQLite has limits on bind parameters, so insert in chunks
        const chunkSize = 500;
        for (let i = 0; i < noiseTasks.length; i += chunkSize) {
            await db.insert(tasks).values(noiseTasks.slice(i, i + chunkSize));
        }

        // Seed target user tasks
        const targetTasks = Array.from({ length: targetTaskCount }).map((_, i) => ({
            userId: targetUserId,
            title: `Target Task ${i}`,
            isCompleted: false,
            dueDate: null, // Unscheduled
        }));
        await db.insert(tasks).values(targetTasks);

        console.log(`Seeded DB with ${noiseTaskCount} noise tasks and ${targetTaskCount} target tasks.`);
    });

    test("Benchmark Query Performance", async () => {
        // Measure Original Query (Unbounded)
        const startOriginal = performance.now();
        const originalResults = await db.select().from(tasks).where(
            and(
                isNull(tasks.dueDate),
                eq(tasks.isCompleted, false)
            )
        );
        const endOriginal = performance.now();
        const timeOriginal = endOriginal - startOriginal;

        // Measure Optimized Query (Filtered by userId)
        const startOptimized = performance.now();
        const optimizedResults = await db.select().from(tasks).where(
            and(
                isNull(tasks.dueDate),
                eq(tasks.isCompleted, false),
                eq(tasks.userId, targetUserId)
            )
        );
        const endOptimized = performance.now();
        const timeOptimized = endOptimized - startOptimized;

        console.log(`
⚡ Benchmark Results:
----------------------------------------
Original Query (Unbounded): ${timeOriginal.toFixed(2)}ms (Rows: ${originalResults.length})
Optimized Query (Filtered): ${timeOptimized.toFixed(2)}ms (Rows: ${optimizedResults.length})
Improvement: ${(timeOriginal / timeOptimized).toFixed(1)}x faster
----------------------------------------
        `);

        // Verify correctness of results
        expect(originalResults.length).toBeGreaterThanOrEqual(noiseTaskCount + targetTaskCount);
        expect(optimizedResults.length).toBe(targetTaskCount);
        expect(timeOptimized).toBeLessThan(timeOriginal);
    });
});
