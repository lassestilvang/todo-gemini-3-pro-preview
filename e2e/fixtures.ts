import { test as base, expect, Page } from '@playwright/test';

/**
 * E2E test fixtures for Todo Gemini.
 * 
 * Provides common test utilities and authentication helpers.
 * 
 * Requirements: 5.6, 5.7
 * - Test database isolation
 * - Headless browser mode for CI
 */

/**
 * Test user credentials used in E2E test mode.
 */
export const TEST_USER = {
  id: 'test-user-e2e-001',
  email: 'e2e-test@example.com',
  firstName: 'E2E',
  lastName: 'Test User',
};

/**
 * Authenticate as the test user.
 * This calls the test-auth API endpoint to create a test session.
 */
export async function authenticateTestUser(page: Page): Promise<boolean> {
  try {
    // Generate a unique ID for this test to ensure database isolation
    const uniqueId = Math.random().toString(36).substring(7);
    const user = {
      id: `test-user-${uniqueId}`,
      email: `test-${uniqueId}@example.com`,
      firstName: 'E2E',
      lastName: 'Test User',
      profilePictureUrl: null,
    };

    // Use Playwright's API request context to avoid browser origin issues
    const response = await page.request.post('/api/test-auth', {
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
      }
    });

    const data = await response.json();
    if (data.success !== true) {
      return false;
    }

    const sessionValue = JSON.stringify({
      user,
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    const cookieUrl = new URL(page.url());
    const setCookieHeader = response.headers()['set-cookie'];
    const headerValueMatch = setCookieHeader?.match(/wos-session-test=([^;]+)/);
    const cookieValue = headerValueMatch?.[1] ?? sessionValue;

    const origins = new Set<string>([cookieUrl.origin]);
    const port = cookieUrl.port ? `:${cookieUrl.port}` : "";
    if (cookieUrl.hostname === "localhost") {
      origins.add(`http://127.0.0.1${port}`);
    }
    if (cookieUrl.hostname === "127.0.0.1") {
      origins.add(`http://localhost${port}`);
    }

    // Explicitly set the session cookie in the browser context to avoid racey cookie propagation.
    // Set for both localhost and 127.0.0.1 to cover internal fetches.
    await page.context().addCookies(
      Array.from(origins).map((origin) => ({
        name: 'wos-session-test',
        value: cookieValue,
        url: origin,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      }))
    );

    return true;
  } catch (error) {
    console.error('Failed to authenticate test user:', error);
    return false;
  }
}

/**
 * Clear the test user session.
 */
export async function clearTestSession(page: Page): Promise<boolean> {
  try {
    // Always clear local cookies first to guarantee unauthenticated state.
    await page.context().clearCookies();

    const response = await page.request.delete('/api/test-auth');
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Failed to clear test session:', error);
    return false;
  }
}

/**
 * Extended test fixture with authentication support.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to a page first to establish origin for fetch
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Authenticate before the test
    const authenticated = await authenticateTestUser(page);
    if (!authenticated) {
      throw new Error('Failed to authenticate test user. Make sure E2E_TEST_MODE=true is set.');
    }

    // Verify authentication by checking if we can access a protected route without redirect
    await page.goto('/inbox', { waitUntil: 'domcontentloaded' });
    const redirectedToLogin = await isOnLoginPage(page);
    if (redirectedToLogin) {
      console.error('[E2E] Authentication verification failed: redirected to login after auth');
      throw new Error('Authentication failed: redirected to login even after calling test-auth endpoint.');
    }

    // Disable onboarding tour for tests
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding_completed', 'true');
    });

    console.log(`[E2E] Authenticated page ready for test at ${page.url()}`);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);

    // Clean up after the test
    await clearTestSession(page);
  },
});

export { expect };

/**
 * Helper to wait for the app to be ready after navigation.
 * Waits for the main layout to be visible.
 */
export async function waitForAppReady(page: Page) {
  // Wait for the main content area to be visible
  await page.waitForSelector('[data-testid="main-content"], main', {
    state: 'visible',
    timeout: 10000
  });
}

/**
 * Helper to check if user is on the login page.
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes('/login') || url.includes('authkit.app')) {
    return true;
  }

  const signIn = page.getByTestId('sign-in-button');
  if ((await signIn.count()) > 0) {
    return signIn.first().isVisible().catch(() => false);
  }

  return false;
}

/**
 * Helper to navigate to a protected route and handle auth redirect.
 * Returns true if redirected to login, false if accessed successfully.
 */
export async function navigateToProtectedRoute(
  page: Page,
  route: string
): Promise<boolean> {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  return isOnLoginPage(page);
}

/**
 * Helper to create a task via the UI.
 */
export async function createTask(page: Page, title: string): Promise<void> {
  // Wait for the task input to be visible
  await page.waitForSelector('[data-testid="task-input"]', {
    state: 'visible',
    timeout: 10000
  });

  const taskInput = page.getByTestId('task-input');
  await taskInput.fill(title);
  await taskInput.press('Enter');
  // Wait for the input to be cleared (optimistic update signal)
  await expect(taskInput).toHaveValue('', { timeout: 10000 });

  // Wait for the task to appear in the list to ensure it's ready for interaction
  await page.waitForSelector(`[data-testid="task-item"]:has-text("${title}")`, {
    state: 'visible',
    timeout: 30000
  });
}

/**
 * Helper to wait for a task to appear in the list.
 */
export async function waitForTask(page: Page, titleContains: string): Promise<void> {
  await page.waitForSelector(`[data-testid="task-item"]:has-text("${titleContains}")`, {
    state: 'visible',
    timeout: 60000,
  });
}
