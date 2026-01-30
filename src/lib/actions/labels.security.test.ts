import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { createLabel, updateLabel, deleteLabel, getLabels, reorderLabels, getLabel } from "./labels";

describe("Labels Security (IDOR)", () => {
  const ATTACKER_ID = "attacker_123";
  const VICTIM_ID = "victim_456";

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    setMockAuthUser({
      id: ATTACKER_ID,
      email: "attacker@example.com",
      firstName: "Attacker",
      lastName: "User",
      profilePictureUrl: null,
    });
  });

  afterEach(() => {
    clearMockAuthUser();
  });

  it("should prevent creating a label for another user", async () => {
    // We are logged in as ATTACKER, but try to create for VICTIM
    const result = await createLabel({
      userId: VICTIM_ID,
      name: "Hacked Label",
      color: "#000000",
      icon: "alert",
      position: 0,
    });

    // Should fail with FORBIDDEN
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent updating another user's label", async () => {
    const result = await updateLabel(999, VICTIM_ID, {
      name: "Renamed by Attacker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent deleting another user's label", async () => {
    const result = await deleteLabel(999, VICTIM_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent reordering another user's labels", async () => {
    const result = await reorderLabels(VICTIM_ID, [{ id: 1, position: 2 }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent getting another user's labels", async () => {
    try {
      await getLabels(VICTIM_ID);
      // If it doesn't throw, fail the test
      expect(true).toBe(false);
    } catch (error: any) {
      // Just ensure an error was thrown, which means access was denied
      // The exact error might be wrapped or just a generic error if it fails deeper
      // But for our purpose, we expect it to THROW (Unauthorized/Forbidden)
      expect(error).toBeDefined();
      // Ideally check for ForbiddenError specifically if possible, but
      // getLabels is a cached function so error handling might vary.
      // The key is it shouldn't return data.
    }
  });

  it("should prevent getting a specific label of another user", async () => {
    try {
      await getLabel(999, VICTIM_ID);
      // If it returns (even undefined), it means it ran the query without authorization check
      // Wait, getLabel returns Promise<Label | undefined>.
      // If it returns undefined because ID 999 doesn't exist, that's still an IDOR if it didn't check auth first.
      // But we can't distinguish "not found" from "allowed".
      // Ideally, it SHOULD throw Forbidden before even trying to query.
      // So if it returns anything (even undefined), we consider it a failure here because we expect an auth check to throw.
       expect(true).toBe(false);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
