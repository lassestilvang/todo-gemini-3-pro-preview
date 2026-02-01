import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { getLabels, createLabel, updateLabel, deleteLabel, reorderLabels, getLabel } from "./labels";

describe("Labels Security (IDOR)", () => {
  const ATTACKER_ID = "attacker_123";
  const VICTIM_ID = "victim_456";
  const AUTHORIZED_ID = "authorized_789";

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    // Ensure users exist in DB to satisfy Foreign Key constraints
    await createTestUser(ATTACKER_ID, "attacker@example.com");
    await createTestUser(VICTIM_ID, "victim@example.com");
    await createTestUser(AUTHORIZED_ID, "authorized@example.com");

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

  it("should prevent getting another user's labels", async () => {
    try {
      await getLabels(VICTIM_ID);
      // Should fail if security check is missing (meaning it returned data or empty array without error)
      expect(true).toBe(false);
    } catch (error: any) {
      // Check for ForbiddenError by code or name/message to be robust across environments
      // In some CI environments, error.name might be generic "Error", so check message too
      if (error.code) {
        expect(error.code).toBe("FORBIDDEN");
      } else if (error.name === "ForbiddenError") {
        expect(error.name).toBe("ForbiddenError");
      } else {
         expect(error.message).toContain("not authorized");
      }
    }
  });

  it("should prevent creating a label for another user", async () => {
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

  it("should prevent getting a specific label of another user", async () => {
    try {
        await getLabel(999, VICTIM_ID);
        expect(true).toBe(false);
    } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should allow creating and getting labels for authorized user", async () => {
    // Use a fresh authorized user to avoid any cache/state overlap
    setMockAuthUser({
        id: AUTHORIZED_ID,
        email: "authorized@example.com",
        firstName: "Authorized",
        lastName: "User",
        profilePictureUrl: null,
    });

    const result = await createLabel({
      userId: AUTHORIZED_ID,
      name: "My Label",
      color: "#0000ff",
      position: 1
    });

    // Ensure creation succeeded
    expect(result.success).toBe(true);
    // Explicitly check the data to fail fast if it's missing
    expect(result.data).toBeDefined();
    expect(result.data!.userId).toBe(AUTHORIZED_ID);
    expect(result.data!.name).toBe("My Label");

    const labels = await getLabels(AUTHORIZED_ID);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.find(l => l.name === "My Label")).toBeDefined();
  });
});
