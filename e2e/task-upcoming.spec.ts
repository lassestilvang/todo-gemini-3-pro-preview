import { test, expect } from './fixtures';

/**
 * E2E tests for cross-view task verification.
 * Verifies that tasks created with future dates appear in the "Upcoming" view.
 * 
 * Requirements:
 * - Creates a task "Buy Milk" with a future date.
 * - Navigates to "Upcoming".
 * - Verifies "Buy Milk" is visible.
 */
test.describe('Task Upcoming View Verification', () => {
    test('should create a task with a future date and show it in Upcoming view', async ({ authenticatedPage: page }) => {
        // Navigate to today page to create the task
        await page.goto('/today');
        await page.waitForLoadState('load');

        // Find the task input
        const taskInput = page.getByTestId('task-input');
        await expect(taskInput).toBeVisible();

        // Create a task with a future date (next month to be sure it's in Upcoming and not Today/Next 7 Days)
        // Using "in 2 weeks" to be safe.
        const uniqueId = Date.now();
        const taskTitle = `Buy Milk ${uniqueId} in 2 weeks`;
        const expectedTitle = `Buy Milk ${uniqueId}`;
        await taskInput.fill(taskTitle);
        await taskInput.press('Enter');

        // Wait for the task to be created and appear on the current page (if it does)
        // Actually, on "Today" page, "in 2 weeks" tasks might NOT appear.
        // So we just check if it was cleared.
        await expect(taskInput).toHaveValue('', { timeout: 10000 });

        // Wait a bit for backend processing
        await page.waitForTimeout(1000);

        // Now navigate to Upcoming
        await page.goto('/upcoming');
        await page.waitForLoadState('load');
        // Reload to ensure fresh data
        await page.reload();

        // Verify the task appears in the Upcoming list
        const taskItem = page.getByTestId('task-item').filter({ hasText: expectedTitle });
        await expect(taskItem.first()).toBeVisible({ timeout: 10000 });
    });

});
