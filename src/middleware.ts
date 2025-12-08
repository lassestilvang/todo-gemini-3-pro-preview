import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// Use middleware auth mode - all routes are protected by default
// except those listed in unauthenticatedPaths
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      '/login',
      '/auth/callback',
    ],
  },
});

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
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-.*\\.png|.*\\.svg).*)',
  ],
};
