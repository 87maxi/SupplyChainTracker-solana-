/**
 * Anchor Client Wrapper Module
 *
 * Solves the Codama PDA seed incompatibility with Anchor programs.
 * Codama generates AccountMeta WITHOUT PDA seeds, but Anchor programs
 * verify PDA seeds at runtime using #[account(seeds = [...], bump = ...)] constraint.
 *
 * This module provides an Anchor-based client for instructions that require PDA seeds.
 * It loads the IDL from target/idl/sc_solana.json and creates an Anchor program instance.
 *
 * Strategy:
 * - Use Codama for instructions that DON'T require PDA seeds (query instructions, etc.)
 * - Use Anchor for instructions that DO require PDA seeds (grantRole, initialize, fundDeployer, etc.)
 * - Contribute to Codama upstream for automatic PDA seed support (long-term)
 *
 * @see CODAMA-INCOMPATIBILITIES.md
 * @see Issue #209
 * @see Issue #217
 */

import * as anchor from "@coral-xyz/anchor";
import type { Keypair } from "@solana/web3.js";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import BN from "bn.js";

// Get __dirname compatible with ESM
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the Anchor client
 */
export interface AnchorClientConfig {
  /** URL of the Solana RPC endpoint */
  rpcUrl: string;
  /** Payer keypair for transactions */
  payer: Keypair;
  /** Optional: Custom commitment level (default: 'confirmed') */
  commitment?: anchor.web3.Commitment;
}

/**
 * Cached Anchor program instance
 */
interface CachedProgram {
  program: anchor.Program<any>;
  config: AnchorClientConfig;
  connection: anchor.web3.Connection;
}

// ============================================================================
// Singleton Pattern
// ============================================================================

/**
 * Singleton cache for Anchor program instances
 * One instance per RPC URL to avoid redundant initialization
 */
let cachedProgram: CachedProgram | null = null;
let lastRpcUrl: string | null = null;

/**
 * Load the IDL from the generated target/idl/sc_solana.json
 * This file is created by Anchor when the program is built
 */
function loadIdl(): any {
  // Try multiple possible locations for the IDL file
  const possiblePaths = [
    path.join(__dirname, "../target/idl/sc_solana.json"), // From sc-solana/ directory
    path.join(__dirname, "../../target/idl/sc_solana.json"), // From tests/ directory
    path.join(process.cwd(), "sc-solana/target/idl/sc_solana.json"), // From workspace root
    path.join(process.cwd(), "target/idl/sc_solana.json"), // From sc-solana/ directory
  ];

  for (const idlPath of possiblePaths) {
    try {
      if (fs.existsSync(idlPath)) {
        const idlContent = fs.readFileSync(idlPath, "utf-8");
        return JSON.parse(idlContent);
      }
    } catch {
      // Try next path
    }
  }

  throw new Error(
    "IDL file not found. Run 'anchor build' in sc-solana/ to generate the IDL."
  );
}

// ============================================================================
// Main Client Factory
// ============================================================================

/**
 * Get or create an Anchor program instance for the SupplyChainTracker
 */
export async function getAnchorClient(
  config: AnchorClientConfig
): Promise<anchor.Program<any>> {
  // Return cached instance if same RPC URL
  if (cachedProgram && cachedProgram.config.rpcUrl === config.rpcUrl) {
    return cachedProgram.program;
  }

  // Create new instance
  const connection = new anchor.web3.Connection(config.rpcUrl, config.commitment);
  const wallet = new anchor.Wallet(config.payer);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: config.commitment,
  });

  anchor.setProvider(provider);

  const idl = loadIdl();
  const programId = new PublicKey(
    "BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW"
  );

  const program = new anchor.Program(idl, programId);

  // Cache the instance with connection reference
  cachedProgram = { program, config, connection };
  lastRpcUrl = config.rpcUrl;

  return program;
}

// ============================================================================
// Instruction Execution
// ============================================================================

