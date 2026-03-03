import { expect, test } from "./fixtures";
import AxeBuilder from '@axe-core/playwright';

const IGNORED_AXE_RULE_IDS = new Set(["landmark-complementary-is-top-level"]);

function actionableViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
    return violations.filter((violation) => !IGNORED_AXE_RULE_IDS.has(violation.id));
}

test.describe('Accessibility: Upcoming Page', () => {
    test('should not have any automatically detectable accessibility issues on upcoming page', async ({ authenticatedPage: page }) => {
        await page.goto('/upcoming', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('[data-react-grab="true"]')
            .analyze();

        const violations = actionableViolations(accessibilityScanResults.violations);

        if (violations.length > 0) {
            console.log('Violations on upcoming page:', JSON.stringify(violations, null, 2));
        }

        expect(violations).toEqual([]);
    });
});
