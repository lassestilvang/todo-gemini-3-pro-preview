
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { createList } from "./lists";
import { db, lists, eq } from "./shared";

describe("Lists Rate Limits", () => {
  let USER_ID: string;
  let USER: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };

  beforeEach(async () => {
    USER_ID = `rate_limit_user_${Math.random().toString(36).substring(7)}`;
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
    await db.delete(lists).where(eq(lists.userId, USER_ID));
  });

  it("should enforce rate limits on list creation", async () => {
    // Attempt to create 60 lists rapidly.
    // If rate limit is not implemented, all should succeed.
    // If implemented (target 50/hour), it should fail eventually.

    let successCount = 0;
    let rateLimitHit = false;

    for (let i = 0; i < 60; i++) {
      const result = await createList({
        userId: USER_ID,
        name: `List ${i}`,
        slug: `list-${i}-${Date.now()}`,
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
    expect(successCount).toBe(50);
  });
});
