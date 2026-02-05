import { test, expect, waitForTask } from './fixtures';

test.describe('Task Creation: UI', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should show XP bar when authenticated', async ({ authenticatedPage: page }) => {
    await expect(page.getByTestId('user-level')).toBeVisible({ timeout: 10000 });
  });

  test('should clear input after creating task', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    const uniqueId = Date.now();
    const taskTitle = `Task to clear input ${uniqueId} `;

    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    await waitForTask(page, `Task to clear input ${uniqueId} `);

    await expect(taskInput).toHaveValue('');
  });
});
