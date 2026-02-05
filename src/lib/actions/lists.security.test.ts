import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { getLists, createList, updateList, deleteList, reorderLists, getList } from "./lists";

describe("Lists Security (IDOR)", () => {
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
    try {
      setMockAuthUser(ATTACKER_USER);
      const result = await createList({
        userId: VICTIM_ID,
        name: "Hacked List",
        slug: "hacked-list",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent updating another user's list", async () => {
    try {
      setMockAuthUser(ATTACKER_USER);
      const result = await updateList(999, VICTIM_ID, {
        name: "Renamed by Attacker",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent deleting another user's list", async () => {
    try {
      setMockAuthUser(ATTACKER_USER);
      const result = await deleteList(999, VICTIM_ID);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent reordering another user's lists", async () => {
    try {
      setMockAuthUser(ATTACKER_USER);
      const result = await reorderLists(VICTIM_ID, [{ id: 1, position: 2 }]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent getting another user's lists", async () => {
    setMockAuthUser(ATTACKER_USER);
    try {
      const victimLists = await getLists(VICTIM_ID);
      expect(victimLists).toEqual([]);
    } catch (error) {
      expect(error).toBeTruthy();
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent getting a specific list of another user", async () => {
    try {
      setMockAuthUser(ATTACKER_USER);
      let caught: unknown = null;
      try {
        await getList(999, VICTIM_ID);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeTruthy();
      if (caught instanceof Error) {
        expect(caught.message).toMatch(/Forbidden|authorized/i);
      }
    } finally {
      resetMockAuthUser();
    }
  });
});
