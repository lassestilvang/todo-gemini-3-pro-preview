import { test, expect } from './fixtures';

test.describe('Label Management: Create', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
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
});
