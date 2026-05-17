/**
 * Shared Initialization Module
 *
 * Provides coordinated initialization for parallel test execution.
 * Uses an in-memory Promise-based lock to ensure only one test file
 * performs the fund+initialize sequence, while others wait.
 *
 * This solves #178: Shared initialization para tests en paralelo (P0)
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import { Keypair } from "@solana/web3.js";
import type { TestClient } from "./test-helpers";

// Module-level singleton state
let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Shared initialization for parallel test execution.
 *
 * Ensures that only one test file performs the fund+initialize sequence.
 * Other test files will wait for the initialization to complete.
 *
 * @param client - Codama test client instance
 * @param funder - Keypair to fund the deployer PDA
 * @param amount - Amount of lamports to fund (default: 20 SOL for parallel tests)
 */
export async function sharedInit(
  client: TestClient,
  funder: Keypair,
  amount: number = 20 * 1_000_000_000 // 20 SOL in lamports
): Promise<void> {
  // Already initialized, skip
  if (initialized) {
    return;
  }

  // If another test is already initializing, wait for it
  if (initPromise) {
    console.log("Shared init: Waiting for initialization in progress...");
    await initPromise;
    return;
  }

  // This test will perform the initialization
  console.log("Shared init: Performing initialization...");
  initPromise = (async () => {
    try {
      const { fundAndInitialize } = await import("./test-helpers");
      await fundAndInitialize(client, funder, amount);
      initialized = true;
      console.log("Shared init: Initialization complete");
    } finally {
      initPromise = null;
    }
  })();

  await initPromise;
}

/**
 * Fund additional accounts after shared initialization.
 * Uses airdrop from the faucet, so safe to call from multiple
 * test files in parallel.
 *
 * @param client - Codama test client instance
 * @param accounts - Array of keypairs or public keys to fund
 * @param amount - Amount of lamports per account (default: 5 SOL)
 */
export async function fundAccounts(
  client: TestClient,
  accounts: (Keypair | string)[],
  amount: number = 5 * 1_000_000_000 // 5 SOL in lamports
): Promise<void> {
  const promises = accounts.map(async (account) => {
    const pubkey = account instanceof Keypair ? account.publicKey.toBase58() : account;

    // Check if account already has sufficient balance
    const balance = await client.rpc.getBalance(pubkey).send();
    if (balance >= BigInt(amount)) {
      return;
    }

    const needed = BigInt(amount) - balance;
    // Use positional parameters: requestAirdrop(address, lamports).send()
    const sig = await client.rpc.requestAirdrop(pubkey, needed).send();
    await client.rpc.confirmTransaction({
      signature: sig,
      commitment: "confirmed",
    }).send();
  });

  await Promise.all(promises);
}

/**
 * Reset shared initialization state (for testing purposes).
 */
export function resetInit(): void {
  initPromise = null;
  initialized = false;
}
