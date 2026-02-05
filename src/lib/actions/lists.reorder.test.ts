import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";
import { createList, getLists, reorderLists } from "./lists";

describe("Lists Reorder", () => {
  const USER_ID = "user_reorder_test";

  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTestDb();
    setMockAuthUser({
      id: USER_ID,
      email: "reorder@example.com",
      firstName: "Reorder",
      lastName: "Tester",
      profilePictureUrl: null,
    });
  });

  afterEach(() => {
    clearMockAuthUser();
  });

  it("should reorder lists correctly", async () => {
    // 1. Create lists
    const list1 = await createList({ userId: USER_ID, name: "List 1", slug: "list-1", position: 0 });
    const list2 = await createList({ userId: USER_ID, name: "List 2", slug: "list-2", position: 1 });
    const list3 = await createList({ userId: USER_ID, name: "List 3", slug: "list-3", position: 2 });

    if (!list1.success || !list2.success || !list3.success) {
      throw new Error("Failed to create lists");
    }

    const l1 = list1.data!;
    const l2 = list2.data!;
    const l3 = list3.data!;

    // Verify initial order
    const initialLists = await getLists(USER_ID);
    expect(initialLists).toHaveLength(3);
    expect(initialLists[0].id).toBe(l1.id);
    expect(initialLists[1].id).toBe(l2.id);
    expect(initialLists[2].id).toBe(l3.id);

    // 2. Reorder: Move List 3 to top (pos 0), List 1 to pos 1, List 2 to pos 2
    // Note: The UI usually sends updates for all affected items
    const reorderItems = [
      { id: l3.id, position: 0 },
      { id: l1.id, position: 1 },
      { id: l2.id, position: 2 },
    ];

    const result = await reorderLists(USER_ID, reorderItems);
    expect(result.success).toBe(true);

    // 3. Verify new order
    const updatedLists = await getLists(USER_ID);
    expect(updatedLists).toHaveLength(3);

    // Sort by position to verify (getLists already sorts by position)
    expect(updatedLists[0].id).toBe(l3.id);
    expect(updatedLists[0].position).toBe(0);

    expect(updatedLists[1].id).toBe(l1.id);
    expect(updatedLists[1].position).toBe(1);

    expect(updatedLists[2].id).toBe(l2.id);
    expect(updatedLists[2].position).toBe(2);
  });
});