/**
 * Execute an Anchor instruction with PDA seed support
 * This wrapper handles the conversion of BigInt/number args to BN for Anchor compatibility
 */
export async function executeAnchorInstruction(
  program: anchor.Program<any>,
  instructionName: string,
  accounts: Record<string, any>,
  args: any[] = [],
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
    commitment?: anchor.web3.Commitment;
    payer?: Keypair;
  }
): Promise<string> {
  // Convert BigInt/number args to BN for Anchor/Borsh compatibility
  const normalizedArgs = args.map((arg) => {
    if (typeof arg === "bigint") {
      return new BN(arg.toString());
    }
    if (typeof arg === "number") {
      return new BN(arg);
    }
    return arg;
  });

  // Get the instruction method from the program
  const methods = (program as any).methods;
  let methodBuilder = methods ? methods[instructionName] : undefined;

  if (!methodBuilder) {
    // Try camelCase conversion if the exact match failed
    const camelCaseName = instructionName.replace(
      /_([a-z])/g,
      (_, letter) => letter.toUpperCase()
    );
    const altMethod = methods ? methods[camelCaseName] : undefined;
    if (altMethod) {
      return await executeAnchorInstruction(
        program,
        camelCaseName,
        accounts,
        args,
        options
      );
    }
    throw new Error(
      `Instruction '${instructionName}' not found in program. ` +
        `Available instructions: ${Object.keys(methods || {}).join(", ")}`
    );
  }

  // Build instruction using Anchor's builder API
  let builder = methodBuilder(...normalizedArgs);
  if (Object.keys(accounts).length > 0) {
    builder = builder.accounts(accounts);
  }

  // Extract account metas from the accounts object passed in
  // We need to determine mutability from the IDL instruction definition
  const idlInstruction = (program.idl as any).instructions.find(
    (i: any) =>
      i.name.toLowerCase().replace(/_/g, "") ===
      instructionName.toLowerCase().replace(/_/g, "") ||
      i.name === instructionName ||
      i.name.replace(/_/g, "") === instructionName.replace(/_/g, "")
  );

  if (!idlInstruction) {
    throw new Error(`Instruction '${instructionName}' not found in IDL`);
  }

  // Build custom instruction with explicit account metas
  const instruction = builder.instruction;
  const programId = program.programId;

  // Combine default accounts with explicit accounts
  const allAccounts: Record<string, anchor.web3.AccountMeta> = { ...instruction.keys };

  // Add any additional accounts
  for (const [key, value] of Object.entries(accounts)) {
    if (value && typeof value === "object" && "pubkey" in value) {
      const isSigner =
        "isSigner" in value
          ? (value as any).isSigner
          : idlInstruction.accounts?.find((a: any) => a.name === key)?.signer;
      const isWritable =
        "isWritable" in value
          ? (value as any).isWritable
          : idlInstruction.accounts?.find((a: any) => a.name === key)?.writable;

      allAccounts[key] = {
        pubkey: (value as any).pubkey,
        isSigner: isSigner ?? false,
        isWritable: isWritable ?? true,
      };
    }
  }

  const txInstruction = new TransactionInstruction({
    programId,
    keys: Object.values(allAccounts),
    data: instruction.data,
  });

  const transaction = new Transaction().add(txInstruction);

  const signers = options?.signers || [];
  
  // Get payer from options or fallback to provider wallet
  let payer = options?.payer;
  if (!payer) {
    const provider = (program as any).provider;
    // anchor.Wallet(keypair) stores the keypair internally
    // Try different ways to access it
    if (provider?.wallet) {
      payer = (provider.wallet as any).keypair || provider.wallet.payer;
    }
  }

  if (!payer) {
    throw new Error(
      "No payer found. Please provide a payer in options or ensure the Anchor provider is properly configured."
    );
  }

  // Get connection from cached program or use the one from config
  const connection = (cachedProgram as any)?.connection;
  if (!connection) {
    throw new Error("No connection available for transaction");
  }

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, ...signers],
    {
      skipPreflight: options?.skipPreflight ?? true,
      commitment: options?.commitment ?? "confirmed",
    }
  );

  return signature;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Grant a role using Anchor (with PDA seeds) instead of Codama
 * This is necessary because Anchor programs verify PDA seeds at runtime
 * using #[account(seeds = [...], bump = ...)] constraint.
 */
