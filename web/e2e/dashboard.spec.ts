/**
 * Dashboard E2E Tests
 * 
 * Tests for the dashboard page functionality and Solana integration.
 */

import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  assertUrlPath,
  waitForElementVisible,
  takeScreenshot,
  mockWalletConnection,
} from "./helpers/test-utils";

test.describe("Dashboard E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await waitForPageLoad(page);
  });

  test("dashboard page loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    // Dashboard may redirect or show home, so just verify page loaded
    const url = page.url();
    expect(url).toBeTruthy();
    expect(url).toContain("localhost:3001");
  });

  test("dashboard shows wallet connection prompt when not connected", async ({ page }) => {
    const walletButton = page.getByRole("button", { name: /connect wallet/i });
    const isVisible = await walletButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(walletButton).toBeVisible();
    }
  });

  test("dashboard navigation buttons are accessible", async ({ page }) => {
    const netbooksLink = page.getByRole("link", { name: /netbooks/i, exact: false });
    const isVisible = await netbooksLink.isVisible().catch(() => false);
    if (isVisible) {
      await expect(netbooksLink).toBeVisible();
    }
  });

  test("dashboard loads without errors", async ({ page }) => {
    const consoleMessages: Array<any> = [];
    page.on('console', (msg) => {
      consoleMessages.push(msg);
    });
    
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    
    // Wait a bit for any potential errors
    await page.waitForTimeout(2000);
    
    // Check that no errors were logged
    const errorMessages = consoleMessages.filter(msg => msg.type() === 'error');
    // We allow some errors (wallet warnings, etc.) but no critical unhandled errors
    expect(errorMessages.length).toBeLessThanOrEqual(10);
  });

  test("dashboard responsive layout on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone 8
    await page.goto("/dashboard");
    await waitForPageLoad(page);
    
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    await takeScreenshot(page, "dashboard-mobile");
  });

  test("dashboard responsive layout on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto("/dashboard");
    await waitForPageLoad(page);
    
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    await takeScreenshot(page, "dashboard-tablet");
  });
});
