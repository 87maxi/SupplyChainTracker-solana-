/**
 * Mock Wallet Injection for Playwright E2E Tests
 * 
 * This module provides a mock wallet that correctly implements the Wallet Standard
 * protocol, allowing @solana/client's autoDiscover() to find and use it.
 * 
 * ## How it works
 * 
 * 1. The script is injected via addInitScript BEFORE any page loads
 * 2. It listens for 'wallet-standard:register-wallet' event dispatched by getWallets()
 * 3. When the event fires, it registers the mock wallet via callback.register()
 * 4. autoDiscover() then finds the wallet via getWallets().get()
 * 5. @solana/react-hooks can then use the wallet for connection
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

/**
 * Mock wallet account implementing Wallet Standard interface
 */
interface MockAccount {
  address: string;
  publicKey: Uint8Array;
  signer?: (transaction: Uint8Array) => Promise<Uint8Array>;
}

/**
 * Mock wallet connector implementing Wallet Standard interface
 * @see https://github.com/wallet-standard/wallet-standard
 */
interface MockWallet {
  id: string;
  name: string;
  icon: string;
  ready: boolean;
  version: string;
  account: () => MockAccount;
  features: {
    'wallet-standard': {
      appName: string;
      appUrl: string;
      appIcon?: string;
      version: string;
    };
    'solana-wallet': {
      solana: Record<string, never>;
    };
  };
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => () => void;
  off: (event: string, listener: (...args: unknown[]) => void) => void;
}

/**
 * Mock wallet instance
 */
let connected = false;
let currentAccount: MockAccount | null = null;

const MOCK_ACCOUNT_ADDRESS = 'MockWallet1111111111111111111111111111111';
const MOCK_PUBLIC_KEY = new Uint8Array(32).fill(0x42);

const mockWallet: MockWallet = {
  id: 'playwright-mock-wallet',
  name: 'Playwright Mock Wallet',
  icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzVGNDU2RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=',
  ready: true,
  version: '1.0.0',
  
  account: () => {
    if (!currentAccount) {
      throw new Error('Wallet not connected');
    }
    return currentAccount;
  },
  
  features: {
    'wallet-standard': {
      appName: 'SupplyChainTracker',
      appUrl: 'https://supplychain.tracker',
      version: '1.0.0',
    },
    'solana-wallet': {
      solana: {},
    },
  },
  
  connect: async () => {
    connected = true;
    currentAccount = {
      address: MOCK_ACCOUNT_ADDRESS,
      publicKey: MOCK_PUBLIC_KEY,
    };
    window.dispatchEvent(new CustomEvent('walletconnect', { detail: currentAccount }));
  },
  
  disconnect: async () => {
    connected = false;
    currentAccount = null;
    window.dispatchEvent(new CustomEvent('walletdisconnect'));
  },
  
  on: (_event: string, _listener: (...args: unknown[]) => void) => {
    // No-op for now, but required by interface
    return () => {};
  },
  
  off: (_event: string, _listener: (...args: unknown[]) => void) => {
    // No-op for now, but required by interface
    return () => {};
  },
};

/**
 * Mock wallet injection script that correctly implements Wallet Standard protocol.
 * 
 * This script:
 * 1. Listens for 'wallet-standard:register-wallet' event
 * 2. Registers the mock wallet when the event fires
 * 3. Exposes state for test verification
 */
