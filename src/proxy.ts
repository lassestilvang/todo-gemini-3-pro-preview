import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Custom middleware that supports E2E test mode.
 * 
 * When E2E_TEST_MODE=true, it checks for a test session cookie
 * and allows access to protected routes for authenticated test users.
 */
async function testModeMiddleware(request: NextRequest) {
  const cookieStore = await cookies();
  const testSession = cookieStore.get('wos-session-test');

  if (testSession) {
    try {
      const session = JSON.parse(testSession.value);
      if (session.user && session.expiresAt > Date.now()) {
        // Valid test session - allow the request to proceed
        return NextResponse.next();
      }
    } catch {
      // Invalid session cookie - continue to normal auth
    }
  }

  // No valid test session - redirect to login for protected routes
  const pathname = request.nextUrl.pathname;
  const unauthenticatedPaths = ['/', '/login', '/auth/callback', '/sw.js'];
  const isApiRoute = pathname.startsWith('/api/');

  if (!unauthenticatedPaths.includes(pathname) && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Use test mode middleware when E2E_TEST_MODE is enabled
const middleware = process.env.E2E_TEST_MODE === 'true'
  ? testModeMiddleware
  : authkitMiddleware({
    middlewareAuth: {
      enabled: true,
      unauthenticatedPaths: [
        '/',
        '/login',
        '/auth/callback',
        '/sw.js',
        // API routes should be handled separately or excluded
        '/api/:path*',
      ],
    },
  });

export default middleware;

// Configure which routes the middleware runs on
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
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-.*\\.png|.*\\.svg).*)',
  ],
};
