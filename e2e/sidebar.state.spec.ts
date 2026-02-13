import { test, expect, waitForAppReady } from './fixtures';

test.describe('Sidebar: Mode + Resize Persistence', () => {
  test('should persist mode, keyboard shortcut, and width across reloads', async ({ authenticatedPage: page }) => {
    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const normalSidebar = page.locator('.sidebar-normal');
    const slimSidebar = page.getByTestId('slim-sidebar');

    await expect(normalSidebar).toBeVisible();
    await expect(slimSidebar).toBeHidden();

    await normalSidebar.hover();
    await page.getByRole('button', { name: 'Slim sidebar' }).click();
    await expect(slimSidebar).toBeVisible({ timeout: 15000 });
    await expect(normalSidebar).toBeHidden({ timeout: 15000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await expect(page.getByTestId('slim-sidebar')).toBeVisible();

    await page.keyboard.press('Control+\\');
    await expect(page.getByRole('button', { name: 'Show sidebar' })).toBeVisible();

    await page.getByRole('button', { name: 'Show sidebar' }).click();
    const normalAfter = page.locator('.sidebar-normal');
    await expect(normalAfter).toBeVisible();

    const handle = page.locator('.sidebar-normal .cursor-col-resize');
    const box = await handle.boundingBox();
    if (!box) {
      throw new Error('Sidebar resize handle not found');
    }

    const initialWidth = await normalAfter.evaluate((el) => parseFloat(getComputedStyle(el).width));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(async () => {
      return normalAfter.evaluate((el) => parseFloat(getComputedStyle(el).width));
    }).toBeGreaterThan(initialWidth + 40);

    const widthAfterResize = await normalAfter.evaluate((el) => parseFloat(getComputedStyle(el).width));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);

    const normalReloaded = page.locator('.sidebar-normal');
    await expect(normalReloaded).toBeVisible();

    const widthAfterReload = await normalReloaded.evaluate((el) => parseFloat(getComputedStyle(el).width));
    expect(Math.abs(widthAfterReload - widthAfterResize)).toBeLessThan(2);
  });
});
