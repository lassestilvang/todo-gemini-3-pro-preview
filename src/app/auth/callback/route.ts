import { handleAuth } from '@workos-inc/authkit-nextjs';

// Handle the OAuth callback from WorkOS
// This exchanges the authorization code for a session and sets the cookie
// After successful auth, redirects to the inbox page
export const GET = handleAuth({ returnPathname: '/inbox' });
