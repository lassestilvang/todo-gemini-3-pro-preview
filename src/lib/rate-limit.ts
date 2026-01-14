import { db, rateLimits } from "@/db";
import { eq, sql } from "drizzle-orm";

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

    // Get current record
    const [record] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));

    if (!record) {
        // First request
        await db.insert(rateLimits).values({
            key,
            count: 1,
            lastRequest: now,
        });
        return {
            success: true,
            remaining: limit - 1,
            reset: new Date(now.getTime() + windowMs),
        };
    }

    const timePassed = now.getTime() - record.lastRequest.getTime();

    if (timePassed > windowMs) {
        // Window expired, reset
        await db.update(rateLimits)
            .set({
                count: 1,
                lastRequest: now,
            })
            .where(eq(rateLimits.key, key));

        return {
            success: true,
            remaining: limit - 1,
            reset: new Date(now.getTime() + windowMs),
        };
    }

    if (record.count >= limit) {
        // Limit reached
        return {
            success: false,
            remaining: 0,
            reset: new Date(record.lastRequest.getTime() + windowMs),
        };
    }

    // Increment count
    await db.update(rateLimits)
        .set({
            count: record.count + 1,
        })
        .where(eq(rateLimits.key, key));

    return {
        success: true,
        remaining: limit - (record.count + 1),
        reset: new Date(record.lastRequest.getTime() + windowMs),
    };
}
