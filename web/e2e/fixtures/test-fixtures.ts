/**
 * Playwright Test Fixtures
 * 
 * Custom fixtures for reusable test setup and configuration.
 */

import { test as base } from "@playwright/test";
import {
  mockWalletConnection,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from "../helpers/test-utils";

/**
 * Extended test fixtures with Solana-specific helpers
 */
export const test = base.extend<{
  mockWallet: () => Promise<void>;
  setupTestEnv: () => Promise<void>;
  cleanupTestEnv: () => Promise<void>;
}>({
  mockWallet: async ({ page }, use) => {
    await mockWalletConnection(page);
    await use(() => mockWalletConnection(page));
  },
  setupTestEnv: async ({ page }, use) => {
    await setupTestEnvironment(page);
    await use();
    await cleanupTestEnvironment(page);
  },
  cleanupTestEnv: async ({ page }, use) => {
    await use();
    await cleanupTestEnvironment(page);
  },
});

export { expect } from "@playwright/test";
