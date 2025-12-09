import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncUser } from '@/lib/auth';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  // Only allow in E2E test mode
  if (process.env.E2E_TEST_MODE !== 'true') {
    return NextResponse.json(
      { error: 'Test auth is only available in E2E test mode' },
      { status: 403 }
    );
  }

  try {
    // Sync the test user to the database
    await syncUser(TEST_USER);

    // Set a test session cookie
    const cookieStore = await cookies();
    cookieStore.set('wos-session-test', JSON.stringify({
      user: TEST_USER,
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
      user: TEST_USER,
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
