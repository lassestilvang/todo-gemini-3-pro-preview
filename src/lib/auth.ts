"use server";

import { withAuth, signOut as workosSignOut } from "@workos-inc/authkit-nextjs";
import { db, users, lists, userStats } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { UnauthorizedError, ForbiddenError } from "./auth-errors";
import { cache } from "react";
import {
  AUTH_BYPASS_HEADER,
  AUTH_BYPASS_SIGNATURE_HEADER,
  getAuthBypassIpAllowlist,
  getAuthBypassSecret,
  getDevBypassUserConfig,
  getProdBypassUserConfig,
  isDevBypassEnabled,
  verifyAuthBypassSignature,
  type BypassUserConfig,
} from "./auth-bypass";
import { getClientIp } from "@/lib/ip-utils";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  use24HourClock: boolean | null;
  weekStartsOnMonday: boolean | null;
  calendarUseNativeTooltipsOnDenseDays: boolean | null;
  calendarDenseTooltipThreshold: number | null;
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
          use24HourClock: session.user.use24HourClock ?? null,
          weekStartsOnMonday: session.user.weekStartsOnMonday ?? null,
          calendarUseNativeTooltipsOnDenseDays: null,
          calendarDenseTooltipThreshold: null,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getOrCreateBypassUser(
  config: BypassUserConfig
): Promise<AuthUser> {
  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarUrl: users.avatarUrl,
      isInitialized: users.isInitialized,
      use24HourClock: users.use24HourClock,
      weekStartsOnMonday: users.weekStartsOnMonday,
      calendarUseNativeTooltipsOnDenseDays: users.calendarUseNativeTooltipsOnDenseDays,
      calendarDenseTooltipThreshold: users.calendarDenseTooltipThreshold,
    })
    .from(users)
    .where(eq(users.id, config.userId))
    .limit(1);

  if (!dbUser || !dbUser.isInitialized) {
    return syncUser({
      id: config.userId,
      email: config.email,
      firstName: config.firstName ?? undefined,
      lastName: config.lastName ?? undefined,
      profilePictureUrl: config.avatarUrl ?? undefined,
    });
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName ?? config.firstName ?? null,
    lastName: dbUser.lastName ?? config.lastName ?? null,
    avatarUrl: dbUser.avatarUrl ?? config.avatarUrl ?? null,
    use24HourClock: dbUser.use24HourClock ?? null,
    weekStartsOnMonday: dbUser.weekStartsOnMonday ?? null,
    calendarUseNativeTooltipsOnDenseDays: dbUser.calendarUseNativeTooltipsOnDenseDays ?? null,
    calendarDenseTooltipThreshold: dbUser.calendarDenseTooltipThreshold ?? null,
  };
}

async function getBypassUser(): Promise<AuthUser | null> {
  if (process.env.E2E_TEST_MODE === "true") {
    return null;
  }

  if (isDevBypassEnabled()) {
    return getOrCreateBypassUser(getDevBypassUserConfig());
  }

  const bypassConfig = getProdBypassUserConfig();
  if (!bypassConfig) {
    return null;
  }

  const secret = getAuthBypassSecret();
  if (!secret) {
    return null;
  }

  const headerStore = await headers();

  const clientIp = getClientIp(headerStore);
  const allowlist = getAuthBypassIpAllowlist();
  if (!clientIp || !allowlist.includes(clientIp)) {
    return null;
  }

  const bypassHeader = headerStore.get(AUTH_BYPASS_HEADER);
  if (bypassHeader !== "1") {
    return null;
  }

  const signature = headerStore.get(AUTH_BYPASS_SIGNATURE_HEADER);
  if (!signature) {
    return null;
  }

  const isValid = await verifyAuthBypassSignature(
    bypassConfig.userId,
    secret,
    signature
  );

  if (!isValid) {
    return null;
  }

  return getOrCreateBypassUser(bypassConfig);
}

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 * In E2E test mode, checks for test session cookie instead of WorkOS.
 * In dev or IP-allowlisted bypass mode, uses the configured bypass user.
 */
async function getCurrentUserImpl(): Promise<AuthUser | null> {
  // In E2E test mode, only use test session (skip WorkOS entirely)
  if (process.env.E2E_TEST_MODE === 'true') {
    return getTestUser();
  }

  const bypassUser = await getBypassUser();
  if (bypassUser) {
    return bypassUser;
  }

  const { user } = await withAuth();

  if (!user) {
    return null;
  }

  const [dbUser] = await db
    .select({
      use24HourClock: users.use24HourClock,
      weekStartsOnMonday: users.weekStartsOnMonday,
      calendarUseNativeTooltipsOnDenseDays: users.calendarUseNativeTooltipsOnDenseDays,
      calendarDenseTooltipThreshold: users.calendarDenseTooltipThreshold,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    avatarUrl: user.profilePictureUrl ?? null,
    use24HourClock: dbUser?.use24HourClock ?? null,
    weekStartsOnMonday: dbUser?.weekStartsOnMonday ?? null,
    calendarUseNativeTooltipsOnDenseDays: dbUser?.calendarUseNativeTooltipsOnDenseDays ?? null,
    calendarDenseTooltipThreshold: dbUser?.calendarDenseTooltipThreshold ?? null,
  };
}

export const getCurrentUser =
  process.env.NODE_ENV === "test" || process.env.E2E_TEST_MODE === "true"
    ? getCurrentUserImpl
    : cache(getCurrentUserImpl);

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
    use24HourClock: upsertedUser.use24HourClock ?? null,
    weekStartsOnMonday: upsertedUser.weekStartsOnMonday ?? null,
    calendarUseNativeTooltipsOnDenseDays: upsertedUser.calendarUseNativeTooltipsOnDenseDays ?? null,
    calendarDenseTooltipThreshold: upsertedUser.calendarDenseTooltipThreshold ?? null,
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

/**
 * Require that the current authenticated user matches the provided userId.
 * Use this to protect Server Actions from IDOR attacks.
 * Throws UnauthorizedError if not authenticated.
 * Throws ForbiddenError if authenticated user does not match userId.
 */
export async function requireUser(userId: string): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  return user;
}
