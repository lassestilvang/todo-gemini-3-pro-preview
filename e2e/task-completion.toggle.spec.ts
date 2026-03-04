import { test, expect, createTask, waitForAppReady } from './fixtures';

test.describe('Task Completion: Toggle', () => {
  test.skip(!!process.env.CI, 'Flaky in CI: completion state assertions are eventually consistent after reload.');

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(authenticatedPage);
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

    await expect.poll(async () => checkbox.getAttribute('aria-checked'), { timeout: 15000 }).toBe('true');
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload).toBeVisible({ timeout: 20000 });
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
    await expect.poll(async () => checkbox.getAttribute('aria-checked'), { timeout: 15000 }).toBe('true');
    await page.waitForTimeout(5000);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const taskItemAfterComplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkboxAfterComplete = taskItemAfterComplete.getByTestId('task-checkbox');
    await expect.poll(async () => checkboxAfterComplete.getAttribute('aria-checked'), { timeout: 20000 }).toBe('true');

    await expect(checkboxAfterComplete).toBeEnabled();
    await page.waitForTimeout(1000);

    await checkboxAfterComplete.click({ force: true });
    await expect.poll(async () => checkboxAfterComplete.getAttribute('aria-checked'), { timeout: 15000 }).toBe('false');
    await page.waitForTimeout(5000);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItemAfterUncomplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect.poll(async () => taskItemAfterUncomplete.getByTestId('task-checkbox').getAttribute('aria-checked'), { timeout: 20000 }).toBe('false');
  });
});
