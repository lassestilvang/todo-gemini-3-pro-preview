import { test, expect } from './fixtures';

test.describe('Label Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should display labels section in sidebar', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Labels')).toBeVisible();
  });

  test('should show add label button', async ({ authenticatedPage: page }) => {
    const addLabelButton = page.getByTestId('add-label-button');
    await expect(addLabelButton).toBeVisible();
  });

  test('should open create label dialog when clicking add button', async ({ authenticatedPage: page }) => {
    const addLabelButton = page.getByTestId('add-label-button');
    await addLabelButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder(/label name|name/i)).toBeVisible();
  });

  test('should create a new label', async ({ authenticatedPage: page }) => {
    const addLabelButton = page.getByTestId('add-label-button');
    await addLabelButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const labelName = `Test Label ${Date.now()}`;
    const nameInput = page.getByPlaceholder(/label name|name/i);
    await nameInput.fill(labelName);

    const createButton = page.getByRole('button', { name: /create|add|save/i });
    await createButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(labelName)).toBeVisible({ timeout: 10000 });
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
