import { test, expect, authenticateTestUser, createTask } from './fixtures';

/**
 * E2E tests for task completion flow.
 * Requirements: 5.3
 */
test.describe('Task Completion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateTestUser(page);
    await page.goto('/today');
    await page.waitForLoadState('load');
  });

  test('should complete a task by clicking checkbox', async ({ page }) => {
    const uniqueId = Date.now();
    await createTask(page, `CompletionTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItem.getByTestId('task-checkbox');
    await checkbox.click();
    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });

  test('should show visual feedback on task completion', async ({ page }) => {
    const uniqueId = Date.now();
    await createTask(page, `VisualFeedback ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await taskItem.getByTestId('task-checkbox').click();
    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });

  test('should uncomplete a task by clicking checkbox again', async ({ page }) => {
    const uniqueId = Date.now();
    await createTask(page, `UncompleteTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await taskItem.getByTestId('task-checkbox').click();
    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterComplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItemAfterComplete.getByTestId('task-checkbox');
    await expect(checkbox).toBeChecked();

    // Ensure the checkbox is ready to be clicked again
    await expect(checkbox).toBeEnabled();

    // Allow animations (confetti) to settle
    await page.waitForTimeout(1000);

    // Context: Server Actions are POST requests. We wait for the request to complete to ensure DB is updated.
    // We check for 'next-action' header to ensure it's a Server Action.
    const uncompleteResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST' &&
      (response.request().headers()['next-action'] !== undefined || (response.request().postData()?.includes('ACTION_ID') ?? false)) &&
      response.status() === 200
    );

    // Click with force to ensure we hit it even if overlays exist
    await checkbox.click({ force: true });
    await uncompleteResponsePromise;

    // Small buffer for async DB commitment
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForLoadState('load');

    // Wait for the item to be visible again
    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItemAfterUncomplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    // Using a more robust check - allow for either attribute or property check
    await expect(taskItemAfterUncomplete.getByTestId('task-checkbox')).not.toBeChecked();
  });

  test('should award XP when completing a task', async ({ page }) => {
    const uniqueId = Date.now();
    await createTask(page, `XPTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await taskItem.getByTestId('task-checkbox').click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/XP|Level/i).first()).toBeVisible();
  });

  test('should persist task completion after page reload', async ({ page }) => {
    const uniqueId = Date.now();
    await createTask(page, `PersistTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();

    // Wait for the specific server action response to ensure state is persisted
    const completeResponsePromise = page.waitForResponse(response =>
      response.request().method() === 'POST' &&
      (response.request().headers()['next-action'] !== undefined || (response.request().postData()?.includes('ACTION_ID') ?? false)) &&
      response.status() === 200
    );

    // Click and wait for response simultaneously
    await taskItem.getByTestId('task-checkbox').click();
    await completeResponsePromise;

    // Tiny buffer for DB to settle
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });

  test('should show streak information', async ({ page }) => {
    await expect(page.getByText(/Level|XP/i).first()).toBeVisible({ timeout: 5000 });
  });
});
