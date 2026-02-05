import { test, expect } from './fixtures';

test.describe('List Management: Navigation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/inbox');
    await authenticatedPage.waitForLoadState('load');
  });

  test('should display lists section in sidebar', async ({ authenticatedPage: page }) => {
    await expect(page.getByText('Lists').first()).toBeVisible();
    await expect(page.getByTestId('sidebar-lists').getByText('Inbox')).toBeVisible();
  });

  test('should navigate to list page when clicking list', async ({ authenticatedPage: page }) => {
    const inboxLink = page.getByRole('link', { name: /inbox/i }).first();
    await inboxLink.click();

    await page.waitForLoadState('load');
    expect(page.url()).toContain('/inbox');
  });
});
