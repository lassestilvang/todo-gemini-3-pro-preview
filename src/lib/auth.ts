"use server";

import { withAuth, signOut as workosSignOut } from "@workos-inc/authkit-nextjs";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

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
 * Throws an error if not authenticated.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("UNAUTHORIZED");
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
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, workosUser.id))
    .limit(1);

  if (existingUser.length > 0) {
    // Update existing user
    await db
      .update(users)
      .set({
        email: workosUser.email,
        firstName: workosUser.firstName ?? null,
        lastName: workosUser.lastName ?? null,
        avatarUrl: workosUser.profilePictureUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, workosUser.id));

    return {
      id: workosUser.id,
      email: workosUser.email,
      firstName: workosUser.firstName ?? null,
      lastName: workosUser.lastName ?? null,
      avatarUrl: workosUser.profilePictureUrl ?? null,
    };
  }

  // Create new user and initialize default data in a single atomic batch
  // This ensures if initialization fails, the user insert is rolled back
  await db.batch([
    db.insert(users).values({
      id: workosUser.id,
      email: workosUser.email,
      firstName: workosUser.firstName ?? null,
      lastName: workosUser.lastName ?? null,
      avatarUrl: workosUser.profilePictureUrl ?? null,
    }),
    db.insert(lists).values({
      userId: workosUser.id,
      name: "Inbox",
      slug: "inbox",
      color: "#6366f1",
      icon: "inbox",
    }),
    db.insert(userStats).values({
      userId: workosUser.id,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
    }),
  ]);

  return {
    id: workosUser.id,
    email: workosUser.email,
    firstName: workosUser.firstName ?? null,
    lastName: workosUser.lastName ?? null,
    avatarUrl: workosUser.profilePictureUrl ?? null,
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
 */
export async function requireResourceOwnership(
  resourceUserId: string | null | undefined,
  authenticatedUserId: string
): Promise<void> {
  const isOwner = await checkResourceOwnership(resourceUserId, authenticatedUserId);
  if (!isOwner) {
    throw new Error("FORBIDDEN");
  }
}
