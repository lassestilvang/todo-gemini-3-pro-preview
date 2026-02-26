
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { createLabel } from "./labels";
import { db, labels, eq } from "./shared";

describe("Labels Rate Limits", () => {
  let USER_ID: string;
  let USER: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };

  beforeEach(async () => {
    USER_ID = `rate_limit_label_user_${Math.random().toString(36).substring(7)}`;
    await createTestUser(USER_ID, `${USER_ID}@example.com`);

    USER = {
      id: USER_ID,
      email: `${USER_ID}@example.com`,
      firstName: "RateLimit",
      lastName: "User",
      profilePictureUrl: null,
    };
    setMockAuthUser(USER);
  });

  afterEach(async () => {
    resetMockAuthUser();
    // Cleanup
    await db.delete(labels).where(eq(labels.userId, USER_ID));
  });

  it("should enforce rate limits on label creation", async () => {
    // Attempt to create 110 labels rapidly (limit 100).

    let successCount = 0;
    let rateLimitHit = false;

    for (let i = 0; i < 110; i++) {
      const result = await createLabel({
        userId: USER_ID,
        name: `Label ${i}`,
        color: "#000000",
      });

      if (result.success) {
        successCount++;
      } else if (result.error.message.includes("Rate limit")) {
        rateLimitHit = true;
        break;
      }
    }

    // Expect rate limit to be hit
    expect(rateLimitHit).toBe(true);
    expect(successCount).toBeLessThan(110);
  });
});
