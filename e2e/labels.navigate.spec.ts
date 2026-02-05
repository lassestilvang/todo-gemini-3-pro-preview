import { test, expect } from './fixtures';

test.describe('Label Management: Navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should display labels section in sidebar', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Labels')).toBeVisible();
  });

  test('should navigate to label filter page when clicking label', async ({ authenticatedPage: page }) => {
    const addLabelButton = page.getByTestId('add-label-button');
    await addLabelButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const labelName = `NavLabel${Date.now()}`;
    const nameInput = page.getByPlaceholder(/label name|name/i);
    await nameInput.fill(labelName);

    const createButton = page.getByRole('button', { name: /create|add|save/i });
    await createButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('load');

    await page.waitForSelector('[data-testid="sidebar-labels"]', { state: 'visible', timeout: 10000 });

    const labelLink = page.getByTestId('sidebar-labels').getByRole('link', { name: labelName });
    await expect(labelLink).toBeVisible({ timeout: 10000 });

    const href = await labelLink.getAttribute('href');
    expect(href).toContain('/labels/');

    await page.goto(href!);
    await page.waitForLoadState('load');

    expect(page.url()).toContain('/labels/');
  });
});
