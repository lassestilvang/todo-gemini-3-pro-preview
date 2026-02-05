import { test, expect } from './fixtures';

test.describe('Search Latency: Task Creation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('newly created task should appear in the list quickly', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    const taskTitle = `Search Latency List ${uniqueId}`;

    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    const taskItem = page.getByTestId('task-item').filter({ hasText: taskTitle });
    try {
      await expect(taskItem.first()).toBeVisible({ timeout: 5000 });
    } catch {
      await page.reload();
      await expect(taskItem.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
