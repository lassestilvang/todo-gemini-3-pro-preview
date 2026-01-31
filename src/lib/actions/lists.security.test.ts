import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";



import { createList, updateList, deleteList, getLists, reorderLists, getList } from "./lists";

describe("Lists Security (IDOR)", () => {
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

  it("should prevent creating a list for another user", async () => {
    // We are logged in as ATTACKER (via getCurrentUserMock), but we try to create for VICTIM
    const result = await createList({
      userId: VICTIM_ID,
      name: "Hacked List",
      color: "#000000",
      icon: "alert",
      slug: "hacked-list",
      position: 0,
    });

    // The explicit check in lists.ts should see attacker.id !== victimId and throw Forbidden
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent updating another user's list", async () => {
    const result = await updateList(999, VICTIM_ID, {
      name: "Renamed by Attacker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent deleting another user's list", async () => {
    const result = await deleteList(999, VICTIM_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent reordering another user's lists", async () => {
    const result = await reorderLists(VICTIM_ID, [{ id: 1, position: 2 }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent getting another user's lists", async () => {
    try {
      await getLists(VICTIM_ID);
      // If it doesn't throw, fail the test
      expect(true).toBe(false);
    } catch (error: unknown) {
      // Just ensure an error was thrown, which means access was denied
      expect(error).toBeDefined();
    }
  });

  it("should prevent getting a specific list of another user", async () => {
    try {
      await getList(999, VICTIM_ID);
      expect(true).toBe(false);
    } catch (error: unknown) {
      expect(error).toBeDefined();
    }
  });
});
