
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { createCustomIcon } from "./custom-icons";
import { db, customIcons, eq } from "./shared";

describe("Security: Custom Icons (XSS Prevention)", () => {
    let USER_ID: string;

    beforeEach(async () => {
        USER_ID = `xss_test_user_${Math.random().toString(36).substring(7)}`;
        await createTestUser(USER_ID, `${USER_ID}@example.com`);
        setMockAuthUser({
            id: USER_ID,
            email: `${USER_ID}@example.com`,
            firstName: "XSS",
            lastName: "Tester",
            profilePictureUrl: null,
        });
    });

    afterEach(async () => {
        resetMockAuthUser();
        await db.delete(customIcons).where(eq(customIcons.userId, USER_ID));
    });

    it("should BLOCK javascript: URLs (XSS)", async () => {
        const result = await createCustomIcon({
            userId: USER_ID,
            name: "Malicious Icon",
            url: "javascript:alert('XSS')",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
            expect(result.error.message).toContain("Invalid icon URL");
        }
    });

    it("should BLOCK data:text/html URLs (Stored XSS)", async () => {
        const result = await createCustomIcon({
            userId: USER_ID,
            name: "HTML Data Icon",
            url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("VALIDATION_ERROR");
            expect(result.error.message).toContain("Invalid icon URL");
        }
    });

    it("should ALLOW valid https: URLs", async () => {
        const result = await createCustomIcon({
            userId: USER_ID,
            name: "Valid HTTPS Icon",
            url: "https://example.com/icon.png",
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.url).toBe("https://example.com/icon.png");
        }
    });

    it("should ALLOW valid data:image/png URLs", async () => {
        // 1x1 transparent pixel
        const validDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";

        const result = await createCustomIcon({
            userId: USER_ID,
            name: "Valid Data Icon",
            url: validDataUrl,
        });

        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.url).toBe(validDataUrl);
        }
    });
});
