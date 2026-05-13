/**
 * Playwright Global Setup - SINGLE BROWSER SESSION
 *
 * This file runs once before all tests.
 * Configures a single browser session with mock wallet connector injected.
 *
 * For modern @solana/react-hooks API, we inject a mock wallet connector
 * that implements the Wallet Standard interface.
 */

import { FullConfig, chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Injects a mock wallet connector into the browser that works with
 * @solana/react-hooks autoDiscover() pattern.
 */
async function injectMockWalletConnector(page: any): Promise<void> {
  await page.addInitScript(() => {
    // Store connected state
    let isConnected = false;
    let currentConnector: any = null;

    // Mock wallet connector that implements Wallet Standard
    const mockConnector = {
      id: "wallet-standard:phantom",
      name: "Phantom",
      icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiB2aWV3Qm94PSIwIDAgMjU2IDI1NiI+PHBhdGggZmlsbD0iIzVGNDU2RSIgZD0iTTI0NS4yOCAxNzEuMzZsLTM2LjgtOTIuOGMtMS42LTQuMS01LjYtNi45LTEwLTYuOWgtNTUuMmMtNC40IDAtOC40IDIuOC05LjYgNi45bC0zNi44IDkyLjhjLTEuMiAzLjEuMyA2LjYgMy4zIDguNGw0Mi40IDI0LjRjMi40IDEuNCA1LjYgMS40IDgtMGw0Mi40IDI0LjRjMy4xIDEuOCA2LjYgMC4zIDguNC0zLjNsMzYuOC05Mi44Yy40LTEuMi40LTIuNSAwLTMuNnoiLz48L3N2Zz4=",
      url: "https://phantom.app",
      ready: true,
      canAutoConnect: true,
      type: "browser-extension" as const,
      features: {
        solana: {},
        "solana-sign-and-transfer-transaction": {},
      },
      accounts: [
        {
          address: "Mock1111111111111111111111111111111111111",
          publicKey: new Uint8Array(32).map((_, i) => i),
        },
      ],
      connect: async () => {
        isConnected = true;
        currentConnector = mockConnector;
        return {
          account: {
            address: "Mock1111111111111111111111111111111111111",
            publicKey: new Uint8Array(32).map((_, i) => i),
          },
          connector: mockConnector,
          status: "connected" as const,
          signTransaction: async (tx: any) => tx,
          signMessage: async (msg: any) => msg,
        };
      },
      disconnect: async () => {
        isConnected = false;
        currentConnector = null;
      },
      signTransaction: async (tx: any) => tx,
      signMessage: async (msg: any) => msg,
    };

    // Override autoDiscover to return our mock connector
    const originalAutoDiscover =
      (window as any).__SOLANA_MOCK_AUTO_DISCOVER ?? (() => [mockConnector]);
    (window as any).__SOLANA_MOCK_AUTO_DISCOVER = () => [mockConnector];

    // Expose mock state for testing
    (window as any).__MOCK_WALLET_STATE = {
      get isConnected() {
        return isConnected;
      },
      get connector() {
        return currentConnector;
      },
      connect: async () => {
        isConnected = true;
        currentConnector = mockConnector;
      },
      disconnect: async () => {
        isConnected = false;
        currentConnector = null;
      },
    };
  });
}

/**
 * Global setup function for Playwright.
 * Creates a browser context with mock wallet injected.
 */
async function globalSetup(config: FullConfig) {
  // Create browser context
  const browser = await chromium.launch({
    headless: process.env.CI ? true : false,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: undefined,
  });

  const page = await context.newPage();

  // Inject mock wallet connector before any page loads
  await injectMockWalletConnector(page);

  // Navigate to the app to initialize
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  await page.goto(baseUrl);

  // Wait for the app to load
  await page.waitForLoadState("networkidle");

  // Save storage state for reuse
  const authDir = path.join(process.cwd(), "e2e/.auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  await context.storageState({ path: path.join(authDir, "user.json") });

  // Close browser
  await browser.close();
}

export default globalSetup;
