import { test, expect, waitForTask } from './fixtures';

test.describe('Task Creation: Basic', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should create a task with title', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();

    const taskTitle = `Test task ${Date.now()} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    await waitForTask(page, 'Test task');

    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Test task' });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should show task in list after creation', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    const uniqueId = Date.now();
    const taskTitle = `List test task ${uniqueId} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    await waitForTask(page, `List test task ${uniqueId} `);

    const newTask = page.getByTestId('task-item').filter({ hasText: `List test task ${uniqueId} ` });
    await expect(newTask.first()).toBeVisible();
  });
});
