import { expect, test } from "./fixtures";
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility: Core Pages', () => {
    test('should not have any automatically detectable accessibility issues on landing page', async ({ authenticatedPage: page }) => {
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

    test('should not have any automatically detectable accessibility issues on inbox page', async ({ authenticatedPage: page }) => {
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
});
