import { test, expect, isOnLoginPage } from './fixtures';

test.describe('Authentication: Authenticated Access', () => {
  test('should access inbox when authenticated', async ({ authenticatedPage: page }) => {
    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });

    expect(await isOnLoginPage(page)).toBe(false);
    await expect(page.getByRole('heading', { name: 'Inbox', exact: true, level: 1 })).toBeVisible();
  });

  test('should allow access to protected routes after authentication', async ({ authenticatedPage: page }) => {
    await page.goto('/today', { waitUntil: 'domcontentloaded' });

    expect(await isOnLoginPage(page)).toBe(false);
    await expect(page.getByRole('heading', { name: 'Today', exact: true, level: 1 })).toBeVisible();
  });

  test('should show user profile when authenticated', async ({ authenticatedPage: page }) => {
    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText('E2E Test User')).toBeVisible();
  });
});
