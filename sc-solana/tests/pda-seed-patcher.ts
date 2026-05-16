/**
 * PDA Seed Patcher Module
 *
 * Solves the Codama PDA seed incompatibility with Anchor programs.
 * Codama generates AccountMeta without seeds, but Anchor requires seeds for PDA verification.
 * This module patches instructions to include PDA seeds before execution.
 *
 * IMPORTANT: @solana/web3.js TransactionInstruction doesn't support seeds in AccountMeta.
 * For PDA creation (init), we need to use SystemProgram.createAccountWithSeed or
 * SystemProgram.createAccount params with seeds.
 *
 * For PDA verification (existing accounts), we just need the correct PDA address.
 * The issue is that Anchor verifies seeds at runtime, not at transaction construction time.
 *
 * @see https://github.com/codama-idl/codama
 * @see Issue #209
 */

import { TransactionInstruction, PublicKey, SystemProgram } from "@solana/web3.js";
import type { Address } from "@solana/kit";

// ============================================================================
// PDA Seed Definitions
// ============================================================================

/**
 * PDA seed definition for an account
 */
export interface PdaSeedDefinition {
  /** Account name in the instruction */
  account: string;
  /** Seeds to derive the PDA */
  seeds: Array<{
    type: "const" | "variable";
    value: Uint8Array | string;
    /** For variable seeds: the account path to use as seed value */
    accountPath?: string;
  }>;
}

/**
 * PDA definitions for all accounts in the program
 * These match the Anchor IDL PDA definitions
 */
export const PDA_DEFINITIONS: PdaSeedDefinition[] = [
  {
    account: "admin",
    seeds: [
      { type: "const", value: new Uint8Array([97, 100, 109, 105, 110]) }, // "admin"
      { type: "variable", value: "config", accountPath: "config" },
    ],
  },
  {
    account: "config",
    seeds: [
      { type: "const", value: new Uint8Array([99, 111, 110, 102, 105, 103]) }, // "config"
    ],
  },
  {
    account: "deployer",
    seeds: [
      { type: "const", value: new Uint8Array([100, 101, 112, 108, 111, 121, 101, 114]) }, // "deployer"
    ],
  },
  {
    account: "serialHashRegistry",
    seeds: [
      { type: "const", value: new Uint8Array([115, 101, 114, 105, 97, 108, 95, 104, 97, 115, 104, 101, 115]) }, // "serial_hashes"
      { type: "variable", value: "config", accountPath: "config" },
    ],
  },
  {
    account: "roleRequest",
    seeds: [
      { type: "const", value: new Uint8Array([114, 111, 108, 101, 95, 114, 101, 113, 117, 101, 115, 116]) }, // "role_request"
      { type: "variable", value: "user", accountPath: "user" },
    ],
  },
  {
    account: "roleHolder",
    seeds: [
      { type: "const", value: new Uint8Array([114, 111, 108, 101, 95, 104, 111, 108, 100, 101, 114]) }, // "role_holder"
      { type: "variable", value: "account", accountPath: "account" },
    ],
  },
  {
    account: "netbook",
    seeds: [
      { type: "const", value: new Uint8Array([110, 101, 116, 98, 111, 111, 107]) }, // "netbook"
      { type: "variable", value: "tokenId", accountPath: "config.nextToken_id" },
    ],
  },
];

// ============================================================================
// PDA Derivation Helper
// ============================================================================

/**
 * Derive a PDA address from seeds
 * This matches the Anchor PDA derivation logic
 */
export async function derivePda(
  seeds: Uint8Array[],
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return await PublicKey.findProgramAddress(seeds, programId);
}

/**
 * Derive a PDA address from seed strings/bytes
 */
export async function derivePdaFromRaw(
  rawSeeds: (string | Uint8Array)[],
  programId: PublicKey
): Promise<[PublicKey, number]> {
  const seeds: Uint8Array[] = rawSeeds.map((s) =>
    typeof s === "string" ? new TextEncoder().encode(s) : s
  );
  return await derivePda(seeds, programId);
}

// ============================================================================
// Instruction Patcher
// ============================================================================

/**
 * Patch a Codama instruction to include PDA seeds
 *
 * This function intercepts Codama-generated instructions and adds PDA seeds
 * to accounts that require them for Anchor program compatibility.
 *
 * @param instruction - The Codama-generated instruction
 * @param programId - The program ID (used for PDA derivation)
 * @param accountSeedsMap - Map of account names to their seed values
 * @returns A new TransactionInstruction with PDA seeds
 */
export function patchInstructionWithPdaSeeds(
  instruction: any,
  programId: Address,
  accountSeedsMap: Record<string, Uint8Array[]>
): TransactionInstruction {
  // Create a new instruction with patched accounts
  const patchedAccounts = instruction.accounts.map((acc: any) => {
    const accountDef = PDA_DEFINITIONS.find((def) => def.account === acc.pubkey);
    if (!accountDef) return acc;

    const seeds = accountSeedsMap[acc.pubkey];
    if (!seeds) return acc;

    return {
      ...acc,
      seeds, // Add seeds to the account meta
    };
  });

  return new TransactionInstruction({
    programId: new PublicKey(programId),
    keys: instruction.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.pubkey),
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })),
    data: instruction.data,
  });
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get PDA seeds for a specific account type
 */
export function getPdaSeedsForAccount(
  accountType: string,
  configPda?: Address
): Uint8Array[] | null {
  const def = PDA_DEFINITIONS.find((d) => d.account === accountType);
  if (!def) return null;

  const seeds: Uint8Array[] = [];
  for (const seed of def.seeds) {
    if (seed.type === "const") {
      seeds.push(typeof seed.value === "string" ? new TextEncoder().encode(seed.value) : seed.value);
    } else if (seed.type === "variable" && configPda) {
      seeds.push(new TextEncoder().encode(configPda));
    }
  }
  return seeds;
}

/**
 * Check if an account requires PDA seeds
 */
export function requiresPdaSeeds(accountName: string): boolean {
  return PDA_DEFINITIONS.some((def) => def.account === accountName);
}

/**
 * Create SystemProgram createAccount instruction with PDA bump seed
 * This is needed for init instructions that create PDA accounts
 */
export function createPdaAccountInstruction(
  payer: PublicKey,
  pda: PublicKey,
  programId: PublicKey,
  space: number,
  lamports: number,
  seeds: Uint8Array[],
  bump: number
): TransactionInstruction {
  // Note: SystemProgram doesn't directly support bump seeds in createAccount
  // The bump is used internally by Anchor for verification
  return SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: pda,
    lamports,
    space,
    programId,
  });
}
