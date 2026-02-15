import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestUser, setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { createList } from "./lists";
import { setGoogleTasksListMappings } from "./google-tasks";
import { db, lists, eq } from "./shared";

describe("Google Tasks Security (IDOR)", () => {
  let ATTACKER_ID: string;
  let VICTIM_ID: string;
  let VICTIM_LIST_ID: number;
  let ATTACKER_USER: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };

  beforeEach(async () => {
    await setupTestDb();
    await resetTestDb();

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

    // Create a list for the victim
    setMockAuthUser({
      id: VICTIM_ID,
      email: `${VICTIM_ID}@example.com`,
      firstName: "Victim",
      lastName: "User",
      profilePictureUrl: null,
    });

    const victimList = await createList({
      userId: VICTIM_ID,
      name: "Secret Victim List",
      slug: "secret-victim-list",
    });

    if (!victimList.success || !victimList.data) {
        throw new Error("Failed to create victim list");
    }
    VICTIM_LIST_ID = victimList.data.id;

    resetMockAuthUser();
  });

  afterEach(() => {
    resetMockAuthUser();
  });

  it("should prevent mapping another user's list to current user's Google Task list", async () => {
    setMockAuthUser(ATTACKER_USER);

    // Attacker tries to map their Google Task list to the Victim's local list
    const result = await setGoogleTasksListMappings([
        { tasklistId: "external-attacker-list", listId: VICTIM_LIST_ID }
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/access denied|not found/i);
    }
  });
});
