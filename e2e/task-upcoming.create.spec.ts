import { test, expect } from './fixtures';

test.describe('Task Upcoming: Create', () => {
    test('should create a task with a future date', async ({ authenticatedPage: page }) => {
        await page.goto('/today');
        await page.waitForLoadState('load');

        const taskInput = page.getByTestId('task-input');
        await expect(taskInput).toBeVisible();

        const uniqueId = Date.now();
        const taskTitle = `Buy Milk ${uniqueId} tomorrow`;
        await taskInput.fill(taskTitle);

        await expect(page.getByText('Tomorrow')).toBeVisible({ timeout: 10000 });

        await taskInput.press('Enter');
        await expect(taskInput).toHaveValue('', { timeout: 10000 });

        await page.waitForTimeout(2000);
        await expect(page.getByText('Task created')).toBeVisible({ timeout: 10000 });
    });
});
