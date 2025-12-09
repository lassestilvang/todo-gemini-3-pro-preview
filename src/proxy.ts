import { authkit } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { syncUser } from '@/lib/auth';

const unauthenticatedPaths = ['/login', '/auth/callback'];

// Sync user at most once per hour (in milliseconds)
const USER_SYNC_INTERVAL_MS = 60 * 60 * 1000;
const USER_SYNC_COOKIE_NAME = 'user_last_synced';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is unauthenticated
  const isUnauthenticated = unauthenticatedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  const { session, headers: authkitHeaders, authorizationUrl } = await authkit(request);

  // If unauthenticated path, just forward with authkit headers
  if (isUnauthenticated) {
    const response = NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });

    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    return response;
  }

  // Protected route - redirect to login if no session
  if (!session?.user) {
    if (!authorizationUrl) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const response = NextResponse.redirect(authorizationUrl);

    for (const [key, value] of authkitHeaders) {
      if (key.toLowerCase() === 'set-cookie') {
        response.headers.append(key, value);
      } else {
        response.headers.set(key, value);
      }
    }

    return response;
  }

  // Check if we need to sync user (only sync periodically, not on every request)
  const lastSyncedCookie = request.cookies.get(USER_SYNC_COOKIE_NAME);
  const lastSynced = lastSyncedCookie ? parseInt(lastSyncedCookie.value, 10) : 0;
  const now = Date.now();
  const shouldSync = now - lastSynced > USER_SYNC_INTERVAL_MS;

  // User is authenticated, forward request with authkit headers
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  // Sync user to database periodically (creates if not exists, updates if exists)
  if (shouldSync) {
    try {
      await syncUser({
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        profilePictureUrl: session.user.profilePictureUrl,
      });
      // Update the last synced timestamp cookie
      response.cookies.set(USER_SYNC_COOKIE_NAME, now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: USER_SYNC_INTERVAL_MS / 1000, // Cookie expires when sync is needed again
      });
    } catch (error) {
      console.error('Failed to sync user to database:', error);
      // Continue anyway - the upsert may have partially succeeded or will retry on next interval
    }
  }

  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  }

  return response;
}

// Configure which routes the proxy runs on
// Excludes static files, images, and other assets
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|.*\\.svg).*)',
  ],
};
