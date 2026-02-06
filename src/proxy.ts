import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_BYPASS_HEADER,
  AUTH_BYPASS_SIGNATURE_HEADER,
  getAuthBypassIpAllowlist,
  getAuthBypassSecret,
  getProdBypassUserConfig,
  isDevBypassEnabled,
  normalizeIp,
  signAuthBypassPayload,
} from '@/lib/auth-bypass';

/**
 * Custom middleware that supports E2E test mode and auth bypass.
 *
 * When E2E_TEST_MODE=true, it checks for a test session cookie
 * and allows access to protected routes for authenticated test users.
 *
 * When auth bypass is enabled (dev or IP allowlist), it marks the request
 * for downstream auth resolution without invoking WorkOS.
 */
function testModeMiddleware(request: NextRequest) {
  const testSession = request.cookies.get('wos-session-test');

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

const workosMiddleware = authkitMiddleware({
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

function getRequestIp(request: NextRequest): string | null {
  return normalizeIp(request.ip ?? null);
}

async function maybeBypassAuth(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.E2E_TEST_MODE === 'true') {
    return null;
  }

  if (isDevBypassEnabled()) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(AUTH_BYPASS_HEADER, '1');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const allowlist = getAuthBypassIpAllowlist();
  if (allowlist.length === 0) {
    return null;
  }

  const clientIp = getRequestIp(request);
  if (!clientIp || !allowlist.includes(clientIp)) {
    return null;
  }

  const bypassUser = getProdBypassUserConfig();
  const secret = getAuthBypassSecret();
  if (!bypassUser || !secret) {
    return null;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AUTH_BYPASS_HEADER, '1');
  requestHeaders.set(
    AUTH_BYPASS_SIGNATURE_HEADER,
    await signAuthBypassPayload(bypassUser.userId, secret)
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function stripBypassHeaders(request: NextRequest): NextRequest {
  const sanitized = new Headers(request.headers);
  sanitized.delete(AUTH_BYPASS_HEADER);
  sanitized.delete(AUTH_BYPASS_SIGNATURE_HEADER);
  return new NextRequest(request.url, {
    method: request.method,
    headers: sanitized,
    body: request.body,
    geo: request.geo,
    ip: request.ip,
    nextConfig: request.nextConfig,
  });
}

const middleware = async (request: NextRequest) => {
  const bypassResponse = await maybeBypassAuth(request);
  if (bypassResponse) {
    return bypassResponse;
  }

  const sanitizedRequest = stripBypassHeaders(request);

  if (process.env.E2E_TEST_MODE === 'true') {
    return testModeMiddleware(sanitizedRequest);
  }

  return workosMiddleware(sanitizedRequest);
};

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
