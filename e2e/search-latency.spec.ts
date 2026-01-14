import { test, expect, authenticateTestUser } from './fixtures';

test.describe('Search Task Latency', () => {
    test.beforeEach(async ({ page }) => {
        await authenticateTestUser(page);
        await page.goto('/today');
        await page.waitForLoadState('networkidle');
    });

    test('newly created task should immediately appear in search results', async ({ page }) => {
        const uniqueId = Date.now();
        const taskTitle = `Search Latency Test ${uniqueId}`;

        // 1. Create task
        const taskInput = page.getByTestId('task-input');
        await expect(taskInput).toBeVisible();
        await taskInput.fill(taskTitle);
        await taskInput.press('Enter');

        // Wait for it to appear in the list (confirms creation completed)
        const taskItem = page.getByTestId('task-item').filter({ hasText: taskTitle });
        await expect(taskItem.first()).toBeVisible({ timeout: 10000 });

        // 2. Open Command Palette
        // Click the search button 
        await page.getByRole('button', { name: /search/i }).first().click();

        // 3. Search for the task
        const searchInput = page.getByPlaceholder('Type a command or search...');
        await expect(searchInput).toBeVisible();
        await searchInput.fill(taskTitle);

        // 4. Verify it appears
        // We expect the task title to be visible in the results
        const resultItem = page.getByRole('dialog').getByText(taskTitle);
        await expect(resultItem).toBeVisible({ timeout: 10000 });
    });
});
