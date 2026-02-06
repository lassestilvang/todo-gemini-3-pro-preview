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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const formattedTomorrow = tomorrow.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
        // Scope to badge to avoid matching date picker buttons
        const dueLabel = page.locator('[data-slot="badge"]').getByText('Tomorrow').or(page.locator('[data-slot="badge"]').getByText(formattedTomorrow));
        await expect(dueLabel).toBeVisible({ timeout: 10000 });

        await taskInput.press('Enter');
        await expect(taskInput).toHaveValue('', { timeout: 10000 });

        await page.waitForTimeout(2000);
        await expect(page.getByText('Task created')).toBeVisible({ timeout: 10000 });
    });
});
