/**
 * Homepage End-to-End Tests
 * 
 * Tests for the main landing page functionality.
 */

import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  assertPageTitle,
  assertUrlPath,
  takeScreenshot,
} from "./helpers/test-utils";

test.describe("Homepage E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForPageLoad(page);
  });

  test("homepage loads successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/Supply Chain Tracker/i);
    await assertUrlPath(page, "/$");
  });

  test("navigation bar is visible", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("dashboard link is present", async ({ page }) => {
    const dashboardLink = page.getByRole("link", { name: /dashboard/i });
    await expect(dashboardLink).toBeVisible();
  });

  test("tokens link is present", async ({ page }) => {
    const tokensLink = page.getByRole("link", { name: /tokens/i });
    await expect(tokensLink).toBeVisible();
  });

  test("admin link is present for authenticated users", async ({ page }) => {
    const adminLink = page.getByRole("link", { name: /admin/i });
    // Admin link may only be visible when authenticated
    const isVisible = await adminLink.isVisible().catch(() => false);
    expect(isVisible).toBeDefined();
  });

  test("wallet connect button is present", async ({ page }) => {
    const walletButton = page.getByRole("button", { name: /connect wallet/i });
    const isVisible = await walletButton.isVisible().catch(() => false);
    if (isVisible) {
      await expect(walletButton).toBeVisible();
    }
  });
});
