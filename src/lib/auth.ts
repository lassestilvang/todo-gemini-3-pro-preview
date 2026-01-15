"use server";

import { withAuth, signOut as workosSignOut } from "@workos-inc/authkit-nextjs";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UnauthorizedError, ForbiddenError } from "./auth-errors";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * Get test user from test session cookie (E2E test mode only).
 */
async function getTestUser(): Promise<AuthUser | null> {
  if (process.env.E2E_TEST_MODE !== 'true') {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const testSession = cookieStore.get('wos-session-test');

    if (testSession) {
      const session = JSON.parse(testSession.value);
      if (session.user && session.expiresAt > Date.now()) {
        return {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName ?? null,
          lastName: session.user.lastName ?? null,
          avatarUrl: session.user.profilePictureUrl ?? null,
        };
      }
    }
  } catch {
    // Invalid session - return null
  }

  return null;
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 * 
 * In E2E test mode, checks for test session cookie instead of WorkOS.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // In E2E test mode, only use test session (skip WorkOS entirely)
  if (process.env.E2E_TEST_MODE === 'true') {
    return getTestUser();
  }

  const { user } = await withAuth();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    avatarUrl: user.profilePictureUrl ?? null,
  };
}

/**
 * Require authentication for a server action.
 * Throws UnauthorizedError if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

/**
 * Sync user data from WorkOS to local database.
 * Creates user if not exists, updates if exists.
 * Also initializes default data for new users.
 */
export async function syncUser(workosUser: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}): Promise<AuthUser> {
  // Upsert user with onConflictDoUpdate to avoid race conditions
  const [upsertedUser] = await db
    .insert(users)
    .values({
      id: workosUser.id,
      email: workosUser.email,
      firstName: workosUser.firstName ?? null,
      lastName: workosUser.lastName ?? null,
      avatarUrl: workosUser.profilePictureUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: workosUser.email,
        firstName: workosUser.firstName ?? null,
        lastName: workosUser.lastName ?? null,
        avatarUrl: workosUser.profilePictureUrl ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Initialize default data for new users (not yet initialized)
  if (!upsertedUser.isInitialized) {
    try {
      // Use individual statements with onConflictDoNothing to handle race conditions from parallel tests
      await db.insert(lists)
        .values({
          userId: upsertedUser.id,
          name: "Inbox",
          slug: "inbox",
          color: "#6366f1",
          icon: "inbox",
        })
        .onConflictDoNothing({ target: [lists.userId, lists.slug] });

      await db.insert(userStats)
        .values({
          userId: upsertedUser.id,
          xp: 0,
          level: 1,
          currentStreak: 0,
          longestStreak: 0,
        })
        .onConflictDoNothing({ target: userStats.userId });

      await db.update(users)
        .set({ isInitialized: true })
        .where(eq(users.id, upsertedUser.id));
    } catch (error) {
      // If initialization fails due to race conditions, log and continue
      // The user is likely already initialized by another parallel request
      console.warn("SyncUser initialization race condition:", error);
    }
  }

  return {
    id: upsertedUser.id,
    email: upsertedUser.email,
    firstName: upsertedUser.firstName,
    lastName: upsertedUser.lastName,
    avatarUrl: upsertedUser.avatarUrl,
  };
}

/**
 * Sign out the current user.
 * Clears the session and redirects to login.
 */
export async function signOut(): Promise<void> {
  await workosSignOut();
  redirect("/login");
}

/**
 * Check if a resource belongs to the authenticated user.
 * Returns true if the resource belongs to the user, false otherwise.
 */
export async function checkResourceOwnership(
  resourceUserId: string | null | undefined,
  authenticatedUserId: string
): Promise<boolean> {
  if (!resourceUserId) {
    return false;
  }
  return resourceUserId === authenticatedUserId;
}

/**
 * Verify resource ownership and throw if unauthorized.
 * Throws ForbiddenError if the resource doesn't belong to the user.
 */
export async function requireResourceOwnership(
  resourceUserId: string | null | undefined,
  authenticatedUserId: string
): Promise<void> {
  const isOwner = await checkResourceOwnership(resourceUserId, authenticatedUserId);
  if (!isOwner) {
    throw new ForbiddenError();
  }
}
