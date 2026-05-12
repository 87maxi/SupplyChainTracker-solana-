/**
 * Playwright Fixtures with Solana Test Validator Context
 *
 * Extends the base Playwright test fixtures to include the IntegrationService
 * for real blockchain operations. These fixtures provide:
 * - integration: IntegrationService instance connected to test validator
 * - withBlockchain: Test hook that initializes the blockchain before tests
 *
 * Usage:
 *   import { test, expect } from "./validator-fixtures";
 *
 *   test("register netbook", async ({ page, integration }) => {
 *     await integration.initialize();
 *     await integration.grantAllRoles();
 *     const tx = await integration.registerNetbook("NB-001", "BATCH-001", "Model-X");
 *     expect(tx).toBeTruthy();
 *   });
 */

/* eslint-disable react-hooks/rules-of-hooks, no-empty-pattern */

import { test as base } from "@playwright/test";
import {
  IntegrationService,
  IntegrationServiceOptions,
} from "../services/integration-service";
import {
  mockWalletConnection,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from "../helpers/test-utils";

/**
 * Extended fixture type that includes blockchain integration
 */
export interface TestFixtures {
  /** Integration service for blockchain operations */
  integration: IntegrationService;
  /** Initialize blockchain before each test */
  withBlockchain: () => Promise<void>;
  /** Mock wallet connection helper */
  mockWallet: () => Promise<void>;
}

/**
 * Test fixture with Solana test validator integration.
 *
 * The integration service is lazily initialized on first use to avoid
 * startup costs when tests don't need blockchain operations.
 */
export const test = base.extend<TestFixtures>({
  /**
   * Integration service instance - shared across tests in the same file.
   * Connects to the Solana test validator at the configured RPC URL.
   */
  integration: async ({}, use) => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8899";
    const programId = process.env.NEXT_PUBLIC_PROGRAM_ID || "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb";

    const options: IntegrationServiceOptions = {
      rpcUrl,
      programId,
      commitment: "confirmed",
      airdropAmount: 10, // 10 SOL per account for integration tests
    };

    const service = new IntegrationService(options);
    await use(service);
  },

  /**
   * Hook that initializes the blockchain before each test.
   * Funds accounts, deploys config, and grants roles.
   */
  withBlockchain: async ({ integration }, use) => {
    await use(async () => {
      await integration.initialize();
      await integration.grantAllRoles();
    });
  },

  /**
   * Mock wallet connection helper for UI tests.
   */
  mockWallet: async ({ page }, use) => {
    await mockWalletConnection(page);
    await use(() => mockWalletConnection(page));
  },
});

export { expect } from "@playwright/test";

/**
 * Helper to setup test environment (call manually in tests)
 */
export async function setupTestEnv(page: Parameters<typeof setupTestEnvironment>[0]): Promise<void> {
  await setupTestEnvironment(page as any);
}

/**
 * Helper to cleanup test environment (call manually in tests)
 */
export async function cleanupTestEnv(page: Parameters<typeof cleanupTestEnvironment>[0]): Promise<void> {
  await cleanupTestEnvironment(page as any);
}
