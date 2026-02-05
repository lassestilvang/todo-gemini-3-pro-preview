import { test, expect } from './fixtures';

test.describe('List Management: Create', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should show add list button', async ({ authenticatedPage: page }) => {
    const addListButton = page.getByTestId('add-list-button');
    await expect(addListButton).toBeVisible();
  });

  test('should open create list dialog when clicking add button', async ({ authenticatedPage: page }) => {
    const addListButton = page.getByTestId('add-list-button');
    await addListButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByPlaceholder(/list name|name/i)).toBeVisible();
  });

  test('should create a new list', async ({ authenticatedPage: page }) => {
    const addListButton = page.getByTestId('add-list-button');
    await addListButton.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const listName = `Test List ${Date.now()}`;
    const nameInput = page.getByPlaceholder(/list name|name/i);
    await nameInput.fill(listName);

    const createButton = page.getByRole('button', { name: /create|add|save/i });
    await createButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10000 });
  });
});
