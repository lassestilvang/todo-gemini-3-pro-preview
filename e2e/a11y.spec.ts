
import { test, expect, authenticateTestUser } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
    test('should not have any automatically detectable accessibility issues on landing page', async ({ page }) => {
        // Authenticate and go to landing/today page
        await authenticateTestUser(page);
        await page.goto('/today');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('[data-react-grab="true"]')
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('Violations on landing page:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have any automatically detectable accessibility issues on inbox page', async ({ page }) => {
        await authenticateTestUser(page);
        await page.goto('/inbox');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('[data-react-grab="true"]')
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('Violations on inbox page:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should not have any automatically detectable accessibility issues on upcoming page', async ({ page }) => {
        await authenticateTestUser(page);
        await page.goto('/upcoming');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('[data-react-grab="true"]')
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log('Violations on upcoming page:', JSON.stringify(accessibilityScanResults.violations, null, 2));
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    // Test Settings Dialog/Page if possible, strictly following typical user flow
    test.skip('should not have any automatically detectable accessibility issues on settings', async ({ page }) => {
        // TODO: Implement navigation to settings and check A11y
    });
});
