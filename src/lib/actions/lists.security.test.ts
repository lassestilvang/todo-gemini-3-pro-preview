import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { ForbiddenError } from "@/lib/auth-errors";

// Create the mock function outside so we can spy on it
const requireUserMock = mock(async (userId: string) => {
    if (userId !== "attacker_123") {
       // We still need to throw to stop the action execution
       const { ForbiddenError } = require("@/lib/auth-errors");
       throw new ForbiddenError("You are not authorized to access this user's data");
    }
    return { id: "attacker_123", email: "attacker@example.com", firstName: "Attacker", lastName: "User", avatarUrl: null, use24HourClock: null, weekStartsOnMonday: null };
});

mock.module("@/lib/auth", () => {
  return {
    requireUser: requireUserMock,
    getCurrentUser: async () => {
        return { id: "attacker_123", email: "attacker@example.com", firstName: "Attacker", lastName: "User", avatarUrl: null, use24HourClock: null, weekStartsOnMonday: null };
    }
  };
});

import { createList, updateList, deleteList, getLists, reorderLists, getList } from "./lists";

describe("Lists Security (IDOR)", () => {
  const ATTACKER_ID = "attacker_123";
  const VICTIM_ID = "victim_456";

  beforeEach(() => {
    setMockAuthUser({
      id: ATTACKER_ID,
      email: "attacker@example.com",
      firstName: "Attacker",
      lastName: "User",
      profilePictureUrl: null,
    });
    requireUserMock.mockClear();
  });

  afterEach(() => {
    clearMockAuthUser();
  });

  it("should prevent creating a list for another user", async () => {
    const result = await createList({
      userId: VICTIM_ID, // Attacker tries to create list for Victim
      name: "Hacked List",
      color: "#000000",
      icon: "alert",
      slug: "hacked-list",
      position: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    // Verify that requireUser was called with the VICTIM'S ID (the crucial check)
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });

  it("should prevent updating another user's list", async () => {
    // Attempt to update a list belonging to victim (passed as userId param)
    const result = await updateList(999, VICTIM_ID, {
      name: "Renamed by Attacker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });

  it("should prevent deleting another user's list", async () => {
    const result = await deleteList(999, VICTIM_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });

  it("should prevent reordering another user's lists", async () => {
    const result = await reorderLists(VICTIM_ID, [{ id: 1, position: 2 }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });

  it("should prevent getting another user's lists", async () => {
    try {
      await getLists(VICTIM_ID);
      // If it doesn't throw, fail the test
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.name).toBe("ForbiddenError");
    }
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });

  it("should prevent getting a specific list of another user", async () => {
    try {
      await getList(999, VICTIM_ID);
      expect(true).toBe(false);
    } catch (error: any) {
       expect(error.name).toBe("ForbiddenError");
    }
    expect(requireUserMock).toHaveBeenCalledWith(VICTIM_ID);
  });
});
