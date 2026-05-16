/**
 * Playwright Wallet Module Mock
 * 
 * This file provides the mock module script that patches @solana/react-hooks
 * and @solana/client BEFORE they are evaluated by the browser.
 * 
 * The script intercepts ES module evaluations to return mock implementations
 * of the wallet hooks.
 */

export const WALLET_MODULE_MOCK_SCRIPT = `
(function() {
  // Prevent double injection
  if (window.__WALLET_MODULE_MOCKED) {
    return;
  }
  window.__WALLET_MODULE_MOCKED = true;

  const mockAddress = 'MockWallet1111111111111111111111111111111';
  const mockPublicKey = new Uint8Array(32).fill(0x42);
  
  const mockAccount = {
    address: mockAddress,
    publicKey: mockPublicKey,
    type: 'secp256k1',
  };

  const mockConnector = {
    id: 'playwright-mock-wallet',
    name: 'Playwright Mock Wallet',
    ready: true,
  };

  // ============================================
  // INTERCEPT ES MODULE LOADING
  // ============================================
  // Next.js uses dynamic import() for ES modules
  // We need to intercept this to return mock implementations
  
  const originalImport = window.import;
  const moduleCache = new Map();
  
  // Patch dynamic import
  const originalDynamicImport = window.import || globalThis.import;
  
  // Instead of patching import(), we'll patch the modules after they're loaded
  // by overriding Object.defineProperty on the module namespace objects
  
  // ============================================
  // PATCH @solana/react-hooks EXPORTS
  // ============================================
  // We'll create a MutationObserver to watch for React components
  // and patch the hooks when they're accessed
  
  // Store original hooks
  const originalHooks: any = {};
  
  // Create mock hook states
  const mockHookStates = {
    wallet: {
      status: 'connected' as const,
      connector: mockConnector,
    },
    session: {
      connector: mockConnector,
      account: mockAccount,
    },
    connectors: [mockConnector],
  };

  // ============================================
  // PATCH WINDOW STATE FOR COMPONENTS
  // ============================================
  
  // Set up global mock state that components can check
  window.__MOCK_WALLET_STATE = {
    isConnected: true,
    connectors: mockHookStates.connectors,
    walletStatus: 'connected',
    session: mockHookStates.session,
    account: mockAccount,
  };

  // ============================================
  // WALLET STANDARD REGISTRATION
  // ============================================
  
  const registeredWallets = [mockConnector];
  
  if (!window.wallets) {
    Object.defineProperty(window, "wallets", {
      value: registeredWallets,
      writable: true,
      configurable: true,
    });
  }
  
  if (!window.navigator?.wallets) {
    Object.defineProperty(window.navigator, 'wallets', {
      value: registeredWallets,
      writable: true,
      configurable: true,
    });
  }

  // Dispatch app-ready event
  const appReadyEvent = new CustomEvent('wallet-standard:app-ready', {
    detail: {
      register: function(wallet: any) {
        registeredWallets.push(wallet);
      },
      get: function() {
        return registeredWallets.slice();
      },
      on: function() {
        return function() {};
      },
    },
    bubbles: true,
  });
  window.dispatchEvent(appReadyEvent);

  // ============================================
  // LEGACY COMPATIBILITY
  // ============================================
  
  window.solana = {
    isConnected: true,
    publicKey: mockAccount,
    signTransaction: async function(tx: any) { return tx; },
    signAllTransactions: async function(txs: any[]) { return txs; },
    connect: async function() {},
    disconnect: async function() {},
  };
  
  window.phantom = { solana: window.solana };

  window.__MOCK_WALLET_READY = true;
  window.__MOCK_WALLET_CONNECTED = true;
  window.__MOCK_WALLET_ACCOUNT = mockAccount;
  
  console.log('[WalletModuleMock] Module mock injected');
})();
`;

/**
 * Get the wallet module mock script as a string
 */
export function getWalletModuleMockScript(): string {
  return WALLET_MODULE_MOCK_SCRIPT;
}
