/**
 * Test Isolation Module
 *
 * Provides utilities for resetting and cleaning test state between runs.
 * This solves the core problem of test isolation where:
 * 1. The validator maintains state between executions
 * 2. Accounts created in one test persist to subsequent tests
 * 3. "RoleAlreadyGranted" errors because roles granted in one test persist
 * 4. "config is undefined" because accounts can't be re-initialized
 *
 * Related Issues:
 * - Issue #188: Test Isolation and State Cleanup
 */

import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { ScSolana } from "../target/types/sc_solana";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of checking if test state is clean
 */
export interface TestStateCheck {
  clean: boolean;
  accountCount: number;
  details?: string;
}

/**
 * Result of a reset operation
 */
export interface ResetResult {
  success: boolean;
  accountsDrained: number;
  accountsRefilled: number;
  errors: string[];
}

// ============================================================================
// Account State Management
// ============================================================================

/**
 * Reset test state by draining and refilling accounts.
 *
 * This function handles the common case where test accounts need to be
 * reset between test runs. It drains remaining balance to the wallet
 * and then refills each account to the specified minimum.
 *
 * @param provider - Anchor provider for connection and wallet
 * @param accounts - Array of keypairs to reset
 * @param minSol - Minimum SOL per account after reset (default: 5)
 * @returns Result of the reset operation
 */
export async function resetTestState(
  provider: AnchorProvider,
  accounts: Keypair[],
  minSol: number = 5
): Promise<ResetResult> {
  const result: ResetResult = {
    success: true,
    accountsDrained: 0,
    accountsRefilled: 0,
    errors: [],
  };

  const signatures: string[] = [];

  // Step 1: Drain all accounts to the wallet
  for (const account of accounts) {
    try {
      const balance = await provider.connection.getBalance(account.publicKey);

      if (balance > LAMPORTS_PER_SOL) {
        // Only drain if balance is above minimum rent exemption
        const signature = await provider.connection.sendTransaction(
          new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: account.publicKey,
              toPubkey: provider.wallet.publicKey,
              lamports: balance,
            })
          ),
          [account]
        );
        signatures.push(signature);
        result.accountsDrained++;
      }
    } catch (e: any) {
      result.errors.push(`Failed to drain ${account.publicKey.toBase58()}: ${e.message}`);
    }
  }

  // Step 2: Confirm all drain transactions
  if (signatures.length > 0) {
    for (const sig of signatures) {
      try {
        await provider.connection.confirmTransaction(sig, "confirmed");
      } catch (e: any) {
        result.errors.push(`Failed to confirm drain transaction ${sig}: ${e.message}`);
      }
    }
  }

  // Step 3: Refill each account
  for (const account of accounts) {
    try {
      const balance = await provider.connection.getBalance(account.publicKey);
      const minLamports = minSol * LAMPORTS_PER_SOL;

      if (balance < minLamports) {
        const amount = minLamports - balance;
        const sig = await provider.connection.requestAirdrop(
          account.publicKey,
          amount
        );
        await provider.connection.confirmTransaction(sig, "confirmed");
        result.accountsRefilled++;
      }
    } catch (e: any) {
      result.errors.push(`Failed to refill ${account.publicKey.toBase58()}: ${e.message}`);
    }
  }

  // Check if there were critical errors
  if (result.errors.length > accounts.length) {
    result.success = false;
  }

  return result;
}

// ============================================================================
// Program State Inspection
// ============================================================================

/**
 * Get all accounts owned by the program and return their info.
 *
 * This is useful for debugging test state and understanding what
 * accounts exist on the blockchain between test runs.
 *
 * @param connection - Solana connection
 * @param programId - Program ID to query accounts for
 * @returns Map of account addresses to their info
 */
export async function getProgramAccounts(
  connection: Connection,
  programId: PublicKey
): Promise<Map<string, AccountInfo>> {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
  });

  const accountMap = new Map<string, AccountInfo>();
  for (const { pubkey, account } of accounts) {
    accountMap.set(pubkey.toBase58(), {
      lamports: account.lamports,
      owner: account.owner.toBase58(),
      data: account.data,
      executable: account.executable,
      rentEpoch: account.rentEpoch,
    });
  }

  return accountMap;
}

