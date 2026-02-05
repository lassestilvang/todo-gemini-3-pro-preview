import { expect, test } from "./fixtures";
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility: Upcoming Page', () => {
    test('should not have any automatically detectable accessibility issues on upcoming page', async ({ authenticatedPage: page }) => {
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
});
