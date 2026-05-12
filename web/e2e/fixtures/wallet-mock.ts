/**
 * ⚠️ DEPRECATED: Wallet Mock for Playwright E2E Tests
 *
 * THIS FILE IS DEPRECATED. Please use MockWalletAdapter instead:
 * @see web/src/lib/solana/mock-wallet-adapter.ts
 *
 * This mock implements the Phantom wallet interface that @solana/wallet-adapter expects.
 *
 * ## Why deprecated?
 *
 * This file injects a basic Phantom wallet interface via window.solana/window.phantom.
 * However, PhantomWalletAdapter has internal validation that doesn't detect this mock correctly.
 *
 * The new MockWalletAdapter extends BaseWalletAdapter and properly implements the full
 * WalletAdapter interface, including event emission for connection/disconnection.
 *
 * ## Migration
 *
 * If you're using this file, update your code to use MockWalletAdapter:
 * ```typescript
 * import { MockWalletAdapter } from '@/lib/solana/mock-wallet-adapter';
 * // MockWalletAdapter is auto-registered when NEXT_PUBLIC_TEST_MODE=true
 * ```
 *
 * @deprecated Use web/src/lib/solana/mock-wallet-adapter.ts instead
 */

import { Page } from "@playwright/test";

// Mock wallet private key (test only - never use in production)
const MOCK_PRIVATE_KEY =
  "Aeo54vo7UtFjDEBccwNm2VgPb23X5DqTZFm1qXbbSF1sQuFy2B4E2pqBwJHwZ8vaLpFjF7k6JqDpQZ1B";

// Mock public key (derived from private key for testing)
const MOCK_PUBLIC_KEY = "MockPublicKey1111111111111111111111111111111";

// Mock wallet provider state
const MOCK_WALLET_STATE = {
  isConnected: true,
  publicKey: MOCK_PUBLIC_KEY,
  signature:
    "4pZ3GXA9bViVxZMEWAbZpg8z4ng7ni1QjD1A3TfA9Lr7uxGjBZ8owXAViE64EouRcBnCTy6gPiBT4XxXjBbZ",
};

/**
 * Creates a mock Solana wallet object that mimics the Phantom wallet extension API.
 */
function createMockWallet() {
  return {
    // Connection state
    isConnected: true,
    publicKey: {
      toString: () => MOCK_PUBLIC_KEY,
      toBytes: () => new Uint8Array(32),
      equals: () => true,
    },

    // Required by @solana/wallet-adapter
    adapter: {
      name: "Phantom",
      icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzVGNDU2RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=",
      url: "https://phantom.app",
      installUrl: "https://phantom.app/download",
    },

    // Sign transaction (mock - returns a dummy signed transaction)
    signTransaction: async (transaction: any) => {
      return {
        ...transaction,
        signatures: [MOCK_SIGNATURE],
      };
    },

    // Sign all transactions (mock)
    signAllTransactions: async (transactions: any[]) => {
      return transactions.map((tx) => ({
        ...tx,
        signatures: [MOCK_SIGNATURE],
      }));
    },

    // Sign message (mock)
    signMessage: async (message: any) => {
      return {
        signature: MOCK_SIGNATURE,
      };
    },

    // Sign multiple transactions (Wallet Standard)
    signTransactions: async (transactions: any[]) => {
      return transactions.map((tx) => ({
        ...tx,
        signatures: [MOCK_SIGNATURE],
      }));
    },

    // Event emitter (for wallet events)
    on: () => {},
    off: () => {},
  };
}

// Pre-computed mock signature (32 bytes base58 encoded)
const MOCK_SIGNATURE =
  "5JFwGMvfSU3yW1QqY8pN1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1";

/**
 * Injects the mock wallet into the browser window.
 * This must be called BEFORE the React app initializes to avoid hydration errors.
 */
async function injectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Create the mock wallet
    const mockWallet = createMockWallet();

    // Inject into window.solana (Phantom standard)
    (window as any).solana = mockWallet;

    // Also inject as window.phantom.solana (Phantom prefers this)
    (window as any).phantom = {
      solana: mockWallet,
      isPhantom: true,
    };

    // Inject Wallet Standard provider
    (window as any).wallet = mockWallet;

    // Dispatch custom event to notify the app that wallet is ready
    window.dispatchEvent(
      new CustomEvent("walletReady", {
        detail: { wallet: mockWallet },
      })
    );
  });
}

/**
 * Connects the mock wallet (simulates user clicking "Connect" in wallet modal).
 * Since our mock is always connected, this just ensures the app detects it.
 */
async function connectMockWallet(page: Page): Promise<void> {
  // The mock is already connected, but we need to make sure the app detects it
  await page.evaluate(() => {
    const wallet = (window as any).solana || (window as any).phantom?.solana;
    if (wallet) {
      // Ensure connected state
      wallet.isConnected = true;
      // Dispatch connection event
      window.dispatchEvent(
        new CustomEvent("walletConnect", {
          detail: { publicKey: wallet.publicKey },
        })
      );
    }
  });

  // Wait for React to pick up the wallet state
  await page.waitForTimeout(500);
}

/**
 * Disconnects the mock wallet (simulates user disconnecting).
 */
async function disconnectMockWallet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const wallet = (window as any).solana || (window as any).phantom?.solana;
    if (wallet) {
      wallet.isConnected = false;
      wallet.publicKey = null;
      window.dispatchEvent(new CustomEvent("walletDisconnect"));
    }
  });
}

/**
 * Gets the mock wallet address.
 */
function getMockAddress(): string {
  return MOCK_PUBLIC_KEY;
}

/**
 * Gets the mock wallet private key (for advanced testing scenarios).
 */
function getMockPrivateKey(): string {
  return MOCK_PRIVATE_KEY;
}

export {
  injectMockWallet,
  connectMockWallet,
  disconnectMockWallet,
  getMockAddress,
  getMockPrivateKey,
  MOCK_PUBLIC_KEY,
  MOCK_PRIVATE_KEY,
  MOCK_WALLET_STATE,
};
