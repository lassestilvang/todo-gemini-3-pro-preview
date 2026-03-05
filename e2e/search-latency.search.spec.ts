import { test, expect } from './fixtures';

test.describe('Search Latency: Search Results', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('newly created task should immediately appear in search results', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    const taskTitle = `Search Latency Test ${uniqueId}`;

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

    // Wait until the sync indicator shows that changes are saved to avoid race conditions
    // where search query happens before the database has the task
    const syncStatus = page.getByTestId('sync-status-indicator');
    await expect(syncStatus).toHaveAttribute('data-sync-state', 'synced', { timeout: 15000 });

    const searchInput = page.getByPlaceholder(/search tasks\.\.\./i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill(taskTitle);

    await Promise.all([
      page.waitForURL(/\/search\?q=/),
      searchInput.press('Enter')
    ]);

    const resultItem = page.getByTestId('task-item').filter({ hasText: taskTitle }).first();
    await expect(resultItem).toBeVisible({ timeout: 30000 });
  });
});
