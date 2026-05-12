/**
 * Playwright Global Setup
 *
 * This module exports a setup function that injects a mock Solana wallet
 * into the browser before each test. Import and call setupWalletMock in
 * your test files' beforeEach hook.
 *
 * Usage:
 *   import { test } from '@playwright/test';
 *   import { setupWalletMock } from './fixtures/global-setup';
 *
 *   test.describe('My Tests', () => {
 *     test.beforeEach(async ({ page }) => {
 *       await setupWalletMock(page);
 *     });
 *
 *     test('my test', async ({ page }) => {
 *       // Mock wallet is available
 *     });
 *   });
 */

import { Page } from "@playwright/test";
import { injectMockWallet, connectMockWallet } from "./wallet-mock";

/**
 * Sets up the mock wallet on the given page.
 * Call this in your test's beforeEach hook.
 */
export const setupWalletMock = async (page: Page): Promise<void> => {
  await injectMockWallet(page);
  await connectMockWallet(page);
};

/**
 * Creates a Playwright test fixture that auto-injects the wallet mock.
 * Use this instead of the default Playwright test.
 */
export const createWalletTest = () => {
  // Return a wrapper that ensures wallet is set up
  return {
    beforeEach: async (page: Page) => {
      await setupWalletMock(page);
    },
  };
};
