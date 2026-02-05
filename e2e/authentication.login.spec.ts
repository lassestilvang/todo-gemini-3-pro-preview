import { test, expect } from './fixtures';

test.describe('Authentication: Login Page', () => {
  test('should display login page with sign in options', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Todo Gemini' })).toBeVisible();
    await expect(page.getByText('AI-powered daily task planner')).toBeVisible();

    const signInButton = page.getByTestId('sign-in-button');
    const signUpButton = page.getByTestId('sign-up-button');

    await expect(signInButton).toBeVisible();
    await expect(signUpButton).toBeVisible();

    await expect(signInButton).toContainText('Sign in');
    await expect(signUpButton).toContainText('Create an account');
  });

  test('should display feature highlights on login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('AI-Powered', { exact: true })).toBeVisible();
    await expect(page.getByText('Focus Mode', { exact: true })).toBeVisible();
    await expect(page.getByText('Gamification', { exact: true })).toBeVisible();
  });

  test('should display session expired message when redirected', async ({ page }) => {
    await page.goto('/login?message=session_expired', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Your session has expired')).toBeVisible();
  });

  test('sign in button should have href attribute', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const signInButton = page.getByTestId('sign-in-button');
    const href = await signInButton.getAttribute('href');

    expect(href).toBeTruthy();
  });
});