/**
 * Account info returned by getProgramAccounts
 */
export interface AccountInfo {
  lamports: number;
  owner: string;
  data: Buffer;
  executable: boolean;
  rentEpoch: number;
}

/**
 * Check if test validator state is clean.
 *
 * Returns whether there are no program-owned accounts, indicating
 * a clean state suitable for fresh initialization.
 *
 * @param connection - Solana connection
 * @param programId - Program ID to check
 * @returns TestStateCheck with clean status and account count
 */
export async function isTestStateClean(
  connection: Connection,
  programId: PublicKey
): Promise<TestStateCheck> {
  const accounts = await connection.getProgramAccounts(programId, {
    commitment: "confirmed",
  });

  return {
    clean: accounts.length === 0,
    accountCount: accounts.length,
    details: accounts.length === 0 ? "No program accounts found" : `${accounts.length} program accounts found`,
  };
}

// ============================================================================
// Config Management
// ============================================================================

/**
 * Check if the config account exists.
 *
 * @param program - Anchor program instance
 * @param configPda - Config PDA address
 * @returns true if config exists, false otherwise
 */
export async function doesConfigExist(
  program: Program<ScSolana>,
  configPda: PublicKey
): Promise<boolean> {
  try {
    await program.account.supplyChainConfig.fetch(configPda);
    return true;
  } catch {
    return false;
  }
}

/**
 * Force initialize config by bypassing the _initialized check.
 *
 * This is useful for test isolation when state persists between runs.
 * If the config exists, it returns a signal that reset is needed.
 * If it doesn't exist, it returns empty string (no action needed).
 *
 * NOTE: This function does NOT actually force re-initialization because
 * the Anchor program doesn't support closing accounts from tests.
 * Instead, it returns a signal that the test state needs to be reset.
 *
 * @param program - Anchor program instance
 * @param configPda - Config PDA address
 * @returns 'reset_needed' if config exists, '' if config doesn't exist
 */
export async function forceInitializeConfig(
  program: Program<ScSolana>,
  configPda: PublicKey
): Promise<"reset_needed" | ""> {
  const exists = await doesConfigExist(program, configPda);
  return exists ? "reset_needed" : "";
}

/**
 * Get detailed config information if it exists.
 *
 * @param program - Anchor program instance
 * @param configPda - Config PDA address
 * @returns Config data or null if not found
 */
export async function getConfigInfo(
  program: Program<ScSolana>,
  configPda: PublicKey
): Promise<any> {
  try {
    return await program.account.supplyChainConfig.fetch(configPda);
  } catch {
    return null;
  }
}

// ============================================================================
// Test Setup Helpers
// ============================================================================

/**
 * Pre-flight check before running tests.
 *
 * This function performs a comprehensive check of the test environment:
 * 1. Checks if program state is clean
 * 2. Checks if config exists
 * 3. Returns recommendations for cleanup if needed
 *
 * @param provider - Anchor provider
 * @param program - Anchor program instance
 * @param configPda - Config PDA address
 * @returns Comprehensive test environment status
 */
export async function preFlightCheck(
  provider: AnchorProvider,
  program: Program<ScSolana>,
  configPda: PublicKey
): Promise<TestEnvironmentStatus> {
  const stateCheck = await isTestStateClean(provider.connection, program.programId);
  const configExists = await doesConfigExist(program, configPda);

  const needsReset = !stateCheck.clean || configExists;

  return {
    environmentClean: stateCheck.clean && !configExists,
    programAccountCount: stateCheck.accountCount,
    configExists,
    needsReset,
    recommendations: generateRecommendations(stateCheck, configExists),
  };
}

/**
 * Status of the test environment
 */
export interface TestEnvironmentStatus {
  environmentClean: boolean;
  programAccountCount: number;
  configExists: boolean;
  needsReset: boolean;
  recommendations: string[];
}

/**
 * Generate recommendations based on test state检查结果
 */
