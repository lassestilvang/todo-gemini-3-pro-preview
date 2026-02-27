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
    
    // Task with "tomorrow" will be in Upcoming, not Today.
    // Wait for the "Task created" toast or check the Upcoming view.
    await expect(page.getByText('Task created')).toBeVisible();

    await page.goto('/upcoming');
    await page.waitForLoadState('networkidle'); // Better wait for data fetch

    await waitForTask(page, 'Meeting');

    await waitForTask(page, String(uniqueId));

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) });
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

    await waitForTask(page, String(uniqueId));

    const taskItem = page.getByTestId('task-item').filter({ hasText: String(uniqueId) });
    await expect(taskItem.first()).toBeVisible();
  });
});
