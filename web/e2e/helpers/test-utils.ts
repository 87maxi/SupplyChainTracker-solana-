/**
 * E2E Test Helper Utilities
 * 
 * Common utilities for Playwright end-to-end tests.
 */

import { Page, expect } from "@playwright/test";

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page, timeoutMs = 10000): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: timeoutMs });
}

/**
 * Wait for specific element to be visible
 */
export async function waitForElementVisible(page: Page, selector: string, timeoutMs = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout: timeoutMs });
}

/**
 * Wait for specific element to be hidden
 */
export async function waitForElementHidden(page: Page, selector: string, timeoutMs = 5000): Promise<void> {
  await expect(page.locator(selector)).toBeHidden({ timeout: timeoutMs });
}

/**
 * Click element and wait for navigation if needed
 */
export async function clickAndWait(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  const [response] = await Promise.all([
    page.waitForNavigation({ wait: "networkidle", timeout: timeoutMs }).catch(() => null),
    page.click(selector),
  ]);
}

/**
 * Fill input field
 */
export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).fill(value);
}

/**
 * Select option from dropdown
 */
export async function selectOption(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).selectOption(value);
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ 
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Assert page title contains expected text
 */
export async function assertPageTitle(page: Page, expectedTitle: string): Promise<void> {
  await expect(page).toHaveTitle(new RegExp(expectedTitle, "i"));
}

/**
 * Assert URL contains expected path
 */
export async function assertUrlPath(page: Page, expectedPath: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(expectedPath));
}

/**
 * Wait for network request
 */
export async function waitForRequest(page: Page, urlPattern: string): Promise<void> {
  await page.waitForRequest((request) => request.url().includes(urlPattern));
}

/**
 * Wait for network response
 */
export async function waitForResponse(page: Page, urlPattern: string): Promise<void> {
  await page.waitForResponse((response) => response.url().includes(urlPattern));
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Get text content of element
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
  return await page.locator(selector).textContent();
}

/**
 * Mock wallet connection
 */
export async function mockWalletConnection(page: Page): Promise<void> {
  // Inject mock wallet into page context
  await page.addInitScript(() => {
    (window as any).solana = {
      isConnected: true,
      publicKey: { toString: () => "MockPublicKey1111111111111111111111111111111" },
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    (window as any).phantom = {
      solana: {
        isConnected: true,
        publicKey: { toString: () => "MockPublicKey1111111111111111111111111111111" },
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      },
    };
  });
}

/**
 * Setup test environment
 */
export async function setupTestEnvironment(page: Page): Promise<void> {
  await mockWalletConnection(page);
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as any).solana;
    delete (window as any).phantom;
  });
}

/**
 * Navigate to URL and wait for load
 */
export async function navigateAndWait(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await waitForPageLoad(page);
}

/**
 * Assert element contains text
 */
export async function assertElementContainsText(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * Assert element does not contain text
 */
export async function assertElementNotContainsText(page: Page, selector: string, text: string): Promise<void> {
  await expect(page.locator(selector)).not.toContainText(text);
}

/**
 * Wait for dialog
 */
export async function waitForDialog(page: Page): Promise<string> {
  const dialogPromise = page.waitForEvent("dialog");
  page.evaluate(() => alert("test"));
  const dialog = await dialogPromise;
  await dialog.accept();
  return dialog.message();
}
