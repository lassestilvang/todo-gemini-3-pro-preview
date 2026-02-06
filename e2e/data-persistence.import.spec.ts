import { test, expect } from './fixtures';

test.describe('Data Persistence: Import', () => {
    test('should import data correctly preserving relationships', async ({ authenticatedPage: page }) => {
        test.setTimeout(60000);

        const uniqueId = Date.now().toString();
        const listName = `Export List ${uniqueId}`;
        const taskName = `Export Task ${uniqueId}`;

        await page.goto('/');

        await page.getByTestId('add-list-button').click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByPlaceholder('List Name').fill(listName);
        await page.keyboard.press('Enter');

        await page.getByRole('link', { name: listName }).click();
        await page.waitForURL(/\/lists\/\d+/);
        await expect(page.getByRole('heading', { name: listName })).toBeVisible();

        await page.getByTestId('task-input').fill(taskName);
        await expect(page.getByTestId('add-task-button')).toBeVisible();
        await page.getByTestId('add-task-button').click();

        await expect(page.getByTestId('task-input')).toHaveValue('');
        await expect(page.getByText(taskName)).toBeVisible();
        await page.goto('/settings');

        await page.getByRole('button', { name: 'Export Backup' }).click();
        const download = await page.waitForEvent('download');

        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk as Buffer);
        }
        const fileContent = Buffer.concat(chunks).toString('utf-8');
        const jsonData = JSON.parse(fileContent);

        expect(jsonData.data).toBeDefined();

        page.on('dialog', dialog => dialog.accept());

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'todo-gemini-backup.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(jsonData)),
        });

        await expect(page.getByText('Import successful')).toBeVisible({ timeout: 60000 });

        // Wait for potential background processing
        await page.waitForTimeout(2000);
        // Force reload to ensure new data is fetched
        await page.reload();
        await page.waitForLoadState('networkidle');

        const importedListName = `${listName} (Imported)`;
        // Using a more robust selector that handles potential UI variations
        const listLink = page.getByRole('link', { name: importedListName });
        await expect(listLink).toBeVisible();

        await listLink.click();
        await page.waitForURL(/\/lists\/\d+/);

        await page.waitForLoadState('networkidle');
        // Use a more specific selector for the task item to avoid false negatives
        // and retry finding it as it might be below the fold or loading
        const taskItem = page.getByTestId('task-item').filter({ hasText: taskName });
        await expect(taskItem).toBeVisible({ timeout: 20000 });
    });
});
