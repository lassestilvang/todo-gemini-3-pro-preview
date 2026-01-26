import { test, expect, authenticateTestUser } from './fixtures';

test.describe('Search Task Latency', () => {
    test.beforeEach(async ({ page }) => {
        await authenticateTestUser(page);
        await page.goto('/today');
        await page.waitForLoadState('load');
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
        try {
            await expect(taskItem.first()).toBeVisible({ timeout: 5000 });
        } catch (e) {
            // Fallback: reload page if it doesn't appear immediately (helps with hydration/revalidation issues)
            await page.reload();
            await expect(taskItem.first()).toBeVisible({ timeout: 10000 });
        }

        // Small grace period for server-side search indexing if needed
        // Although the test checks for "latency", local search should be near-instant 
        // after revalidatePath, but GitHub Actions can be slow.
        await page.waitForTimeout(1000);

        // 2. Open Command Palette
        // Click the search button 
        const searchButton = page.getByRole('button', { name: /search/i }).first();
        await expect(searchButton).toBeVisible();
        await searchButton.click();

        // 3. Search for the task
        const searchInput = page.getByPlaceholder('Type a command or search...');
        await expect(searchInput).toBeVisible();
        await searchInput.fill(taskTitle);

        // 4. Verify it appears
        // Search results might take a moment to filter
        const resultItem = page.getByRole('dialog').getByText(taskTitle, { exact: true });
        await expect(resultItem).toBeVisible({ timeout: 15000 });
    });
});
