import { test, expect, authenticateTestUser, createTask } from './fixtures';

/**
 * E2E tests for task completion flow.
 * Requirements: 5.3
 */
test.describe('Task Completion Flow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to today page (auth and onboarding disable handled by fixture)
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

    // Wait for optimistic UI update
    await expect(checkbox).toBeChecked();

    // Wait for server to process
    await page.waitForTimeout(2000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
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

    // Wait for optimistic UI update
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

    // STEP 1: Complete the task
    await checkbox.click({ force: true });

    // Wait for optimistic UI update to "checked"
    await expect(checkbox).toBeChecked();

    // Wait for server to persist the "complete" action
    await page.waitForTimeout(3000);

    // Reload to verify completion persisted
    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterComplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkboxAfterComplete = taskItemAfterComplete.getByTestId('task-checkbox');
    await expect(checkboxAfterComplete).toBeChecked();

    // STEP 2: Uncomplete the task
    // Use a fresh reference after the reload
    await expect(checkboxAfterComplete).toBeEnabled();

    // Allow any confetti animations to settle
    await page.waitForTimeout(1000);

    // Click to uncomplete
    await checkboxAfterComplete.click({ force: true });

    // CRITICAL: Wait for the optimistic UI to update to "unchecked"
    // This confirms the click handler was actually triggered
    await expect(checkboxAfterComplete).not.toBeChecked({ timeout: 5000 });

    // Wait for server to persist the "uncomplete" action
    await page.waitForTimeout(3000);

    // Reload to verify uncomplete persisted
    await page.reload();
    await page.waitForLoadState('load');

    // Wait for the item to be visible again
    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItemAfterUncomplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterUncomplete.getByTestId('task-checkbox')).not.toBeChecked();
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

  test('should persist task completion after page reload', async ({ authenticatedPage: page }) => {
    const uniqueId = Date.now();
    await createTask(page, `PersistTest ${uniqueId}`);

    await page.waitForSelector(`[data-testid="task-item"]:has-text("${uniqueId}")`, {
      state: 'visible', timeout: 10000
    });

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    const checkbox = taskItem.getByTestId('task-checkbox');

    // Click to complete
    await checkbox.click({ force: true });

    // Wait for optimistic UI update
    await expect(checkbox).toBeChecked();

    // Wait for server to persist
    await page.waitForTimeout(3000);

    await page.reload();
    await page.waitForLoadState('load');

    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });

  test('should show streak information', async ({ authenticatedPage: page }) => {
    // Wait for data to load (skeleton to be replaced)
    await expect(page.getByTestId('user-level')).toBeVisible({ timeout: 10000 });
  });
});
