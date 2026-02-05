import { test, expect, createTask } from './fixtures';

test.describe('Task Completion: UI Feedback', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should show visual feedback on task completion', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `VisualFeedback ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItem.getByTestId('task-checkbox');
    await checkbox.click({ force: true });

    await expect(checkbox).toBeChecked();
    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });
});
