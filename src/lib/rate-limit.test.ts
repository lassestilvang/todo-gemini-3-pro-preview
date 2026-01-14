import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { rateLimit } from "./rate-limit";

describe("rate-limit", () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
    });

    it("should allow requests within limit", async () => {
        const key = "test-key";
        const limit = 5;
        const window = 60;

        for (let i = 0; i < limit; i++) {
            const result = await rateLimit(key, limit, window);
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(limit - i - 1);
        }
    });

    it("should block requests exceeding limit", async () => {
        const key = "test-key-blocked";
        const limit = 2;
        const window = 60;

        // Use up all requests
        await rateLimit(key, limit, window);
        await rateLimit(key, limit, window);

        // Third request should be blocked
        const result = await rateLimit(key, limit, window);
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
    });

    it("should reset window after timeout", async () => {
        const key = "test-key-reset";
        const limit = 1;
        const window = 1; // 1 second

        // First request
        const res1 = await rateLimit(key, limit, window);
        expect(res1.success).toBe(true);

        // Second request immediately (blocked)
        const res2 = await rateLimit(key, limit, window);
        expect(res2.success).toBe(false);

        // Wait for window to pass
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Third request after timeout (should succeed)
        const res3 = await rateLimit(key, limit, window);
        expect(res3.success).toBe(true);
        expect(res3.remaining).toBe(0);
    });
});
