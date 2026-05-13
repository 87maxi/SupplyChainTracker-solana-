
import { test as base, expect as baseExpect } from "@playwright/test";

/**
 * @deprecated Use base test directly. Wallet mocking is now handled by MockWalletAdapter.
 */
export const test = base;

/**
 * @deprecated Use base expect directly.
 */
export const expect = baseExpect;
