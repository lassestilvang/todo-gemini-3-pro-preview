import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser, resetMockAuthUser } from "@/test/mocks";
import { createList, updateList } from "./lists";

describe("Lists Input Limits", () => {
  let USER_ID: string;
  let USER: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profilePictureUrl: string | null;
  };

  beforeEach(async () => {
    USER_ID = `limit_user_${Math.random().toString(36).substring(7)}`;
    await createTestUser(USER_ID, `${USER_ID}@example.com`);

    USER = {
      id: USER_ID,
      email: `${USER_ID}@example.com`,
      firstName: "Limit",
      lastName: "User",
      profilePictureUrl: null,
    };
  });

  it("should prevent creating a list with a name > 255 chars", async () => {
    try {
      setMockAuthUser(USER);
      const longName = "a".repeat(256);
      const result = await createList({
        userId: USER_ID,
        name: longName,
        slug: "long-name-list",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("too long");
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should allow creating a list with a name = 255 chars", async () => {
    try {
      setMockAuthUser(USER);
      const longName = "a".repeat(255);
      const result = await createList({
        userId: USER_ID,
        name: longName,
        slug: "valid-long-name-list",
      });

      expect(result.success).toBe(true);
      if (result.success) {
          expect(result.data.name).toBe(longName);
      }
    } finally {
      resetMockAuthUser();
    }
  });

  it("should prevent updating a list with a name > 255 chars", async () => {
    try {
      setMockAuthUser(USER);
      const createResult = await createList({
        userId: USER_ID,
        name: "Valid Name",
        slug: "update-test-list",
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const longName = "b".repeat(256);
      const updateResult = await updateList(createResult.data.id, USER_ID, {
        name: longName,
      });

      expect(updateResult.success).toBe(false);
      if (!updateResult.success) {
        expect(updateResult.error.code).toBe("VALIDATION_ERROR");
        expect(updateResult.error.message).toContain("too long");
      }
    } finally {
      resetMockAuthUser();
    }
  });
});
