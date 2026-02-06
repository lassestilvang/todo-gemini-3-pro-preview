import { test, expect, waitForTask } from './fixtures';

test.describe('Task Creation: NLP', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should create a task with due date using natural language', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();

    const uniqueId = Date.now();
    const taskTitle = `Meeting tomorrow ${uniqueId} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    // Ensure the input is cleared to confirm submission
    await expect(taskInput).toHaveValue('', { timeout: 10000 });

    await waitForTask(page, `Meeting tomorrow ${uniqueId}`);

    const taskItem = page.getByTestId('task-item').filter({ hasText: `Meeting tomorrow ${uniqueId}` });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should create a task with priority', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();

    const uniqueId = Date.now();
    const taskTitle = `Urgent task!high ${uniqueId} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    // Ensure the input is cleared to confirm submission
    await expect(taskInput).toHaveValue('', { timeout: 10000 });

    await waitForTask(page, `Urgent task!high ${uniqueId}`);

    const taskItem = page.getByTestId('task-item').filter({ hasText: `Urgent task!high ${uniqueId}` });
    await expect(taskItem.first()).toBeVisible();
  });
});
