/**
 * Wallet Middleware - Re-exports from wallet-fixture
 * 
 * This module re-exports the test fixtures from wallet-fixture.ts
 * which provides mock wallet injection via addInitScript.
 * 
 * The mock wallet correctly implements the Wallet Standard protocol
 * by listening for 'wallet-standard:register-wallet' events and
 * registering itself via callback.register(wallet).
 * 
 * @see ./wallet-fixture.ts
 * @see ./mock-wallet-injection.ts
 */

export { test, expect, verifyMockWallet, getMockWalletState, connectMockWallet } from "./wallet-fixture";
