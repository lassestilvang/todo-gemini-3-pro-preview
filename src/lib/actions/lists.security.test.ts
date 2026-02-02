import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getLists, createList, updateList, deleteList, reorderLists, getList } from "./lists";

describe("Lists Security (IDOR)", () => {
  let ATTACKER_ID: string;
  let VICTIM_ID: string;
  let ATTACKER_USER: any;

  beforeEach(async () => {
    ATTACKER_ID = `attacker_${Math.random().toString(36).substring(7)}`;
    VICTIM_ID = `victim_${Math.random().toString(36).substring(7)}`;

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

  it("should prevent creating a list for another user", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await createList({
      userId: VICTIM_ID,
      name: "Hacked List",
      slug: "hacked-list"
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent updating another user's list", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await updateList(999, VICTIM_ID, {
      name: "Renamed by Attacker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent deleting another user's list", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await deleteList(999, VICTIM_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent reordering another user's lists", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await reorderLists(VICTIM_ID, [{ id: 1, position: 2 }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it.skip("should prevent getting another user's lists", async () => {
    setMockAuthUser(ATTACKER_USER);
    await expect(getLists(VICTIM_ID)).rejects.toThrow(/Forbidden|authorized/i);
  });

  it("should prevent getting a specific list of another user", async () => {
    setMockAuthUser(ATTACKER_USER);
    await expect(getList(999, VICTIM_ID)).rejects.toThrow(/Forbidden|authorized/i);
  });
});
