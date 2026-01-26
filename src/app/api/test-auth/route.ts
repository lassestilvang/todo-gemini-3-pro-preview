import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncUser } from '@/lib/auth';
import { db, tasks, labels, lists, userStats, viewSettings, templates, users } from '@/db';
import { eq } from 'drizzle-orm';

/**
 * Test authentication endpoint for E2E testing.
 * 
 * This endpoint is ONLY available when E2E_TEST_MODE=true.
 * It creates a mock authenticated session for testing purposes.
 * 
 * SECURITY: This should NEVER be enabled in production!
 */

const TEST_USER = {
  id: 'test-user-e2e-001',
  email: 'e2e-test@example.com',
  firstName: 'E2E',
  lastName: 'Test User',
  profilePictureUrl: null,
};

export async function POST() {
  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test auth is only available in E2E test mode' },
      { status: 403 }
    );
  }

  try {
    // Parse custom user data from body if provided
    const body = await request.json().catch(() => ({}));
    const userToSync = {
      id: body.id || TEST_USER.id,
      email: body.email || TEST_USER.email,
      firstName: body.firstName || TEST_USER.firstName,
      lastName: body.lastName || TEST_USER.lastName,
      profilePictureUrl: body.profilePictureUrl || TEST_USER.profilePictureUrl,
    };

    // 1. Clear existing data for this specific test user for perfect isolation
    // Everything references users.id with onDelete: "cascade"
    await db.delete(tasks).where(eq(tasks.userId, userToSync.id));
    await db.delete(labels).where(eq(labels.userId, userToSync.id));
    await db.delete(lists).where(eq(lists.userId, userToSync.id));
    await db.delete(userStats).where(eq(userStats.userId, userToSync.id));
    await db.delete(viewSettings).where(eq(viewSettings.userId, userToSync.id));
    await db.delete(templates).where(eq(templates.userId, userToSync.id));

    // Reset initialization flag so syncUser recreates Inbox and Stats
    await db.update(users)
      .set({ isInitialized: false })
      .where(eq(users.id, userToSync.id));

    // 2. Sync the test user to the database
    await syncUser(userToSync);

    // Set a test session cookie
    const cookieStore = await cookies();
    cookieStore.set('wos-session-test', JSON.stringify({
      user: userToSync,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }), {
      httpOnly: true,
      secure: false, // Allow HTTP for local testing
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return NextResponse.json({
      success: true,
      user: userToSync,
      message: 'Test session created'
    });
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json(
      { error: 'Failed to create test session' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test auth is only available in E2E test mode' },
      { status: 403 }
    );
  }

  // Clear the test session cookie
  const cookieStore = await cookies();
  cookieStore.delete('wos-session-test');

  return NextResponse.json({
    success: true,
    message: 'Test session cleared'
  });
}
