import { test, expect } from './fixtures';
import * as fs from 'fs';
import { readFile } from "node:fs/promises";
import { join } from "node:path";

test.describe('Data Persistence (Export/Import)', () => {
    test('should export and import data correctly preserving relationships', async ({ authenticatedPage: page }) => {
        test.setTimeout(60000); // Increase timeout for import operation

        // 1. Setup: Create unique data
        const uniqueId = Date.now().toString();
        const listName = `Export List ${uniqueId}`;
        const taskName = `Export Task ${uniqueId}`;

        // User is already authenticated and on the home page via fixture
        await page.goto('/'); // Navigate to home to be sure



        // Create data via UI to ensure it's "real"
        // Create List
        await page.getByTestId('add-list-button').click();
        await expect(page.getByRole('dialog')).toBeVisible(); // Wait for dialog
        await page.getByPlaceholder('List Name').fill(listName);
        await page.keyboard.press('Enter');

        // Wait for list to be created and navigate to it
        await page.getByRole('link', { name: listName }).click();
        await page.waitForURL(/\/lists\/\d+/);
        await expect(page.getByRole('heading', { name: listName })).toBeVisible();

        // Create Task in that list
        await page.getByTestId('task-input').fill(taskName);
        await expect(page.getByTestId('add-task-button')).toBeVisible(); // Ensure valid state
        await page.getByTestId('add-task-button').click();

        // Wait for input to be cleared (signals efficient submission)
        await expect(page.getByTestId('task-input')).toHaveValue('');

        // Wait for actual creation in list
        await expect(page.getByText(taskName)).toBeVisible();
        await page.goto('/settings');

        // Trigger export and read downloaded file
        await page.getByRole('button', { name: 'Export Backup' }).click();
        const download = await page.waitForEvent('download');

        // Read the download stream since download.text() is not standard API
        const stream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const fileContent = Buffer.concat(chunks).toString('utf-8');
        const jsonData = JSON.parse(fileContent);

        expect(jsonData.data).toBeDefined();
        // Verify our data is in there
        const foundList = jsonData.data.lists.find((l: { name: string; id: number }) => l.name === listName);
        const foundTask = jsonData.data.tasks.find((t: { title: string; id: number; listId: number }) => t.title === taskName);

        expect(foundList).toBeDefined();
        expect(foundTask).toBeDefined();
        expect(foundTask.listId).toBe(foundList.id); // Relation check

        // 3. Import Data
        // We will import the same file. It should create duplicates (which is expected behavior per plan).
        // We check if NEW items with same names exist.

        // Handle confirm dialog
        page.on('dialog', dialog => dialog.accept());

        // Upload file
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'todo-gemini-backup.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(jsonData)),
        });

        // Trigger change if needed, usually setInputFiles triggers it.
        // Wait for result toast (success or failure)
        await expect(page.getByText('Import successful')).toBeVisible({ timeout: 60000 });

        // 4. Verify Import
        // Wait for server to stabilize
        await page.waitForTimeout(2000);

        // Reload to update sidebar (simulating refresh)
        await page.reload();

        // We should now see TWO lists with the same name? 
        // Or at least we should find the list again.
        // Since we imported, we expect a NEW list with same name.

        // Count lists with that name
        const lists = page.getByRole('link', { name: listName });
        const count = await lists.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Click the second one (likely the imported one)
        await lists.nth(1).click();

        // Wait for navigation
        await page.waitForURL(/\/lists\/\d+/);

        // Check for task
        await expect(page.getByText(taskName)).toBeVisible();

        // Cleanup (optional, but good for local runs)
        // unlinkSync(downloadPath); // Playwright handles temp file cleanup
    });
});
