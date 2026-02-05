import { test, expect, authenticateTestUser, clearTestSession, isOnLoginPage } from './fixtures';

test.describe('Authentication: Logout Flow', () => {
  test('should redirect to login after clearing session', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await authenticateTestUser(page);

    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    expect(await isOnLoginPage(page)).toBe(false);

    await clearTestSession(page);

    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    expect(await isOnLoginPage(page)).toBe(true);
  });
});
