"use server";

import { withAuth, signOut as workosSignOut } from "@workos-inc/authkit-nextjs";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { UnauthorizedError, ForbiddenError } from "./auth-errors";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
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
    await db.batch([
      db.insert(lists).values({
        userId: upsertedUser.id,
        name: "Inbox",
        slug: "inbox",
        color: "#6366f1",
        icon: "inbox",
      }),
      db.insert(userStats).values({
        userId: upsertedUser.id,
        xp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
      }),
      db.update(users)
        .set({ isInitialized: true })
        .where(eq(users.id, upsertedUser.id)),
    ]);
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
