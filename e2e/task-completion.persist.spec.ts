import { test, expect, createTask } from './fixtures';

test.describe('Task Completion: Persistence', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should persist task completion after page reload', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `PersistTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItem.getByTestId('task-checkbox');

    await checkbox.click({ force: true });
    await expect(checkbox).toBeChecked();

    await page.waitForTimeout(3000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });
});
