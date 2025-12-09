import { test, expect, isOnLoginPage, clearTestSession } from './fixtures';

/**
 * Smoke test to verify Playwright setup is working correctly.
 * 
 * Requirements: 5.1, 5.7
 * - Verifies Playwright is configured correctly
 * - Runs in headless mode for CI
 */
test.describe('Smoke Tests', () => {
  test('should load the login page', async ({ page }) => {
    // Navigate to the app root
    await page.goto('/');
    
    // Should redirect to login or inbox
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login page (unauthenticated) or inbox (authenticated)
    const url = page.url();
    expect(url).toMatch(/\/(login|inbox)/);
  });

  test('should display login page elements when not authenticated', async ({ page }) => {
    // Navigate directly to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Verify login page elements are present
    await expect(page.getByRole('heading', { name: 'Todo Gemini' })).toBeVisible();
    await expect(page.getByText('AI-powered daily task planner')).toBeVisible();
    
    // Check for sign in and sign up buttons
    await expect(page.getByTestId('sign-in-button')).toBeVisible();
    await expect(page.getByTestId('sign-up-button')).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Clear any existing session
    await clearTestSession(page);
    
    // Try to access a protected route
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to login (either /login or WorkOS authkit)
    expect(await isOnLoginPage(page)).toBe(true);
  });
});
