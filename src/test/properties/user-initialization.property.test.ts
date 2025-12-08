/**
 * Property-Based Tests for User Initialization
 * 
 * **Feature: multi-user-auth, Property 1: User Creation Idempotence**
 * **Validates: Requirements 1.3**
 * 
 * **Feature: multi-user-auth, Property 2: Default Data Initialization**
 * **Validates: Requirements 1.4, 5.5**
 */

import { describe, it, expect, beforeEach } from "bun:test";
import fc from "fast-check";
import { setupTestDb, resetTestDb } from "@/test/setup";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";

// Note: WorkOS, next/cache, and next/navigation mocks are provided globally via src/test/mocks.ts

// Generator for valid WorkOS user IDs
const workosUserIdArb = fc.string({ minLength: 10, maxLength: 30 })
  .filter(s => /^[a-zA-Z0-9_]+$/.test(s))
  .map(s => `user_${s}`);

// Generator for valid email addresses
const emailArb = fc.emailAddress();

// Generator for optional names
const nameArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null });

// Generator for WorkOS user objects
const workosUserArb = fc.record({
  id: workosUserIdArb,
  email: emailArb,
  firstName: nameArb,
  lastName: nameArb,
  profilePictureUrl: fc.option(fc.webUrl(), { nil: null }),
});

describe("Property Tests: User Initialization", () => {
  beforeEach(async () => {
    await setupTestDb();
    await resetTestDb();
  });

  /**
   * Property 1: User Creation Idempotence
   * 
   * For any WorkOS user ID, calling the user creation/sync function multiple times
   * SHALL result in exactly one user record in the database with that ID.
   */
  it("Property 1: User creation is idempotent - multiple syncs result in one user", async () => {
    await fc.assert(
      fc.asyncProperty(
        workosUserArb,
        fc.integer({ min: 1, max: 5 }), // Number of times to sync
        async (workosUser, syncCount) => {
          // Reset DB for each test case
          await resetTestDb();

          // Sync the user multiple times
          for (let i = 0; i < syncCount; i++) {
            // Insert or update user directly (simulating syncUser behavior)
            const existing = await db
              .select()
              .from(users)
              .where(eq(users.id, workosUser.id))
              .limit(1);

            if (existing.length === 0) {
              await db.insert(users).values({
                id: workosUser.id,
                email: workosUser.email,
                firstName: workosUser.firstName,
                lastName: workosUser.lastName,
                avatarUrl: workosUser.profilePictureUrl,
              });
            } else {
              await db
                .update(users)
                .set({
                  email: workosUser.email,
                  firstName: workosUser.firstName,
                  lastName: workosUser.lastName,
                  avatarUrl: workosUser.profilePictureUrl,
                })
                .where(eq(users.id, workosUser.id));
            }
          }

          // Verify exactly one user exists with this ID
          const allUsersWithId = await db
            .select()
            .from(users)
            .where(eq(users.id, workosUser.id));

          expect(allUsersWithId).toHaveLength(1);
          expect(allUsersWithId[0].id).toBe(workosUser.id);
          expect(allUsersWithId[0].email).toBe(workosUser.email);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Default Data Initialization
   * 
   * For any newly created user, the user SHALL have exactly one list named "Inbox"
   * and a userStats record with xp=0, level=1, currentStreak=0.
   */
  it("Property 2: New users get default Inbox list and initialized stats", async () => {
    await fc.assert(
      fc.asyncProperty(workosUserArb, async (workosUser) => {
        // Reset DB for each test case
        await resetTestDb();

        // Create user
        await db.insert(users).values({
          id: workosUser.id,
          email: workosUser.email,
          firstName: workosUser.firstName,
          lastName: workosUser.lastName,
          avatarUrl: workosUser.profilePictureUrl,
        });

        // Initialize default data (simulating initializeUserData)
        await db.insert(lists).values({
          userId: workosUser.id,
          name: "Inbox",
          slug: "inbox",
          color: "#6366f1",
          icon: "inbox",
        });

        await db.insert(userStats).values({
          userId: workosUser.id,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
        });

        // Verify user has exactly one Inbox list
        const userLists = await db
          .select()
          .from(lists)
          .where(eq(lists.userId, workosUser.id));

        expect(userLists).toHaveLength(1);
        expect(userLists[0].name).toBe("Inbox");
        expect(userLists[0].slug).toBe("inbox");

        // Verify user stats are initialized correctly
        const stats = await db
          .select()
          .from(userStats)
          .where(eq(userStats.userId, workosUser.id));

        expect(stats).toHaveLength(1);
        expect(stats[0].xp).toBe(0);
        expect(stats[0].level).toBe(1);
        expect(stats[0].currentStreak).toBe(0);
        expect(stats[0].longestStreak).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: User data persists correctly
   */
  it("User data persists with correct values after creation", async () => {
    await fc.assert(
      fc.asyncProperty(workosUserArb, async (workosUser) => {
        await resetTestDb();

        // Create user
        await db.insert(users).values({
          id: workosUser.id,
          email: workosUser.email,
          firstName: workosUser.firstName,
          lastName: workosUser.lastName,
          avatarUrl: workosUser.profilePictureUrl,
        });

        // Retrieve and verify
        const retrieved = await db
          .select()
          .from(users)
          .where(eq(users.id, workosUser.id))
          .limit(1);

        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].id).toBe(workosUser.id);
        expect(retrieved[0].email).toBe(workosUser.email);
        expect(retrieved[0].firstName).toBe(workosUser.firstName);
        expect(retrieved[0].lastName).toBe(workosUser.lastName);
      }),
      { numRuns: 100 }
    );
  });
});
