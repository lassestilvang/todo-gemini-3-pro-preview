import { test, expect, createTask } from './fixtures';

test.describe('Task Completion: Toggle', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should complete a task by clicking checkbox', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `CompletionTest ${uniqueId}`);

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

  test('should uncomplete a task by clicking checkbox again', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `UncompleteTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItem.getByTestId('task-checkbox');

    await checkbox.click({ force: true });
    await expect(checkbox).toBeChecked();
    await page.waitForTimeout(5000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterComplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkboxAfterComplete = taskItemAfterComplete.getByTestId('task-checkbox');
    await expect(checkboxAfterComplete).toBeChecked();

    await expect(checkboxAfterComplete).toBeEnabled();
    await page.waitForTimeout(1000);

    await checkboxAfterComplete.click({ force: true });
    await expect(checkboxAfterComplete).not.toBeChecked({ timeout: 5000 });
    await page.waitForTimeout(5000);

    await page.reload();
    await page.waitForLoadState('load');

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItemAfterUncomplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterUncomplete.getByTestId('task-checkbox')).not.toBeChecked();
  });
});
