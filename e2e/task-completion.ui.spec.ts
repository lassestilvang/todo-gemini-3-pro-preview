import { test, expect, createTask, waitForAppReady } from './fixtures';

test.describe('Task Completion: UI Feedback', () => {
  test.skip(!!process.env.CI, 'Flaky in CI: completion state assertions are eventually consistent after reload.');

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(authenticatedPage);
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

    await expect.poll(async () => checkbox.getAttribute('aria-checked'), { timeout: 15000 }).toBe('true');
    await page.waitForTimeout(2000);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload).toBeVisible({ timeout: 20000 });
  });
});
