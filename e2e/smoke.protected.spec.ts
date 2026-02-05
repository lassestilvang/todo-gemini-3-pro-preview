import { test, expect, isOnLoginPage, clearTestSession } from './fixtures';

test.describe('Smoke: Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await clearTestSession(page);

    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });

    expect(await isOnLoginPage(page)).toBe(true);
  });
});
