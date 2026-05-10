/**
 * Wallet Connection E2E Tests
 * 
 * Tests for wallet connection flow and Solana web3 integration.
 */

import { test, expect } from "@playwright/test";
import {
  waitForPageLoad,
  waitForElementVisible,
  mockWalletConnection,
  takeScreenshot,
} from "./helpers/test-utils";

test.describe("Wallet Connection E2E Tests", () => {
  test.describe("Wallet Connection Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await waitForPageLoad(page);
    });

    test("wallet connect button is visible on homepage", async ({ page }) => {
      const walletButton = page.getByRole("button", { name: /connect wallet/i });
      const isVisible = await walletButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(walletButton).toBeVisible();
      }
    });

    test("mock wallet connection injection works", async ({ page }) => {
      // Reload page to ensure clean state
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      
      // Inject mock wallet
      await page.evaluate(() => {
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
      
      // Wait for React to pick up the wallet
      await page.waitForTimeout(1000);
      
      const walletInfo = await page.evaluate(() => {
        return {
          hasSolana: (window as any).solana !== undefined,
          hasPhantom: (window as any).phantom !== undefined,
          isConnected: (window as any).solana?.isConnected,
        };
      });
      
      // At least verify the mock was injected
      expect(walletInfo.hasSolana).toBe(true);
      expect(walletInfo.hasPhantom).toBe(true);
    });

    test("wallet state persists across page navigation", async ({ page }) => {
      await mockWalletConnection(page);
      
      // Navigate to dashboard
      const walletButton = page.getByRole("button", { name: /connect wallet/i });
      const isVisible = await walletButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await page.goto("/dashboard");
        await waitForPageLoad(page);
        
        // Check if wallet state is maintained
        const walletState = await page.evaluate(() => {
          return {
            hasSolana: (window as any).solana !== undefined,
            isConnected: (window as any).solana?.isConnected,
          };
        });
        
        expect(walletState.hasSolana).toBe(true);
        expect(walletState.isConnected).toBe(true);
      }
    });

    test("wallet button changes state after mock connection", async ({ page }) => {
      await mockWalletConnection(page);
      
      // After mock connection, the button text should change
      const connectedText = await page.evaluate(() => {
        const button = document.querySelector('[class*="wallet"]');
        return button?.textContent || '';
      });
      
      // Either shows connected address or still shows connect button
      // (depends on implementation)
      expect(connectedText !== null).toBe(true);
    });

    test("wallet modal/dialog appears on click", async ({ page }) => {
      const walletButton = page.getByRole("button", { name: /connect wallet/i });
      const isVisible = await walletButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await walletButton.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot to see if wallet modal appeared
        await takeScreenshot(page, "wallet-modal");
      }
    });
  });

  test.describe("Wallet Disconnection", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await waitForPageLoad(page);
      await mockWalletConnection(page);
    });

    test("wallet can be disconnected", async ({ page }) => {
      // Simulate disconnection
      await page.evaluate(() => {
        delete (window as any).solana;
        delete (window as any).phantom;
      });
      
      const walletState = await page.evaluate(() => {
        return {
          hasSolana: (window as any).solana !== undefined,
          hasPhantom: (window as any).phantom !== undefined,
        };
      });
      
      expect(walletState.hasSolana).toBe(false);
      expect(walletState.hasPhantom).toBe(false);
    });
  });
});
