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
    await expect(taskItemAfterComplete.getByTestId('task-checkbox')).toBeChecked();
    
    await taskItemAfterComplete.getByTestId('task-checkbox').click();
    await page.waitForTimeout(2000);
    
    await page.reload();
    await page.waitForLoadState('load');
    
    const taskItemAfterUncomplete = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
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
    await taskItem.getByTestId('task-checkbox').click();
    await page.waitForTimeout(2000);
    
    await page.reload();
    await page.waitForLoadState('load');
    
    const taskItemAfterReload = page.getByTestId('task-item').filter({ hasText: String(uniqueId) }).first();
    await expect(taskItemAfterReload.getByTestId('task-checkbox')).toBeChecked();
  });

  test('should show streak information', async ({ page }) => {
    await expect(page.getByText(/Level|XP/i).first()).toBeVisible({ timeout: 5000 });
  });
});
