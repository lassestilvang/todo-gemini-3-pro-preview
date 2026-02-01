import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { getLabels, createLabel, updateLabel, deleteLabel, reorderLabels, getLabel } from "./labels";

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

  it("should prevent getting another user's labels", async () => {
    try {
      await getLabels(VICTIM_ID);
      // Should fail if security check is missing (meaning it returned data or empty array without error)
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
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
    // Act as ATTACKER (who is the authenticated user)
    const result = await createLabel({
      userId: ATTACKER_ID,
      name: "My Label",
      color: "#0000ff",
      position: 1
    });

    expect(result.success).toBe(true);
    if (result.success && result.data) {
       expect(result.data.userId).toBe(ATTACKER_ID);
       expect(result.data.name).toBe("My Label");
    }

    const labels = await getLabels(ATTACKER_ID);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.find(l => l.name === "My Label")).toBeDefined();
  });
});
