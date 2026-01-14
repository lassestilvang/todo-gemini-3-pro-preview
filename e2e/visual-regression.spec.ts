import { test, expect, waitForAppReady } from './fixtures';

test.describe('Visual Regression', () => {
    test('Inbox page visual snapshot', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/inbox');
        await waitForAppReady(authenticatedPage);
        // Wait for any animations to settle
        await authenticatedPage.waitForTimeout(1000);
        await expect(authenticatedPage).toHaveScreenshot('inbox-page.png', {
            fullPage: true,
            mask: [authenticatedPage.locator('[data-testid="last-synced"]')], // Mask dynamic parts if they exist
        });
    });

    test('Today page visual snapshot', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/today');
        await waitForAppReady(authenticatedPage);
        await authenticatedPage.waitForTimeout(1000);
        await expect(authenticatedPage).toHaveScreenshot('today-page.png', {
            fullPage: true,
        });
    });

    test('Upcoming page visual snapshot', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/upcoming');
        await waitForAppReady(authenticatedPage);
        await authenticatedPage.waitForTimeout(1000);
        await expect(authenticatedPage).toHaveScreenshot('upcoming-page.png', {
            fullPage: true,
        });
    });

    test('Mobile view visual snapshot', async ({ authenticatedPage }) => {
        await authenticatedPage.setViewportSize({ width: 375, height: 667 });
        await authenticatedPage.goto('/inbox');
        await waitForAppReady(authenticatedPage);
        await authenticatedPage.waitForTimeout(1000);
        await expect(authenticatedPage).toHaveScreenshot('mobile-inbox.png');
    });
});
