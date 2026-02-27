import { test, expect, createList } from './fixtures';

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
    const listName = `Test List ${Date.now()}`;
    await createList(page, listName);
  });
});
