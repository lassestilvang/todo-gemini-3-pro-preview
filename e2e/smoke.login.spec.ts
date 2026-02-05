import { test, expect } from './fixtures';

test.describe('Smoke: Login Page', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const url = page.url();
    expect(url).toMatch(/\/(login|inbox)/);
  });

  test('should display login page elements when not authenticated', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Todo Gemini' })).toBeVisible();
    await expect(page.getByText('AI-powered daily task planner')).toBeVisible();

    await expect(page.getByTestId('sign-in-button')).toBeVisible();
    await expect(page.getByTestId('sign-up-button')).toBeVisible();
  });
});
