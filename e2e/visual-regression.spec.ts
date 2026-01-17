import { test, expect, waitForAppReady } from './fixtures';
import { AVAILABLE_THEMES } from '../src/lib/themes';

const THEMES = [...AVAILABLE_THEMES];



test.describe('Multi-Theme Visual Regression', () => {
    // Skip in CI to avoid failure due to missing Linux snapshots (which differ from macOS snapshots)
    test.skip(!!process.env.CI, 'Skipping visual regression in CI due to OS mismatch for snapshots');

    for (const theme of THEMES) {
        test.describe(`Theme: ${theme}`, () => {
            test.beforeEach(async ({ authenticatedPage }) => {
                // Inject theme into localStorage before page load to avoid reload
                await authenticatedPage.addInitScript((t) => {
                    window.localStorage.setItem('theme', t);
                }, theme);
            });

            test(`Inbox page [${theme}]`, async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/inbox');
                await waitForAppReady(authenticatedPage);
                await authenticatedPage.waitForLoadState('networkidle'); // Wait for content and animations
                await expect(authenticatedPage).toHaveScreenshot(`inbox-${theme}.png`, {
                    fullPage: true,
                    mask: [authenticatedPage.locator('[data-testid="last-synced"]')],
                });
            });

            test(`Today page [${theme}]`, async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/today');
                await waitForAppReady(authenticatedPage);
                await authenticatedPage.waitForLoadState('networkidle'); // Wait for content and animations
                await expect(authenticatedPage).toHaveScreenshot(`today-${theme}.png`, {
                    fullPage: true,
                });
            });

            test(`Upcoming page [${theme}]`, async ({ authenticatedPage }) => {
                await authenticatedPage.goto('/upcoming');
                await waitForAppReady(authenticatedPage);
                await authenticatedPage.waitForLoadState('networkidle'); // Wait for content and animations
                await expect(authenticatedPage).toHaveScreenshot(`upcoming-${theme}.png`, {
                    fullPage: true,
                });
            });
        });
    }

    test('Mobile view [neubrutalism]', async ({ authenticatedPage }) => {
        await authenticatedPage.addInitScript(() => {
            window.localStorage.setItem('theme', 'neubrutalism');
        });
        await authenticatedPage.setViewportSize({ width: 375, height: 667 });
        await authenticatedPage.goto('/inbox');
        await waitForAppReady(authenticatedPage);
        await authenticatedPage.waitForTimeout(1000); // Wait for animations
        await expect(authenticatedPage).toHaveScreenshot('mobile-inbox-neubrutalism.png');
    });
});
