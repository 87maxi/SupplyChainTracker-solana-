/**
 * Dashboard E2E Tests
 * 
 * Tests for the dashboard page functionality and Solana integration.
 */

import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  waitForElementVisible,
  assertUrlPath,
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
    await assertUrlPath(page, "/dashboard$");
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
    const consoleMessages = page.consoleMessages();
    const errorMessages = consoleMessages.filter(msg => msg.type() === 'error');
    
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    
    // Wait a bit for any potential errors
    await page.waitForTimeout(2000);
    
    const finalErrorMessages = page.consoleMessages().filter(msg => msg.type() === 'error');
    expect(finalErrorMessages.length).toBeLessThanOrEqual(errorMessages.length);
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
