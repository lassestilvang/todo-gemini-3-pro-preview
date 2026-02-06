import { authkitMiddleware } from '@workos-inc/authkit-nextjs';
import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
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

function testModeMiddleware(request: NextRequest) {
  const testSession = request.cookies.get('wos-session-test');

  if (testSession) {
    try {
      const session = JSON.parse(testSession.value);
      if (session.user && session.expiresAt > Date.now()) {
        return NextResponse.next();
      }
    } catch {
      // Invalid session cookie - continue to normal auth
    }
  }

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
      '/api/:path*',
    ],
  },
});

function getRequestIp(request: NextRequest): string | null {
  const xff = request.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip');
  return normalizeIp(first ?? realIp ?? null);
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

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const bypassResponse = await maybeBypassAuth(request);
  if (bypassResponse) {
    return bypassResponse;
  }

  if (process.env.E2E_TEST_MODE === 'true') {
    return testModeMiddleware(request);
  }

  return workosMiddleware(request, event);
}


