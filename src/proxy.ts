import { authkit } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';

const unauthenticatedPaths = ['/login', '/auth/callback'];

function applyAuthkitHeaders(response: NextResponse, authkitHeaders: Headers) {
  for (const [key, value] of authkitHeaders) {
    if (key.toLowerCase() === 'set-cookie') {
      response.headers.append(key, value);
    } else {
      response.headers.set(key, value);
    }
  }
}

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
    applyAuthkitHeaders(response, authkitHeaders);
    return response;
  }

  // Protected route - redirect to login if no session
  if (!session?.user) {
    const redirectUrl = authorizationUrl || new URL('/login', request.url);
    const response = NextResponse.redirect(redirectUrl);
    applyAuthkitHeaders(response, authkitHeaders);
    return response;
  }

  // User is authenticated, forward request with authkit headers
  // Note: User sync happens in /auth/callback on sign-in, not on every request
  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  applyAuthkitHeaders(response, authkitHeaders);
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
