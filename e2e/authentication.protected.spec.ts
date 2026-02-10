import { test, expect, clearTestSession, isOnLoginPage } from './fixtures';

test.describe('Authentication: Protected Routes', () => {
  test('should redirect to login when accessing inbox unauthenticated', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login|authkit/, { timeout: 10000 }).catch(() => {});

    expect(await isOnLoginPage(page)).toBe(true);
  });

  test('should redirect to login when accessing today page unauthenticated', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/today', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login|authkit/, { timeout: 10000 }).catch(() => {});

    expect(await isOnLoginPage(page)).toBe(true);
  });

  test('should redirect to login when accessing calendar unauthenticated', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login|authkit/, { timeout: 10000 }).catch(() => {});

    expect(await isOnLoginPage(page)).toBe(true);
  });

  test('should redirect to login when accessing settings unauthenticated', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login|.*authkit\.app.*/, { timeout: 10000, waitUntil: 'commit' }).catch(() => {});
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when accessing analytics unauthenticated', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login|.*authkit\.app.*/, { timeout: 10000, waitUntil: 'commit' }).catch(() => {});
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
  });
});
