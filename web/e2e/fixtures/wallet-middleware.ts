/**
 * Playwright Test Setup with Mock Wallet
 *
 * This file exports an extended Playwright test fixture that automatically
 * injects a mock Solana wallet before each test using page.addInitScript().
 *
 * The mock wallet is injected BEFORE any page navigation, ensuring the
 * wallet is available when React components check for it during hydration.
 *
 * Usage:
 *   import { test, expect } from '../../e2e/fixtures/wallet-middleware';
 *
 *   test('my test', async ({ page }) => {
 *     await page.goto('/');
 *     // Mock wallet is already injected
 *   });
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { test as base, expect as baseExpect } from "@playwright/test";

// Mock wallet injection script - runs in browser context BEFORE any page load
const WALLET_INJECTION_SCRIPT = `
() => {
  // Mock Phantom wallet interface
  const mockWallet = {
    // Connection state
    isConnected: true,
    
    // Public key
    publicKey: {
      toString: () => 'MockPublicKey1111111111111111111111111111111',
      toBytes: () => new Uint8Array(32),
      equals: () => true,
      buffer: new Uint8Array(32).buffer
    },
    
    // Wallet adapter interface
    adapter: {
      name: 'Phantom',
      icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzVGNDU2RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=',
      url: 'https://phantom.app',
      installUrl: 'https://phantom.app/download'
    },
    
    // Sign transaction (mock)
    signTransaction: async (transaction) => ({
      ...transaction,
      signatures: ['5JFwGMvfSU3yW1QqY8pN1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1']
    }),
    
    // Sign all transactions (mock)
    signAllTransactions: async (transactions) =>
      transactions.map(tx => ({
        ...tx,
        signatures: ['5JFwGMvfSU3yW1QqY8pN1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1']
      })),
    
    // Sign message (mock)
    signMessage: async (message) => ({
      signature: '5JFwGMvfSU3yW1QqY8pN1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1'
    }),
    
    // Sign transactions (Wallet Standard)
    signTransactions: async (transactions) =>
      transactions.map(tx => ({
        ...tx,
        signatures: ['5JFwGMvfSU3yW1QqY8pN1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1']
      })),
    
    // Event handlers
    on: () => {},
    off: () => {}
  };
  
  // Inject into window.solana (Phantom standard)
  window.solana = mockWallet;
  
  // Also inject as window.phantom.solana (Phantom prefers this)
  window.phantom = {
    solana: mockWallet,
    isPhantom: true
  };
  
  // Inject as window.wallet (Wallet Standard)
  window.wallet = mockWallet;
  
  // Dispatch custom event for app detection
  window.dispatchEvent(new CustomEvent('walletReady', {
    detail: { wallet: mockWallet }
  }));
}
`;

// Extended test fixture with auto wallet injection
export const test = base.extend({
  // Override page to add init script before navigation
  page: async ({ page }, use) => {
    // Inject wallet mock BEFORE any page navigation
    // addInitScript runs before any page load, ensuring wallet is available
    await page.addInitScript(WALLET_INJECTION_SCRIPT);
    
    // Run the test
    await use(page);
  }
});

export const expect = baseExpect;
