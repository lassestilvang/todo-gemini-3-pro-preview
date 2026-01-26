import Link from 'next/link';
import { getSignInUrl, getSignUpUrl } from '@workos-inc/authkit-nextjs';
import { CheckCircle2, Sparkles, Target, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginPageProps {
  searchParams: Promise<{ message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const message = params.message;
  let signInUrl: string;
  let signUpUrl: string;

  // In E2E test mode, use placeholder URLs since we bypass WorkOS OAuth
  if (process.env.E2E_TEST_MODE === 'true') {
    signInUrl = '/api/test-auth';
    signUpUrl = '/api/test-auth';
  } else {
    try {
      signInUrl = await getSignInUrl();
      signUpUrl = await getSignUpUrl();
    } catch (error) {
      console.error('Failed to get authentication URLs:', error);
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950 p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-white" aria-hidden="true" />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Todo Gemini</h1>
            <p className="text-muted-foreground">
              Unable to load authentication. Please try again later.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Retry</Link>
            </Button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-violet-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Todo Gemini</h1>
          <p className="text-muted-foreground">
            AI-powered daily task planner
          </p>
        </div>

        {/* Session Expired Message */}
        {message === 'session_expired' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Your session has expired. Please sign in again.</p>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs text-muted-foreground">AI-Powered</span>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-xs text-muted-foreground">Focus Mode</span>
          </div>
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
            <span className="text-xs text-muted-foreground">Gamification</span>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3">
          <Button asChild className="w-full h-11" size="lg" data-testid="sign-in-button">
            <Link href={signInUrl}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11" size="lg" data-testid="sign-up-button">
            <Link href={signUpUrl}>Create an account</Link>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
