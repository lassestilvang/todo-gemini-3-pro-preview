import { authkit } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { syncUser } from '@/lib/auth';

const unauthenticatedPaths = ['/login', '/auth/callback'];

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
  // Protected route - redirect to login if no session
  if (!session.user) {
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

  // Sync user to database (creates if not exists, updates if exists)
  try {
    await syncUser({
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      profilePictureUrl: session.user.profilePictureUrl,
    });
  } catch (error) {
    console.error('Failed to sync user:', error);
    // Continue anyway - user might already exist
  }

  // User is authenticated, forward request with authkit headers
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