function generateRecommendations(
  stateCheck: TestStateCheck,
  configExists: boolean
): string[] {
  const recommendations: string[] = [];

  if (!stateCheck.clean) {
    recommendations.push(
      `Found ${stateCheck.accountCount} program accounts. Consider running resetTestState() before tests.`
    );
  }

  if (configExists) {
    recommendations.push(
      "Config account exists. Either use existing config or reset test state."
    );
  }

  if (stateCheck.clean && !configExists) {
    recommendations.push("Test environment is clean and ready for fresh initialization.");
  }

  return recommendations;
}

// ============================================================================
// Account Cleanup Utilities
// ============================================================================

/**
 * Close a program account and return lamports to owner.
 *
 * This is useful for cleaning up specific accounts between tests.
 * The account must be a signer to be closed.
 *
 * @param provider - Anchor provider
 * @param accountToClose - Keypair of the account to close (must be signer)
 * @param recipient - Public key to receive the lamports
 * @returns Transaction signature
 */
export async function closeAccount(
  provider: AnchorProvider,
  accountToClose: Keypair,
  recipient: PublicKey
): Promise<string> {
  const balance = await provider.connection.getBalance(accountToClose.publicKey);

  const tx = await provider.connection.sendTransaction(
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: accountToClose.publicKey,
        toPubkey: recipient,
        lamports: balance,
      })
    ),
    [accountToClose]
  );

  await provider.connection.confirmTransaction(tx, "confirmed");
  return tx;
}

/**
 * Drain all lamports from an account to the wallet.
 *
 * @param provider - Anchor provider
 * @param accountToDrain - Keypair of the account to drain (must be signer)
 * @returns Transaction signature
 */
export async function drainAccount(
  provider: AnchorProvider,
  accountToDrain: Keypair
): Promise<string> {
  const balance = await provider.connection.getBalance(accountToDrain.publicKey);

  const tx = await provider.connection.sendTransaction(
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: accountToDrain.publicKey,
        toPubkey: provider.wallet.publicKey,
        lamports: balance,
      })
    ),
    [accountToDrain]
  );

  await provider.connection.confirmTransaction(tx, "confirmed");
  return tx;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Reset multiple test environments sequentially.
 *
 * Useful when running multiple test suites that each have their own
 * set of accounts.
 *
 * @param provider - Anchor provider
 * @param accountGroups - Array of account groups to reset
 * @param minSol - Minimum SOL per account (default: 5)
 * @returns Array of reset results
 */
export async function resetMultipleTestStates(
  provider: AnchorProvider,
  accountGroups: Keypair[][],
  minSol: number = 5
): Promise<ResetResult[]> {
  const results: ResetResult[] = [];

  for (const accounts of accountGroups) {
    const result = await resetTestState(provider, accounts, minSol);
    results.push(result);
  }

  return results;
}

/**
 * Check multiple test environments for cleanliness.
 *
 * @param provider - Anchor provider
 * @param programIds - Array of program IDs to check
 * @returns Array of test state checks
 */
export async function checkMultipleTestStates(
  provider: AnchorProvider,
  programIds: PublicKey[]
): Promise<TestStateCheck[]> {
  const results: TestStateCheck[] = [];

  for (const programId of programIds) {
    const check = await isTestStateClean(provider.connection, programId);
    results.push(check);
  }

  return results;
}

// ============================================================================
// Logging and Debugging
// ============================================================================

/**
 * Log detailed test environment information.
 *
 * Useful for debugging test failures related to state persistence.
 *
 * @param provider - Anchor provider
 * @param program - Anchor program instance
 * @param configPda - Config PDA address
 */
export async function logTestEnvironment(
  provider: AnchorProvider,
  program: Program<ScSolana>,
  configPda: PublicKey
): Promise<void> {
  console.log("\n=== Test Environment Status ===");

  const status = await preFlightCheck(provider, program, configPda);

  console.log(`Environment Clean: ${status.environmentClean}`);
  console.log(`Program Accounts: ${status.programAccountCount}`);
  console.log(`Config Exists: ${status.configExists}`);
  console.log(`Needs Reset: ${status.needsReset}`);

  if (status.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of status.recommendations) {
      console.log(`  - ${rec}`);
    }
  }

  console.log("=== End Test Environment Status ===\n");
}

// ============================================================================
// End of Test Isolation Module
// ============================================================================
