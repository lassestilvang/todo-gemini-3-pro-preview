import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { ForbiddenError } from "@/lib/auth-errors";

// Simple mock for getCurrentUser that just returns the attacker
const getCurrentUserMock = mock(async () => {
    return {
      id: "attacker_123",
      email: "attacker@example.com",
      firstName: "Attacker",
      lastName: "User",
      avatarUrl: null,
      use24HourClock: null,
      weekStartsOnMonday: null
    };
});

// Mock the auth module
mock.module("@/lib/auth", () => {
  return {
    getCurrentUser: getCurrentUserMock,
    // We can keep requireUser mock if other files use it, or just let it default.
    // Since we removed usage in lists.ts, it shouldn't matter for this test.
    requireUser: async (userId: string) => {
        // This is no longer used by lists.ts, but just in case
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
    getCurrentUserMock.mockClear();
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
    } catch (error: any) {
      expect(error.name).toBe("ForbiddenError");
    }
  });

  it("should prevent getting a specific list of another user", async () => {
    try {
      await getList(999, VICTIM_ID);
      expect(true).toBe(false);
    } catch (error: any) {
       expect(error.name).toBe("ForbiddenError");
    }
  });
});
