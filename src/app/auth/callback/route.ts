import { handleAuth } from '@workos-inc/authkit-nextjs';
import { syncUser } from '@/lib/auth';

// Handle the OAuth callback from WorkOS
// This exchanges the authorization code for a session, syncs the user to the DB,
// and sets the session cookie. After successful auth, redirects to the inbox page.
export const GET = handleAuth({
  onSignIn: async ({ user }) => {
    // Sync user on every sign-in to keep profile data fresh
    await syncUser(user);
  },
  onSignUp: async ({ user }) => {
    // Sync user on sign-up to create local record and default data
    await syncUser(user);
  },
  returnPathname: '/inbox',
});

