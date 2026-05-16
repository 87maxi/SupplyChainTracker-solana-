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
import { fileURLToPath } from "url";
import { dirname } from "path";

// CommonJS compatibility for @coral-xyz/anchor ESM exports
const { Program, AnchorProvider, Wallet, BN } = anchor;

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  program: Program<any>;
  config: AnchorClientConfig;
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
): Promise<Program<any>> {
  // Return cached instance if same RPC URL
  if (cachedProgram && cachedProgram.config.rpcUrl === config.rpcUrl) {
    return cachedProgram.program;
  }

  // Create new instance
  const connection = new anchor.web3.Connection(config.rpcUrl, config.commitment);
  const wallet = new Wallet(config.payer);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: config.commitment ?? "confirmed",
    skipPreflight: false,
  });

  const idl = loadIdl();
  const programId = new PublicKey(idl.address);

  const program = new Program(idl, provider);

  // Cache the instance
  cachedProgram = { program, config };
  lastRpcUrl = config.rpcUrl;

  return program;
}

/**
 * Clear the cached Anchor program instance
 */
export function clearAnchorCache(): void {
  cachedProgram = null;
  lastRpcUrl = null;
}

// ============================================================================
// Instruction Execution Helpers
// ============================================================================

/**
 * Encode a string argument using Anchor's varint encoding (u32 length prefix + UTF-8 bytes)
 */
function encodeStringArg(value: string): Buffer {
  const bytes = Buffer.from(value, "utf-8");
  const lengthPrefix = new BN(bytes.length).toBuffer("le", 4);
  const result = Buffer.alloc(lengthPrefix.length + bytes.length);
  lengthPrefix.copy(result, 0);
  bytes.copy(result, lengthPrefix.length);
  return result;
}

/**
 * Execute an Anchor instruction by building a raw web3.js Transaction
 * and signing it with all required signers.
 *
 * This approach is necessary because Anchor 0.30.1 does not support
 * .signers() for extra signers beyond the wallet.
 */
export async function executeAnchorInstruction(
  program: Program<any>,
  instructionName: string,
  accounts: Record<string, any>,
  args: any[] = [],
  options?: {
    signers?: Keypair[];
    skipPreflight?: boolean;
    commitment?: anchor.web3.Commitment;
  }
): Promise<string> {
  // Convert BigInt/number args to BN for Anchor/Borsh compatibility
  const normalizedArgs = args.map(arg => {
    if (typeof arg === 'bigint' || typeof arg === 'number') {
      return new BN(arg.toString());
    }
    return arg;
  });

  // Get the instruction method from the program
  let methodBuilder = (program.methods as any)[instructionName];

  if (!methodBuilder) {
    // Try camelCase conversion if the exact match failed
    const camelCaseName = instructionName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const altMethod = (program.methods as any)[camelCaseName];
    if (altMethod) {
      return await executeAnchorInstruction(program, camelCaseName, accounts, args, options);
    }
    throw new Error(
      `Instruction '${instructionName}' not found in program. ` +
        `Available instructions: ${Object.keys(program.methods || {}).join(", ")}`
    );
  }

  // Build instruction using Anchor's builder API
  let builder = methodBuilder(...normalizedArgs);
  if (Object.keys(accounts).length > 0) {
    builder = builder.accounts(accounts);
  }

  // Extract account metas from the accounts object passed in
  // We need to determine mutability from the IDL instruction definition
  const idlInstruction = program.idl.instructions.find((i: any) =>
    i.name.toLowerCase().replace(/_/g, '') === instructionName.toLowerCase().replace(/_/g, '') ||
    i.name === instructionName ||
    i.name.replace(/_/g, '') === instructionName.replace(/_/g, '')
  );

  if (!idlInstruction) {
    throw new Error(`Instruction '${instructionName}' not found in IDL`);
  }

  // Build account metas with proper mutability from IDL
  const idlAccounts = idlInstruction.accounts || [];
  let accountMetas: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }> = [];
  
  // Convert the accounts record to an array with IDL metadata
  const accountEntries = Object.entries(accounts);
  accountMetas = accountEntries.map(([name, acc]: [string, any]) => {
    const idlAccount = idlAccounts.find((ia: any) => ia.name === name);
    const pubkey = acc instanceof PublicKey ? acc : new PublicKey(acc);
    return {
      pubkey: pubkey,
      isSigner: acc.isSigner || idlAccount?.signer || false,
      isWritable: idlAccount?.writable || false,
    };
  });
  
  const dataArgs: any[] = normalizedArgs;

  // Encode discriminator (first 8 bytes from IDL)
  const discriminator = (idlInstruction as any).discriminator || [0, 0, 0, 0, 0, 0, 0, 0];
  const dataBuffer = Buffer.alloc(8 + dataArgs.reduce((acc: number, arg: any) => {
    if (typeof arg === 'string') {
      return acc + 4 + Buffer.byteLength(arg, 'utf-8');
    } else if (arg instanceof BN) {
      return acc + 8;
    }
    return acc;
  }, 0));

  // Write discriminator
  let offset = 0;
  for (const byte of discriminator) {
    dataBuffer[offset++] = byte;
  }

  // Write arguments
  for (const arg of dataArgs) {
    if (typeof arg === 'string') {
      const encoded = encodeStringArg(arg);
      encoded.copy(dataBuffer, offset);
      offset += encoded.length;
    } else if (arg instanceof BN) {
      const buf = arg.toBuffer('le', 8);
      buf.copy(dataBuffer, offset);
      offset += 8;
    }
  }

  // Get program ID
  const programId = program.programId;

  // Create the TransactionInstruction
  const instruction = new TransactionInstruction({
    programId: programId,
    keys: accountMetas.map((acc: any) => ({
      pubkey: acc.pubkey || acc.key,
      isSigner: acc.isSigner || false,
      isWritable: acc.isWritable || false,
    })),
    data: dataBuffer,
  });

  // Create a raw web3.js Transaction
  const transaction = new Transaction();
  transaction.add(instruction);

  // Get latest blockhash
  const { blockhash } = await program.provider.connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Collect all signers: provider wallet + extra signers
  const providerWallet = (program.provider as any).wallet?.payer as Keypair | undefined;
  const allSigners: Keypair[] = [providerWallet, ...(options?.signers || [])].filter(s => s != null) as Keypair[];

  // Sign the transaction with all signers
  transaction.sign(...allSigners);

  // Send and confirm
  const signature = await sendAndConfirmTransaction(
    program.provider.connection,
    transaction,
    allSigners,
    {
      skipPreflight: options?.skipPreflight ?? false,
      commitment: options?.commitment ?? "confirmed",
    }
  );

  return signature;
}

