import { handleAuth } from '@workos-inc/authkit-nextjs';
import { syncUser } from '@/lib/auth';

// Handle the OAuth callback from WorkOS
// This exchanges the authorization code for a session, syncs the user to the DB,
// and sets the session cookie. After successful auth, redirects to the inbox page.
export const GET = handleAuth({
  returnPathname: '/inbox',
  onSuccess: async ({ user }) => {
    // Sync user on every sign-in/sign-up to keep profile data fresh
    await syncUser(user);
  },
});