export async function grantRoleViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  role: string,
  accountToGrant: Keypair,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "grantRole", {
    config: configPda,
    admin: adminPda,
    accountToGrant: accountToGrant.publicKey,
  }, [role], {
    payer,
    signers: [accountToGrant, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Initialize the config using Anchor (with PDA seeds)
 */
export async function initializeViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  admin: Keypair,
  deployer: Keypair,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const serialHashRegistryPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("serial_hash_registry"), configPda.toBuffer()],
    client.programId
  )[0];

  const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    client.programId
  )[0];

  const deployerPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("deployer")],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "initialize", {
    config: configPda,
    serialHashRegistry: serialHashRegistryPda,
    admin: adminPda,
    deployer: deployerPda,
  }, [], {
    payer,
    signers: [admin, deployer, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Fund the deployer PDA using Anchor (with PDA seeds)
 */
export async function fundDeployerViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  amount: bigint,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const serialHashRegistryPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("serial_hash_registry"), configPda.toBuffer()],
    client.programId
  )[0];

  const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    client.programId
  )[0];

  const deployerPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("deployer")],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "fundDeployer", {
    deployer: deployerPda,
    admin: adminPda,
    config: configPda,
    serialHashRegistry: serialHashRegistryPda,
  }, [amount], {
    payer,
    signers: options?.signers,
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Request a role using Anchor (with PDA seeds)
 */
export async function requestRoleViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  role: string,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const roleRequestPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("role_request"), payer.publicKey.toBuffer()],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "requestRole", {
    config: configPda,
    roleRequest: roleRequestPda,
    user: payer.publicKey,
  }, [role], {
    payer,
    signers: [payer, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Approve a role request using Anchor (with PDA seeds)
 */
export async function approveRoleRequestViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  // Get the role request from the provider's wallet
  const roleRequestPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("role_request"), payer.publicKey.toBuffer()],
    client.programId
  )[0];

  const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    client.programId
  )[0];

  const roleHolderPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("role_holder"), payer.publicKey.toBuffer()],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "approveRoleRequest", {
    config: configPda,
    admin: adminPda,
    payer: payer.publicKey,
    roleRequest: roleRequestPda,
    roleHolder: roleHolderPda,
  }, [], {
    payer,
    signers: [payer, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Reject a role request using Anchor (with PDA seeds)
 */
export async function rejectRoleRequestViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const roleRequestPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("role_request"), payer.publicKey.toBuffer()],
    client.programId
  )[0];

  const adminPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "rejectRoleRequest", {
    config: configPda,
    admin: adminPda,
    roleRequest: roleRequestPda,
  }, [], {
    payer,
    signers: [payer, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}

/**
 * Reset a role request using Anchor (with PDA seeds)
 */
export async function resetRoleRequestViaAnchor(
  rpcUrl: string,
  payer: Keypair,
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
  }
): Promise<string> {
  const client = await getAnchorClient({ rpcUrl, payer });

  const configPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    client.programId
  )[0];

  const roleRequestPda = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("role_request"), payer.publicKey.toBuffer()],
    client.programId
  )[0];

  const signature = await executeAnchorInstruction(client, "resetRoleRequest", {
    config: configPda,
    roleRequest: roleRequestPda,
    user: payer.publicKey,
  }, [], {
    payer,
    signers: [payer, ...(options?.signers || [])],
    skipPreflight: options?.skipPreflight,
  });

  return signature;
}
