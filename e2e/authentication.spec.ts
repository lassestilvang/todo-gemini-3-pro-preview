import { test, expect, authenticateTestUser, clearTestSession, isOnLoginPage } from './fixtures';

/**
 * E2E tests for authentication flow.
 * 
 * Requirements: 5.4
 * - Test login flow
 * - Test accessing protected routes
 * - Test logout flow
 * 
 * These tests use E2E_TEST_MODE to bypass WorkOS OAuth.
 */
test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login page with sign in options', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('load');

      // Verify page title and description
      await expect(page.getByRole('heading', { name: 'Todo Gemini' })).toBeVisible();
      await expect(page.getByText('AI-powered daily task planner')).toBeVisible();

      // Verify sign in and sign up buttons
      const signInButton = page.getByTestId('sign-in-button');
      const signUpButton = page.getByTestId('sign-up-button');

      await expect(signInButton).toBeVisible();
      await expect(signUpButton).toBeVisible();

      // Verify buttons have correct text
      await expect(signInButton).toContainText('Sign in');
      await expect(signUpButton).toContainText('Create an account');
    });

    test('should display feature highlights on login page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('load');

      // Verify feature highlights are shown (use exact text to avoid ambiguity)
      await expect(page.getByText('AI-Powered', { exact: true })).toBeVisible();
      await expect(page.getByText('Focus Mode', { exact: true })).toBeVisible();
      await expect(page.getByText('Gamification', { exact: true })).toBeVisible();
    });

    test('should display session expired message when redirected', async ({ page }) => {
      await page.goto('/login?message=session_expired');
      await page.waitForLoadState('load');

      // Verify session expired message is shown
      await expect(page.getByText('Your session has expired')).toBeVisible();
    });

    test('sign in button should have href attribute', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('load');

      const signInButton = page.getByTestId('sign-in-button');
      const href = await signInButton.getAttribute('href');

      // Should have a valid href for authentication
      expect(href).toBeTruthy();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing inbox unauthenticated', async ({ page }) => {
      // Clear any existing session first
      await clearTestSession(page);

      await page.goto('/inbox');
      await page.waitForLoadState('load');

      // Should be redirected to login (either /login or WorkOS authkit)
      expect(await isOnLoginPage(page)).toBe(true);
    });

    test('should redirect to login when accessing today page unauthenticated', async ({ page }) => {
      await clearTestSession(page);

      await page.goto('/today');
      await page.waitForLoadState('load');

      expect(await isOnLoginPage(page)).toBe(true);
    });

    test('should redirect to login when accessing calendar unauthenticated', async ({ page }) => {
      await clearTestSession(page);

      await page.goto('/calendar');
      await page.waitForLoadState('load');

      expect(await isOnLoginPage(page)).toBe(true);
    });

    test('should redirect to login when accessing settings unauthenticated', async ({ page }) => {
      await clearTestSession(page);

      await page.goto('/settings');
      await page.waitForLoadState('load');

      expect(await isOnLoginPage(page)).toBe(true);
    });

    test('should redirect to login when accessing analytics unauthenticated', async ({ page }) => {
      await clearTestSession(page);

      await page.goto('/analytics');
      await page.waitForLoadState('load');

      expect(await isOnLoginPage(page)).toBe(true);
    });
  });

  test.describe('Authenticated Access', () => {
    test('should access inbox when authenticated', async ({ authenticatedPage: page }) => {
      await page.goto('/inbox');
      await page.waitForLoadState('load');

      // Should NOT be on login page
      expect(await isOnLoginPage(page)).toBe(false);

      // Should see the inbox page content (use heading to be specific)
      await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
    });

    test('should allow access to protected routes after authentication', async ({ authenticatedPage: page }) => {
      await page.goto('/today');
      await page.waitForLoadState('load');

      expect(await isOnLoginPage(page)).toBe(false);
      await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    });

    test('should show user profile when authenticated', async ({ authenticatedPage: page }) => {
      await page.goto('/inbox');
      await page.waitForLoadState('load');

      // User profile should be visible in sidebar
      // The test user name should appear
      await expect(page.getByText('E2E Test User')).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test('should redirect to login after clearing session', async ({ page }) => {
      // Navigate to establish origin for fetch
      await page.goto('/');
      // First authenticate
      await authenticateTestUser(page);

      await page.goto('/inbox');
      await page.waitForLoadState('load');

      // Verify we're authenticated
      expect(await isOnLoginPage(page)).toBe(false);

      // Clear the session
      await clearTestSession(page);

      // Try to access a protected route
      await page.goto('/inbox');
      await page.waitForLoadState('load');

      // Should be redirected to login
      expect(await isOnLoginPage(page)).toBe(true);
    });
  });
});
