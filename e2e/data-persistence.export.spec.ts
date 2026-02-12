import { test, expect } from './fixtures';

test.describe('Data Persistence: Export', () => {
    test('should export data correctly preserving relationships', async ({ authenticatedPage: page }) => {
        test.setTimeout(60000);

        const uniqueId = Date.now().toString();
        const listName = `Export List ${uniqueId}`;
        const taskName = `Export Task ${uniqueId}`;

        await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
        await expect(page.getByTestId('add-list-button')).toBeVisible();

        await page.getByTestId('add-list-button').click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 });
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
        await page.goto('/settings', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('button', { name: 'Export Backup' })).toBeVisible();

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
        const foundList = jsonData.data.lists.find((l: { name: string; id: number }) => l.name === listName);
        const foundTask = jsonData.data.tasks.find((t: { title: string; id: number; listId: number }) => t.title === taskName);

        expect(foundList).toBeDefined();
        expect(foundTask).toBeDefined();
        expect(foundTask.listId).toBe(foundList.id);
    });
});
