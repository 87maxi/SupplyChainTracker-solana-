/**
 * Playwright End-to-End Testing Configuration
 * 
 * Configuration for end-to-end testing of the SupplyChainTracker frontend
 * using Playwright browser automation.
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
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  
  /* Global setup for wallet mock injection */
  globalSetup: "./e2e/fixtures/global-setup.ts",
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    
    /* Take screenshots - always on CI for visual reports, only-on-failure locally */
    screenshot: process.env.CI ? "on" : "only-on-failure",
    
    /* Video recording - always on CI for full process visibility, on-failure locally */
    video: process.env.CI ? "on" : "retain-on-failure",
    
    /* Capture network requests */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    
    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
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
      NEXT_PUBLIC_PROGRAM_ID: "11111111111111111111111111111112",
      NEXT_PUBLIC_RPC_URL: "https://api.devnet.solana.com",
      NEXT_PUBLIC_CLUSTER: "devnet",
      NEXT_PUBLIC_NETWORK: "devnet",
      NEXT_PUBLIC_TEST_MODE: "true",
    },
  },
  
  /* Timeout settings */
  timeout: 60000,
  
  /* Expect settings */
  expect: {
    timeout: 5000,
  },
});
