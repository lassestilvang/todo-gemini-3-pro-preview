import { test, expect, waitForTask } from './fixtures';

test.describe('Task Creation: NLP', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/today');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should create a task with due date using natural language', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();

    const taskTitle = `Meeting tomorrow ${Date.now()} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    // Verify task creation via toast first
    await expect(page.getByText('Task created')).toBeVisible();

    // Navigate to Upcoming view since the task is due tomorrow
    await page.goto('/upcoming');
    await page.waitForLoadState('load');

    // Now wait for the task in the Upcoming list
    await waitForTask(page, 'Meeting');

    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Meeting' });
    await expect(taskItem.first()).toBeVisible();
  });

  test('should create a task with priority', async ({ authenticatedPage: page }) => {
    const taskInput = page.getByTestId('task-input');
    await expect(taskInput).toBeVisible();

    const taskTitle = `Urgent task!high ${Date.now()} `;
    await taskInput.fill(taskTitle);
    await taskInput.press('Enter');

    await waitForTask(page, 'Urgent task');

    const taskItem = page.getByTestId('task-item').filter({ hasText: 'Urgent task' });
    await expect(taskItem.first()).toBeVisible();
  });
});
