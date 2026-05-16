/**
 * Playwright Global Setup - Mock Wallet Injection
 * 
 * This file runs once before all tests.
 * It injects a mock wallet that correctly implements the Wallet Standard protocol.
 * 
 * ## How it works
 * 
 * 1. Creates a browser context with addInitScript
 * 2. The script listens for 'wallet-standard:register-wallet' event
 * 3. When the event fires (dispatched by getWallets() from @wallet-standard/app),
 *    the mock wallet registers itself via callback.register(wallet)
 * 4. autoDiscover() then finds the wallet via getWallets().get()
 * 
 * ## Wallet Standard Protocol Flow
 * 
 * ```
 * getWallets() called by @solana/client
 *   ↓
 * Dispatches 'wallet-standard:app-ready' event
 *   ↓
 * Listens for 'wallet-standard:register-wallet' event
 *   ↓
 * Mock wallet receives callback(api)
 *   ↓
 * Mock wallet calls api.register(mockWallet)
 *   ↓
 * getWallets().get() returns [mockWallet]
 *   ↓
 * autoDiscover() creates connectors from wallets
 * ```
 */

import { FullConfig, chromium } from "@playwright/test";
import { MOCK_WALLET_INJECTION_SCRIPT } from "./mock-wallet-injection";

/**
 * Global setup function for Playwright.
 * Injects mock wallet via addInitScript before any page loads.
 */
async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch({
    headless: process.env.CI ? true : false,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // CRITICAL: Inject mock wallet BEFORE any page navigation
  // This ensures the script runs before @solana/client calls autoDiscover()
  await page.addInitScript({
    content: MOCK_WALLET_INJECTION_SCRIPT,
  });

  // Navigate to a blank page to trigger the injection
  // The addInitScript runs immediately, setting up the event listener
  await page.goto("about:blank");

  // Wait a bit for the injection to complete
  await page.waitForTimeout(500);

  // Verify injection worked
  const injected = await page.evaluate(() => {
    return !!(window as any).__PLAYWRIGHT_MOCK_WALLET_INJECTED;
  });

  if (injected) {
    console.log("[GlobalSetup] Mock wallet injection verified successfully");
  } else {
    console.warn("[GlobalSetup] Mock wallet injection may not have worked");
  }

  await browser.close();
}

export default globalSetup;
