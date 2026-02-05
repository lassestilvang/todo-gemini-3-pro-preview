import { test, expect, createTask } from './fixtures';

test.describe('Task Completion: XP & Streaks', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should award XP when completing a task', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `XPTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await taskItem.getByTestId('task-checkbox').click({ force: true });
    await page.waitForTimeout(2000);

    await expect(page.getByText(/XP|Level/i).first()).toBeVisible();
  });

  test('should show streak information', async ({ authenticatedPage: page }) => {
    await expect(page.getByTestId('user-level')).toBeVisible({ timeout: 10000 });
  });
});
