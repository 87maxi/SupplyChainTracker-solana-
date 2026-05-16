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
 * 5. Exports storageState for tests to use (cookies + localStorage)
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
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ES Module polyfills for __dirname (Playwright transforms to ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Storage state interface for Playwright.
 */
interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

/**
 * Global setup function for Playwright.
 * Injects mock wallet via addInitScript before any page loads.
 * Exports storage state for tests to persist browser state between runs.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3001";
  const origin = new URL(baseURL).origin;
  
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

  // Navigate to the app to initialize localStorage with wallet state
  // This creates the solana:last-connector entry that tests expect
  try {
    await page.goto(baseURL);
    await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    
    // Wait for React to hydrate
    await page.waitForTimeout(2000);
    
    console.log("[GlobalSetup] App loaded, capturing storage state");
  } catch (error) {
    console.warn("[GlobalSetup] Could not navigate to app:", error);
    // Continue with empty state - tests should still work with mock wallet
  }

  // Capture the storage state (cookies + localStorage)
  const storageState = await context.storageState();
  
  // Ensure the state has the expected structure
  const stateToSave: StorageState = {
    cookies: storageState.cookies || [],
    origins: storageState.origins || [],
  };

  // Ensure we have at least the origin entry
  if (stateToSave.origins.length === 0) {
    stateToSave.origins.push({
      origin: origin,
      localStorage: [
        {
          name: "solana:last-connector",
          value: JSON.stringify({
            autoconnect: false,
            commitment: "confirmed",
            endpoint: "http://localhost:8899",
            lastConnectorId: null,
            lastPublicKey: null,
            version: 1,
            websocketEndpoint: "wss://api.localnet.solana.com",
          }),
        },
      ],
    });
  }

  // Write storage state to file for tests to use
  const authDir = path.join(__dirname, "..", ".auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const authFile = path.join(authDir, "user.json");
  fs.writeFileSync(authFile, JSON.stringify(stateToSave, null, 2));
  console.log(`[GlobalSetup] Storage state saved to ${authFile}`);

  await browser.close();
}

export default globalSetup;
