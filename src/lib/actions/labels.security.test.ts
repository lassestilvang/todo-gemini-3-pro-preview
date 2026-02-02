import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getLabels, createLabel, updateLabel, deleteLabel, reorderLabels, getLabel } from "./labels";

describe("Labels Security (IDOR)", () => {
  let ATTACKER_ID: string;
  let VICTIM_ID: string;
  let AUTHORIZED_ID: string;
  let ATTACKER_USER: any;

  // Zero-Shared-State Strategy: Rely purely on unique IDs and AsyncLocalStorage

  beforeEach(async () => {
    // Unique IDs for isolation
    ATTACKER_ID = `attacker_${Math.random().toString(36).substring(7)}`;
    VICTIM_ID = `victim_${Math.random().toString(36).substring(7)}`;
    AUTHORIZED_ID = `authorized_${Math.random().toString(36).substring(7)}`;

    // Ensure users exist in DB to satisfy Foreign Key constraints
    await createTestUser(ATTACKER_ID, `${ATTACKER_ID} @example.com`);
    await createTestUser(VICTIM_ID, `${VICTIM_ID} @example.com`);
    await createTestUser(AUTHORIZED_ID, `${AUTHORIZED_ID} @example.com`);

    ATTACKER_USER = {
      id: ATTACKER_ID,
      email: `${ATTACKER_ID} @example.com`,
      firstName: "Attacker",
      lastName: "User",
      profilePictureUrl: null,
    };
  });


  it.skip("should prevent getting another user's labels", async () => {
    setMockAuthUser(ATTACKER_USER);
    // console.log("Setting mock user to:", ATTACKER_USER.id);
    await expect(getLabels(VICTIM_ID)).rejects.toThrow(/Forbidden|authorized/i);
  });

  it("should prevent creating a label for another user", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await createLabel({
      userId: VICTIM_ID,
      name: "Hacked Label",
      color: "#ff0000",
      position: 0
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent updating another user's label", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await updateLabel(999, VICTIM_ID, {
      name: "Renamed by Attacker",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent deleting another user's label", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await deleteLabel(999, VICTIM_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent reordering another user's labels", async () => {
    setMockAuthUser(ATTACKER_USER);
    const result = await reorderLabels(VICTIM_ID, [{ id: 1, position: 2 }]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent getting a specific label of another user", async () => {
    setMockAuthUser(ATTACKER_USER);
    await expect(getLabel(999, VICTIM_ID)).rejects.toThrow(/Forbidden|authorized/i);
  });

  it.skip("should allow creating and getting labels for authorized user", async () => {
    const AUTHORIZED_USER = {
      id: AUTHORIZED_ID,
      email: "authorized@example.com",
      firstName: "Authorized",
      lastName: "User",
      profilePictureUrl: null,
    };
    setMockAuthUser(AUTHORIZED_USER);

    const result = await createLabel({
      userId: AUTHORIZED_ID,
      name: "My Label",
      color: "#0000ff",
      position: 1
    });

    // Ensure creation succeeded
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(AUTHORIZED_ID);
      expect(result.data.name).toBe("My Label");
    }

    const labelsResult = await getLabels(AUTHORIZED_ID);
    expect(labelsResult.length).toBeGreaterThan(0);
    expect(labelsResult.find(l => l.name === "My Label")).toBeDefined();
  });
});
