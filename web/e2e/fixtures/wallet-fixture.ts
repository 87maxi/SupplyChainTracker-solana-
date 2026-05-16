/**
 * Playwright Wallet Fixture
 * 
 * Provides mock wallet injection via addInitScript that runs BEFORE
 * any page content loads, ensuring @solana/client autoDiscover() finds
 * the mock wallet by correctly implementing the Wallet Standard protocol.
 * 
 * ## Wallet Standard Protocol
 * 
 * The mock wallet listens for 'wallet-standard:register-wallet' event
 * and registers itself via callback.register(wallet).
 * 
 * @see ../fixtures/mock-wallet-injection.ts
 */

import { test as baseTest, Page } from "@playwright/test";
import { MOCK_WALLET_INJECTION_SCRIPT, createMockWalletFixture } from "./mock-wallet-injection";

/**
 * Extended test fixtures with mock wallet injection
 * Uses addInitScript to inject wallet BEFORE page loads
 */
export const test = baseTest.extend<{
  mockWalletReady: boolean;
}>({
  mockWalletReady: false,
  
  // Inject mock wallet via addInitScript before each test's first navigation
  page: async ({ page }, use) => {
    // CRITICAL: Inject mock wallet BEFORE any page navigation
    // This ensures @solana/client autoDiscover() finds it when React initializes
    await page.addInitScript({
      content: MOCK_WALLET_INJECTION_SCRIPT,
    });
    
    await use(page);
  },
});

export { expect } from "@playwright/test";

/**
 * Helper to verify mock wallet injection in tests
 */
export async function verifyMockWallet(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    // Check for injected mock wallet state
    return !!(window as any).__PLAYWRIGHT_MOCK_WALLET_INJECTED;
  });
}

/**
 * Helper to get mock wallet connection state
 */
export async function getMockWalletState(page: Page): Promise<{ connected: boolean; address: string | null }> {
  return await page.evaluate(() => {
    const state = (window as any).__MOCK_WALLET_STATE;
    return {
      connected: state ? state.connected : false,
      address: state ? state.address : null,
    };
  });
}

/**
 * Helper to connect mock wallet
 */
export async function connectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise((resolve) => {
      // Wait for wallet to be registered
      const checkWallet = setInterval(() => {
        const wallets = (window as any).__MOCK_WALLETS;
        if (wallets && wallets.length > 0) {
          clearInterval(checkWallet);
          // Connect the first wallet
          const wallet = wallets[0];
          if (wallet.connect) {
            wallet.connect().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        }
      }, 50);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        clearInterval(checkWallet);
        resolve();
      }, 2000);
    });
  });
}
