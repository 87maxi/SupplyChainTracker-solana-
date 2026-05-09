/**
 * Shared Initialization Module
 *
 * Provides coordinated initialization for parallel test execution.
 * Uses an in-memory Promise-based lock to ensure only one test file
 * performs the fund+initialize sequence, while others wait.
 *
 * This solves #178: Shared initialization para tests en paralelo (P0)
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import { Keypair } from "@solana/web3.js";

// Module-level singleton state
let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Shared initialization for parallel test execution.
 *
 * Ensures that only one test file performs the fund+initialize sequence.
 * Other test files will wait for the initialization to complete.
 *
 * @param program - Anchor program instance
 * @param provider - Anchor provider
 * @param funder - Keypair to fund the deployer PDA
 * @param amount - Amount of lamports to fund (default: 20 SOL for parallel tests)
 */
export async function sharedInit(
  program: Program<ScSolana>,
  provider: anchor.AnchorProvider,
  funder: Keypair,
  amount: number = 20 * anchor.web3.LAMPORTS_PER_SOL
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
      await fundAndInitialize(program, provider, funder, amount);
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
 * @param connection - Solana connection
 * @param accounts - Array of keypairs or public keys to fund
 * @param amount - Amount of lamports per account (default: 5 SOL)
 */
export async function fundAccounts(
  connection: anchor.web3.Connection,
  accounts: (Keypair | anchor.web3.PublicKey)[],
  amount: number = 5 * anchor.web3.LAMPORTS_PER_SOL
): Promise<void> {
  const promises = accounts.map(async (account) => {
    const pubkey = account instanceof Keypair ? account.publicKey : account;

    // Check if account already has sufficient balance
    const balance = await connection.getBalance(pubkey);
    if (balance >= amount) {
      return;
    }

    const needed = amount - balance;
    const sig = await connection.requestAirdrop(pubkey, needed);
    await connection.confirmTransaction(sig, "confirmed");
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
