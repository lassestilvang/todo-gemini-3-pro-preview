import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing.
 * 
 * Requirements: 5.1, 5.6, 5.7
 * - Uses Playwright as the testing framework
 * - Runs in headless mode for CI
 * - Uses test database isolation
 */
export default defineConfig({
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: process.env.CI ? 'github' : 'html',

  // Global timeout for each test
  timeout: 60000,

  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Headless mode
    headless: true,

    // Navigation timeout
    navigationTimeout: 30000,

    // Action timeout
    actionTimeout: 15000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before starting the tests with E2E test mode enabled
  webServer: {
    command: 'E2E_TEST_MODE=true bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      E2E_TEST_MODE: 'true',
    },
  },
});
