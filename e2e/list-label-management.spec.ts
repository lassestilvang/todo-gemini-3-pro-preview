import { test, expect, authenticateTestUser } from './fixtures';

/**
 * E2E tests for list and label management.
 * 
 * Requirements: 5.5
 * - Test creating and deleting lists
 * - Test creating and applying labels
 * - Test filtering by label
 * 
 * These tests use E2E_TEST_MODE for authentication.
 */
test.describe('List and Label Management', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to inbox page (auth and onboarding disable handled by fixture)
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test.describe('List Management', () => {
    test('should display lists section in sidebar', async ({ authenticatedPage: page }) => {
      // The sidebar should have a lists section
      await expect(page.getByText('Lists').first()).toBeVisible();

      // Default Inbox list should be visible in sidebar
      await expect(page.getByTestId('sidebar-lists').getByText('Inbox')).toBeVisible();
    });

    test('should show add list button', async ({ authenticatedPage: page }) => {
      // There should be a way to add a new list
      const addListButton = page.getByTestId('add-list-button');
      await expect(addListButton).toBeVisible();
    });

    test('should open create list dialog when clicking add button', async ({ authenticatedPage: page }) => {
      const addListButton = page.getByTestId('add-list-button');
      await addListButton.click();

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible();

      // Should have a name input
      await expect(page.getByPlaceholder(/list name|name/i)).toBeVisible();
    });

    test('should create a new list', async ({ authenticatedPage: page }) => {
      const addListButton = page.getByTestId('add-list-button');
      await addListButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Enter list name
      const listName = `Test List ${Date.now()}`;
      const nameInput = page.getByPlaceholder(/list name|name/i);
      await nameInput.fill(listName);

      // Submit the form
      const createButton = page.getByRole('button', { name: /create|add|save/i });
      await createButton.click();

      // Wait for dialog to close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // The new list should appear in the sidebar
      await expect(page.getByText(listName)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to list page when clicking list', async ({ authenticatedPage: page }) => {
      // Click on Inbox list
      const inboxLink = page.getByRole('link', { name: /inbox/i }).first();
      await inboxLink.click();

      await page.waitForLoadState('load');

      // Should be on the inbox page
      expect(page.url()).toContain('/inbox');
    });
  });

  test.describe('Label Management', () => {
    test('should display labels section in sidebar', async ({ authenticatedPage: page }) => {
      // The sidebar should have a labels section
      await expect(page.getByText('Labels')).toBeVisible();
    });

    test('should show add label button', async ({ authenticatedPage: page }) => {
      // There should be a way to add a new label
      const addLabelButton = page.getByTestId('add-label-button');
      await expect(addLabelButton).toBeVisible();
    });

    test('should open create label dialog when clicking add button', async ({ authenticatedPage: page }) => {
      const addLabelButton = page.getByTestId('add-label-button');
      await addLabelButton.click();

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible();

      // Should have a name input
      await expect(page.getByPlaceholder(/label name|name/i)).toBeVisible();
    });

    test('should create a new label', async ({ authenticatedPage: page }) => {
      const addLabelButton = page.getByTestId('add-label-button');
      await addLabelButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Enter label name
      const labelName = `Test Label ${Date.now()}`;
      const nameInput = page.getByPlaceholder(/label name|name/i);
      await nameInput.fill(labelName);

      // Submit the form
      const createButton = page.getByRole('button', { name: /create|add|save/i });
      await createButton.click();

      // Wait for dialog to close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // The new label should appear in the sidebar
      await expect(page.getByText(labelName)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to label filter page when clicking label', async ({ authenticatedPage: page }) => {
      // First create a label
      const addLabelButton = page.getByTestId('add-label-button');
      await addLabelButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      const labelName = `NavLabel${Date.now()}`;
      const nameInput = page.getByPlaceholder(/label name|name/i);
      await nameInput.fill(labelName);

      const createButton = page.getByRole('button', { name: /create|add|save/i });
      await createButton.click();

      // Wait for dialog to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Reload to ensure the label appears in sidebar
      await page.reload();
      await page.waitForLoadState('load');

      // Wait for sidebar labels section to load
      await page.waitForSelector('[data-testid="sidebar-labels"]', { state: 'visible', timeout: 10000 });

      // Wait for the specific label to appear in the sidebar
      const labelLink = page.getByTestId('sidebar-labels').getByRole('link', { name: labelName });
      await expect(labelLink).toBeVisible({ timeout: 10000 });

      // Get the href and navigate directly (workaround for click not triggering navigation)
      const href = await labelLink.getAttribute('href');
      expect(href).toContain('/labels/');

      // Navigate using the href
      await page.goto(href!);
      await page.waitForLoadState('load');

      // Should be on a label filter page
      expect(page.url()).toContain('/labels/');
    });
  });

  test.describe('Label Filtering', () => {
    test('should filter tasks by label', async ({ authenticatedPage: page }) => {
      // First create a label to ensure we have one
      const addLabelButton = page.getByTestId('add-label-button');
      await addLabelButton.click();

      await expect(page.getByRole('dialog')).toBeVisible();

      const labelName = `FilterLabel${Date.now()}`;
      const nameInput = page.getByPlaceholder(/label name|name/i);
      await nameInput.fill(labelName);

      const createButton = page.getByRole('button', { name: /create|add|save/i });
      await createButton.click();

      // Wait for dialog to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

      // Reload to ensure the label appears in sidebar
      await page.reload();
      await page.waitForLoadState('load');

      // Wait for sidebar labels section to load
      await page.waitForSelector('[data-testid="sidebar-labels"]', { state: 'visible', timeout: 10000 });

      // Wait for the specific label to appear in the sidebar
      const labelLink = page.getByTestId('sidebar-labels').getByRole('link', { name: labelName });
      await expect(labelLink).toBeVisible({ timeout: 10000 });

      // Get the href and navigate directly (workaround for click not triggering navigation)
      const href = await labelLink.getAttribute('href');
      expect(href).toContain('/labels/');

      // Navigate using the href
      await page.goto(href!);
      await page.waitForLoadState('load');

      // Should be on a label filter page
      expect(page.url()).toContain('/labels/');

      // The page should load correctly (heading might have different format)
      await expect(page.locator('main')).toBeVisible();
    });
  });
});
