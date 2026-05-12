/**
 * Playwright Test Setup - DEPRECATED
 *
 * ⚠️ DEPRECATED: This file is no longer needed for wallet mocking.
 *
 * The wallet mocking is now handled by MockWalletAdapter in wallet-provider.tsx
 * when NEXT_PUBLIC_TEST_MODE=true. This file is kept for backward compatibility
 * but simply re-exports the base Playwright test.
 *
 * The old approach of injecting window.solana via page.addInitScript() has been
 * replaced with a proper WalletAdapter implementation.
 *
 * @see web/src/lib/solana/mock-wallet-adapter.ts
 * @see web/src/lib/solana/wallet-provider.tsx
 */

import { test as base, expect as baseExpect } from "@playwright/test";

/**
 * @deprecated Use base test directly. Wallet mocking is now handled by MockWalletAdapter.
 */
export const test = base;

/**
 * @deprecated Use base expect directly.
 */
export const expect = baseExpect;
