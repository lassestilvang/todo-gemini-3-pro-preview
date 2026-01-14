import { test, expect, waitForAppReady } from './fixtures';

const THEMES = ['light', 'dark', 'glassmorphism', 'neubrutalism', 'minimalist'];

async function setTheme(page: any, theme: string) {
    await page.evaluate((t: string) => {
        localStorage.setItem('theme', t);
        // Force a reload to ensure theme is applied from storage
        window.location.reload();
    }, theme);
    await waitForAppReady(page);
    // Wait for transitions/animations
    await page.waitForTimeout(1000);
}

test.describe('Multi-Theme Visual Regression', () => {
    for (const theme of THEMES) {
        test.describe(`Theme: ${theme}`, () => {
            test.beforeEach(async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/inbox');
                await setTheme(authenticatedPage, theme);
            });

            test(`Inbox page [${theme}]`, async ({ authenticatedPage }) => {
                await expect(authenticatedPage).toHaveScreenshot(`inbox-${theme}.png`, {
                    fullPage: true,
                    mask: [authenticatedPage.locator('[data-testid="last-synced"]')],
                });
            });

            test(`Today page [${theme}]`, async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/today');
                await waitForAppReady(authenticatedPage);
                await expect(authenticatedPage).toHaveScreenshot(`today-${theme}.png`, {
                    fullPage: true,
                });
            });

            test(`Upcoming page [${theme}]`, async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/upcoming');
                await waitForAppReady(authenticatedPage);
                await expect(authenticatedPage).toHaveScreenshot(`upcoming-${theme}.png`, {
                    fullPage: true,
                });
            });
        });
    }

    test('Mobile view [neubrutalism]', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/inbox');
        await setTheme(authenticatedPage, 'neubrutalism');
        await authenticatedPage.setViewportSize({ width: 375, height: 667 });
        await expect(authenticatedPage).toHaveScreenshot('mobile-inbox-neubrutalism.png');
    });
});
