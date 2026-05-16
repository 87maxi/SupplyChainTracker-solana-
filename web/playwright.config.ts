/**
 * Playwright End-to-End Testing Configuration
 * 
 * Configuration for end-to-end testing of the SupplyChainTracker frontend
 * using Playwright browser automation.
 * 
 * Key Features:
 * - Single browser instance for full-flow tests (continuous session)
 * - Sequential execution for full-flow to maintain browser state
 * - Video recording for debugging and visual verification
 * - Mock wallet injection for testing without real wallet
 */

import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  
  /* Exclude integration tests from default test run - they require test validator */
  testIgnore: [
    "**/integration/**",
  ],
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Preserve output for debugging - keeps videos/screenshots even on success */
  preserveOutput: 'always',
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  
  /* Global setup for wallet mock injection */
  globalSetup: "./e2e/fixtures/global-setup.ts",
  
  /* Global teardown to clean up browser resources */
  globalTeardown: "./e2e/fixtures/global-teardown.ts",
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    
    /* Capture network requests */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Configure projects for major browsers */
  projects: [
    /* 
     * Full Flow Sequential project - SINGLE BROWSER INSTANCE
     * This project runs ALL tests in a single browser session for continuous flow.
     * Key settings:
     * - fullyParallel: false (sequential execution within project)
     * - storageState: preserves browser cookies/localStorage between tests
     * - video: 'on' (always record for full flow review)
     * - trace: 'on' (always capture traces)
     */
    {
      name: "full-flow-sequential",
      testMatch: /full-flow\.spec\.ts/,
      fullyParallel: false, // Disable parallel within this project
      workers: 1, // CRITICAL: Force single worker to use one browser instance for entire flow
      use: {
        ...devices["Desktop Chrome"],
        video: 'on',
        trace: 'on',
        screenshot: 'on',
        // Storage state file to persist browser state between tests
        // This ensures the same browser instance maintains cookies, localStorage, etc.
        storageState: 'e2e/.auth/user.json',
        // Launch browser in headed mode for visual verification
        // headless: false will show the browser window
        launchOptions: {
          headless: !!process.env.CI, // Headless in CI, headed for local debugging
          slowMo: process.env.CI ? 0 : 100, // Slow down only for local debugging
        },
      },
    },
    
    /* Full Flow project - for compatibility with existing test references */
    {
      name: "full-flow",
      testMatch: /full-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        video: 'on',
        trace: 'on',
        storageState: 'e2e/.auth/user.json',
      },
    },
    
    /* Standard browser projects for unit-style E2E tests */
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        video: 'retain-on-failure',
        trace: 'on-first-retry',
        screenshot: process.env.CI ? "on" : "only-on-failure",
      },
    },
    {
      name: "firefox",
      use: { 
        ...devices["Desktop Firefox"],
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
    },
    {
      name: "webkit",
      use: { 
        ...devices["Desktop Safari"],
        video: 'retain-on-failure',
        trace: 'on-first-retry',
      },
    },
    
    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { 
        ...devices["Pixel 5"],
        video: 'retain-on-failure',
      },
    },
    {
      name: "Mobile Safari",
      use: { 
        ...devices["iPhone 12"],
        video: 'retain-on-failure',
      },
    },
  ],
  
  /* Run your local dev server before starting the tests */
  /* In CI, the CI workflow starts the production server and Playwright reuses it.
     Locally, we start the dev server for hot-reload during development. */
  webServer: {
    command: process.env.CI ? "npm start" : "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 60000,
    env: {
      PORT: "3001",
      // Use local validator in CI/E2E, fallback to devnet for local dev
      NEXT_PUBLIC_PROGRAM_ID: process.env.NEXT_PUBLIC_PROGRAM_ID || "BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW",
      NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8899",
      NEXT_PUBLIC_CLUSTER: process.env.NEXT_PUBLIC_CLUSTER || "localnet",
      NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || "localnet",
      NEXT_PUBLIC_TEST_MODE: process.env.NEXT_PUBLIC_TEST_MODE || "true",
    },
  },
  
  /* Timeout settings */
  timeout: 60000,
  
  /* Expect settings */
  expect: {
    timeout: 5000,
  },
});
