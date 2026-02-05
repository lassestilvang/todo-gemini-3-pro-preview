import { test, expect, waitForTask } from './fixtures';

test.describe('Task Upcoming: Verify', () => {
    test('should show future-dated task in Upcoming view', async ({ authenticatedPage: page }) => {
        await page.goto('/today');
        await page.waitForLoadState('load');

        const taskInput = page.getByTestId('task-input');
        await expect(taskInput).toBeVisible();

        const uniqueId = Date.now();
        const taskTitle = `Buy Milk ${uniqueId} tomorrow`;
        const expectedTitle = `Buy Milk ${uniqueId}`;
        await taskInput.fill(taskTitle);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedTomorrow = tomorrow.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        const dueLabel = page.getByText('Tomorrow').or(page.getByText(formattedTomorrow));
        await expect(dueLabel).toBeVisible({ timeout: 10000 });
        await taskInput.press('Enter');
        await expect(taskInput).toHaveValue('', { timeout: 10000 });

        await page.waitForTimeout(2000);
        await expect(page.getByText('Task created')).toBeVisible({ timeout: 10000 });

        await page.goto('/upcoming');
        await page.waitForLoadState('load');
        await page.reload();

        await waitForTask(page, expectedTitle);
        const taskItem = page.getByTestId('task-item').filter({ hasText: expectedTitle });
        await expect(taskItem.first()).toBeVisible({ timeout: 30000 });
    });
});
