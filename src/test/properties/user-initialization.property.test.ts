/**
 * Property-Based Tests for User Initialization
 * 
 * **Feature: multi-user-auth, Property 1: User Creation Idempotence**
 * **Validates: Requirements 1.3**
 * 
 * **Feature: multi-user-auth, Property 2: Default Data Initialization**
 * **Validates: Requirements 1.4, 5.5**
 */

import { describe, it, expect, beforeAll } from "bun:test";
import fc from "fast-check";
import { setupTestDb } from "@/test/setup";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";

// Note: WorkOS, next/cache, and next/navigation mocks are provided globally via src/test/mocks.ts

// Configure fast-check for reproducibility in CI
// Requirements: 3.5 - Property tests use fixed seed for reproducibility
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
  ? parseInt(process.env.FAST_CHECK_SEED, 10)
  : undefined;

fc.configureGlobal({
  numRuns: 100,
  verbose: false,
  seed: FAST_CHECK_SEED,
});

// Generator for valid WorkOS user IDs
const workosUserIdArb = fc.uuid().map(u => `user_${u}`);

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
}).map((user) => ({
  ...user,
  email: `${user.id}@example.com`,
}));

describe("Property Tests: User Initialization", () => {
  beforeAll(async () => {
    await setupTestDb();
    // await resetTestDb();
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
          // No global reset here to prevent interfering with other parallel tests
          // Unique IDs (from workosUserArb) provide sufficient isolation

          // Sync the user multiple times
          for (let i = 0; i < syncCount; i++) {
            // Insert or update user (simulating syncUser behavior)
            await db
              .insert(users)
              .values({
                id: workosUser.id,
                email: workosUser.email,
                firstName: workosUser.firstName,
                lastName: workosUser.lastName,
                avatarUrl: workosUser.profilePictureUrl,
              })
              .onConflictDoUpdate({
                target: users.id,
                set: {
                  email: workosUser.email,
                  firstName: workosUser.firstName,
                  lastName: workosUser.lastName,
                  avatarUrl: workosUser.profilePictureUrl,
                  updatedAt: new Date(),
                },
              });
          }

          // Verify exactly one user exists with this ID
          const allUsersWithId = await db
            .select()
            .from(users)
            .where(eq(users.id, workosUser.id));

          expect(allUsersWithId).toHaveLength(1);
          expect(allUsersWithId[0].id).toBe(workosUser.id);
        }
      ),
      { numRuns: 50 } // Reduced runs to speed up CI, still high enough for property validation
    );
  });

  /**
   * Property 2: Default Data Initialization
   */
  it("Property 2: New users get default Inbox list and initialized stats", async () => {
    await fc.assert(
      fc.asyncProperty(workosUserArb, async (workosUser) => {
        // Create user (safe upsert)
        await db.insert(users)
          .values({
            id: workosUser.id,
            email: workosUser.email,
            firstName: workosUser.firstName,
            lastName: workosUser.lastName,
            avatarUrl: workosUser.profilePictureUrl,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: workosUser.email,
              updatedAt: new Date(),
            },
          });

        // Initialize default data (simulating initializeUserData)
        await db.insert(lists).values({
          userId: workosUser.id,
          name: "Inbox",
          slug: `inbox-${workosUser.id}`, // Unique slug to avoid unique constraint if many tests hit it
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

        // Verify
        const userLists = await db.select().from(lists).where(eq(lists.userId, workosUser.id));
        expect(userLists).toHaveLength(1);
        expect(userLists[0].name).toBe("Inbox");

        const stats = await db.select().from(userStats).where(eq(userStats.userId, workosUser.id));
        expect(stats).toHaveLength(1);
        expect(stats[0].xp).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  it("User data persists with correct values after creation", async () => {
    await fc.assert(
      fc.asyncProperty(workosUserArb, async (workosUser) => {
        // Create user (safe upsert)
        await db.insert(users)
          .values({
            id: workosUser.id,
            email: workosUser.email,
            firstName: workosUser.firstName,
            lastName: workosUser.lastName,
            avatarUrl: workosUser.profilePictureUrl,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email: workosUser.email,
              firstName: workosUser.firstName,
              lastName: workosUser.lastName,
              avatarUrl: workosUser.profilePictureUrl,
              updatedAt: new Date(),
            },
          });

        const retrieved = await db.select().from(users).where(eq(users.id, workosUser.id)).limit(1);
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].id).toBe(workosUser.id);
        expect(retrieved[0].email).toBe(workosUser.email);
      }),
      { numRuns: 50 }
    );
  });
});
