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
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
    
    /* Video recording on failure */
    video: "retain-on-failure",
    
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
  webServer: {
    command: "npm run dev",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      PORT: "3001",
      NEXT_PUBLIC_PROGRAM_ID: "11111111111111111111111111111112",
      NEXT_PUBLIC_RPC_URL: "https://api.devnet.solana.com",
      NEXT_PUBLIC_CLUSTER: "devnet",
      NEXT_PUBLIC_NETWORK: "devnet",
    },
  },
  
  /* Timeout settings */
  timeout: 60000,
  
  /* Expect settings */
  expect: {
    timeout: 5000,
  },
});