export const MOCK_WALLET_INJECTION_SCRIPT = `
(function() {
  'use strict';
  
  // Prevent double injection
  if (window.__PLAYWRIGHT_MOCK_WALLET_INJECTED) {
    return;
  }
  window.__PLAYWRIGHT_MOCK_WALLET_INJECTED = true;
  
  var MOCK_ACCOUNT_ADDRESS = '${MOCK_ACCOUNT_ADDRESS}';
  var MOCK_PUBLIC_KEY = new Uint8Array(32).fill(0x42);
  var connected = false;
  var currentAccount = null;
  
  // Mock state exposed for test verification
  window.__MOCK_WALLET_STATE = {
    get connected() { return connected; },
    get address() { return currentAccount ? currentAccount.address : null; },
  };
  
  // Create mock wallet BEFORE any other code runs
  var mockWallet = {
    id: 'playwright-mock-wallet',
    name: 'Playwright Mock Wallet',
    icon: 'data:image/svg+xml;base64,PHN2Zw==',
    ready: true,
    version: '1.0.0',
    account: function() {
      if (!currentAccount) throw new Error('Wallet not connected');
      return currentAccount;
    },
    features: {
      'wallet-standard': {
        appName: 'SupplyChainTracker',
        appUrl: 'https://supplychain.tracker',
        version: '1.0.0',
      },
      'solana-wallet': {
        solana: {},
      },
    },
    connect: function() {
      connected = true;
      currentAccount = {
        address: MOCK_ACCOUNT_ADDRESS,
        publicKey: MOCK_PUBLIC_KEY,
      };
      window.dispatchEvent(new CustomEvent('walletconnect', { detail: currentAccount }));
      return Promise.resolve();
    },
    disconnect: function() {
      connected = false;
      currentAccount = null;
      window.dispatchEvent(new CustomEvent('walletdisconnect'));
      return Promise.resolve();
    },
    on: function() { return function() {}; },
    off: function() { return function() {}; },
  };
  
  // INTERCEPT: Override getWallets on window if it exists
  // This handles the case where @wallet-standard/app has already been loaded
  var originalGetWallets = window.getWallets;
  var walletsRegistered = [mockWallet];
  
  window.getWallets = function() {
    if (originalGetWallets) {
      var result = originalGetWallets.call(window);
      // Add our mock wallet to the registered wallets
      try {
        if (result && result.register) {
          result.register(mockWallet);
        }
      } catch(e) { /* ignore */ }
      return result;
    }
    
    // If no original getWallets, provide our own implementation
    var registered = [mockWallet];
    var listeners = { register: [], unregister: [] };
    
    return Object.freeze({
      register: function() {
        var ws = arguments;
        for (var i = 0; i < ws.length; i++) {
          registered.push(ws[i]);
        }
        return function unregister() {
          for (var j = 0; j < ws.length; j++) {
            var idx = registered.indexOf(ws[j]);
            if (idx > -1) registered.splice(idx, 1);
          }
        };
      },
      get: function() {
        return registered;
      },
      on: function(event, listener) {
        (listeners[event] = listeners[event] || []).push(listener);
        return function off() {
          var idx = listeners[event].indexOf(listener);
          if (idx > -1) listeners[event].splice(idx, 1);
        };
      }
    });
  };
  
  // INTERCEPT: Override window.dispatchEvent to detect wallet-standard:app-ready
  // When @wallet-standard/app dispatches this event, we need to register immediately
  var originalDispatchEvent = window.dispatchEvent.bind(window);
  window.dispatchEvent = function(event) {
    if (event && event.type === 'wallet-standard:app-ready') {
      // Get the API from the event detail
      var api = event.detail;
      if (api && api.register) {
        try {
          api.register(mockWallet);
          console.log('[MockWallet] Auto-registered via app-ready interception');
        } catch(e) { /* ignore */ }
      }
    }
    return originalDispatchEvent(event);
  };
  
  // Listen for Wallet Standard registration event (backup method)
  window.addEventListener('wallet-standard:register-wallet', function(event) {
    var callback = event && event.detail;
    if (callback && typeof callback.register === 'function') {
      try {
        callback.register(mockWallet);
        console.log('[MockWallet] Registered via wallet-standard:register-wallet');
      } catch(e) { /* ignore */ }
    }
  });
  
  // Also expose legacy interfaces for compatibility
  window.solana = {
    isConnected: true,
    publicKey: { toString: function() { return MOCK_ACCOUNT_ADDRESS; } },
    signTransaction: function(tx) { return Promise.resolve(tx); },
    signAllTransactions: function(txs) { return Promise.resolve(txs); },
    connect: mockWallet.connect,
    disconnect: mockWallet.disconnect,
    on: function() {},
    off: function() {},
  };
  
  window.phantom = {
    solana: window.solana,
    isPhantom: true,
  };
  
  console.log('[MockWallet] Injection complete - ready for autoDiscover');
})();
`;

/**
 * Creates a Playwright fixture that injects the mock wallet before each test.
 * 
 * @returns Playwright test fixture with mock wallet support
 */
export function createMockWalletFixture() {
  return {
    script: MOCK_WALLET_INJECTION_SCRIPT,
    /**
     * Verify that the mock wallet was properly injected.
     */
    verifyInjection: async (page: { evaluate: (arg0: () => boolean) => any }): Promise<boolean> => {
      return await page.evaluate(() => {
        return !!(window as Record<string, unknown>).solana ||
               !!(window as Record<string, unknown>).phantom;
      });
    },
    /**
     * Get the mock wallet connection state.
     */
    getConnectedState: async (page: { evaluate: <T = unknown>(arg0: () => T) => T }): Promise<boolean> => {
      return await page.evaluate(() => {
        const state = (window as Record<string, unknown>).__MOCK_WALLET_STATE;
        return state && state.connected;
      });
    },
    /**
     * Connect the mock wallet.
     */
    connect: async (page: { evaluate: <T = unknown>(arg0: () => T) => T }): Promise<void> => {
      await page.evaluate(() => {
        const wallet = (window as Record<string, unknown>).solana;
        if (wallet && wallet.connect) {
          return wallet.connect();
        }
      });
    },
  };
}