// ============================================================================
// PDA Derivation Helpers
// ============================================================================

/**
 * Derive the Admin PDA address
 * Seeds: [b"admin", config.key()]
 */
export async function deriveAdminPda(
  configPda: PublicKey,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress(
    [Buffer.from("admin"), configPda.toBuffer()],
    pid
  );
}

/**
 * Derive the Deployer PDA address
 * Seeds: [b"deployer"]
 */
export async function deriveDeployerPda(
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress(
    [Buffer.from("deployer")],
    pid
  );
}

/**
 * Derive the Netbook PDA address
 * Seeds: [b"netbook", token_id.to_le_bytes()]
 */
export async function deriveNetbookPda(
  tokenId: bigint | number,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  const tokenIdBytes = Buffer.alloc(8);
  tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);
  return await PublicKey.findProgramAddress(
    [Buffer.from("netbook"), tokenIdBytes],
    pid
  );
}

/**
 * Derive the RoleHolder PDA address
 * Seeds: [b"role_holder", account]
 */
export async function deriveRoleHolderPda(
  account: PublicKey,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress(
    [Buffer.from("role_holder"), account.toBuffer()],
    pid
  );
}

/**
 * Derive the RoleRequest PDA address
 * Seeds: [b"role_request", user]
 */
export async function deriveRoleRequestPda(
  user: PublicKey,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress(
    [Buffer.from("role_request"), user.toBuffer()],
    pid
  );
}

/**
 * Derive the SerialHashRegistry PDA address
 * Seeds: [b"serial_hashes", config]
 */
export async function deriveSerialHashRegistryPda(
  config: PublicKey,
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress(
    [Buffer.from("serial_hashes"), config.toBuffer()],
    pid
  );
}

/**
 * Derive the Config PDA address
 * Seeds: [b"config"]
 */
export async function deriveConfigPda(
  programId?: PublicKey
): Promise<[PublicKey, number]> {
  const pid = programId || (await getProgramId());
  return await PublicKey.findProgramAddress([Buffer.from("config")], pid);
}

/**
 * Get the program ID from the IDL
 */
async function getProgramId(): Promise<PublicKey> {
  const idl = loadIdl();
  return new PublicKey(idl.address);
}

// ============================================================================
// Convenience Functions for Common Operations
// ============================================================================

/**
 * Grant a role using Anchor (with PDA seeds)
 */
export async function grantRoleViaAnchor(
  config: AnchorClientConfig,
  adminPda: PublicKey,
  accountToGrant: PublicKey,
  role: string,
  extraSigners?: Keypair[]
): Promise<string> {
  const program = await getAnchorClient(config);
  const configPda = await deriveConfigPda();

  return await executeAnchorInstruction(program, "grantRole", {
    config: configPda[0],
    admin: adminPda,
    accountToGrant: accountToGrant,
    systemProgram: SystemProgram.programId,
  }, [role], { signers: extraSigners });
}

/**
 * Fund the Deployer PDA using Anchor (with PDA seeds)
 */
export async function fundDeployerViaAnchor(
  config: AnchorClientConfig,
  amount: bigint | number,
  extraSigners?: Keypair[]
): Promise<string> {
  const program = await getAnchorClient(config);
  const deployerPda = await deriveDeployerPda();

  return await executeAnchorInstruction(program, "fundDeployer", {
    deployer: deployerPda[0],
    funder: config.payer.publicKey,
    systemProgram: SystemProgram.programId,
  }, [BigInt(amount)], { signers: extraSigners });
}

/**
 * Initialize the config using Anchor (with PDA seeds)
 */
export async function initializeViaAnchor(
  config: AnchorClientConfig,
  extraSigners?: Keypair[]
): Promise<string> {
  const program = await getAnchorClient(config);
  const configPda = await deriveConfigPda();
  const deployerPda = await deriveDeployerPda();

  // Admin is PDA: [b"admin", config.key()]
  const [adminPda] = await deriveAdminPda(configPda[0]);

  return await executeAnchorInstruction(program, "initialize", {
    config: configPda[0],
    admin: adminPda,
    deployer: deployerPda[0],
    funder: config.payer.publicKey,
    systemProgram: SystemProgram.programId,
  }, [], { signers: extraSigners });
}
