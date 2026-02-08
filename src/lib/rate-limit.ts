import { db, rateLimits } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Simple database-backed rate limiter.
 * @param key Unique key for rate limiting (e.g. IP or userId:action)
 * @param limit Maximum number of requests allowed in the window
 * @param windowSeconds Window size in seconds
 * @returns Object with success status and remaining requests
 */
export async function rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ success: boolean; remaining: number; reset: Date }> {
    const now = new Date();
    const windowMs = windowSeconds * 1000;
    const cutoff = new Date(now.getTime() - windowMs);

    // In tests (SQLite), the schema uses mode: "timestamp" which stores SECONDS.
    // So we must pass seconds to raw SQL.
    // In production (PostgreSQL), we use Date objects for timestamp columns.
    const isTest = process.env.NODE_ENV === 'test';

    // For SQLite: Convert ms to seconds.
    // For Postgres: Use Date object.
    const nowValue = isTest ? Math.floor(now.getTime() / 1000) : now;
    const cutoffValue = isTest ? Math.floor(cutoff.getTime() / 1000) : cutoff;

    // Atomic upsert:
    // 1. Try to insert a new record with count 1 and current time.
    // 2. If conflict (key exists), update the existing record based on window expiration.
    const [record] = await db.insert(rateLimits)
        .values({
            key,
            count: 1,
            lastRequest: now, // Drizzle handles conversion based on schema (Date -> Seconds for SQLite)
        })
        .onConflictDoUpdate({
            target: rateLimits.key,
            set: {
                // If window expired (lastRequest <= cutoff), reset count to 1.
                // Else if count < limit, increment count.
                // Else (blocked), set to limit + 1 (clamped to avoid overflow).
                count: sql<number>`
                    CASE
                        WHEN ${rateLimits.lastRequest} <= ${cutoffValue} THEN 1
                        WHEN ${rateLimits.count} < ${limit} THEN ${rateLimits.count} + 1
                        ELSE ${limit} + 1
                    END
                `,
                // If window expired, reset lastRequest to now.
                // Else keep existing lastRequest.
                lastRequest: sql<Date>`
                    CASE
                        WHEN ${rateLimits.lastRequest} <= ${cutoffValue} THEN ${nowValue}
                        ELSE ${rateLimits.lastRequest}
                    END
                `
            }
        })
        .returning();

    // Determine success based on the returned record state.
    const isSuccess = record.count <= limit;

    // Remaining requests: limit - current count.
    const remaining = Math.max(0, limit - record.count);

    // Reset time is always lastRequest + windowMs.
    const reset = new Date(record.lastRequest.getTime() + windowMs);

    return {
        success: isSuccess,
        remaining,
        reset,
    };
}
