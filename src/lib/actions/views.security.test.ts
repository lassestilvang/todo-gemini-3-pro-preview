import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { getSavedViews, createSavedView, deleteSavedView } from "./views";

describe("Views Security (IDOR)", () => {
  let ATTACKER_ID: string;
  let VICTIM_ID: string;
  let ATTACKER_USER: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };

  beforeEach(async () => {
    // Unique IDs for isolation
    ATTACKER_ID = `attacker_${Math.random().toString(36).substring(7)}`;
    VICTIM_ID = `victim_${Math.random().toString(36).substring(7)}`;

    // Ensure users exist in DB
    await createTestUser(ATTACKER_ID, `${ATTACKER_ID}@example.com`);
    await createTestUser(VICTIM_ID, `${VICTIM_ID}@example.com`);

    ATTACKER_USER = {
      id: ATTACKER_ID,
      email: `${ATTACKER_ID}@example.com`,
      firstName: "Attacker",
      lastName: "User",
      profilePictureUrl: null,
    };
  });

  it("should prevent getting another user's saved views", async () => {
    setMockAuthUser(ATTACKER_USER);
    try {
      await getSavedViews(VICTIM_ID);
      // If it doesn't throw, we expect it to fail the test in step 2 (Verification)
      // but for step 4 (Fix), we want to see it THROW.
      // Since getSavedViews is not wrapped in withErrorHandling, it should throw ForbiddenError.
    } catch (error: unknown) {
      // Accept either specific message or generic Forbidden
      const msg = (error as Error).message || (error as Error).toString();
      expect(msg).toMatch(/authorized|Forbidden|Access denied/i);
      return;
    } finally {
      resetMockAuthUser();
    }
    // If we reach here, no error was thrown
    throw new Error("Expected ForbiddenError was not thrown");
  });

  it("should prevent creating a saved view for another user", async () => {
    setMockAuthUser(ATTACKER_USER);
    try {
      const result = await createSavedView({
        userId: VICTIM_ID,
        name: "Hacked View",
        settings: JSON.stringify({ layout: "list" }),
      });

      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent deleting another user's saved view", async () => {
    setMockAuthUser(ATTACKER_USER);
    try {
      // Try to delete a non-existent view of victim (ID doesn't matter for IDOR check entry)
      const result = await deleteSavedView(999, VICTIM_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });
});
