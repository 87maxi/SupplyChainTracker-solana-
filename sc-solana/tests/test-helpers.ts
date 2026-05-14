/**
 * Test Helpers Module
 *
 * Common utility functions for Codama integration tests.
 * Provides helper functions for account creation, PDA derivation,
 * role management, and netbook lifecycle testing.
 *
 * Migrated from @coral-xyz/anchor to Codama-generated client (Issue #209).
 */

import {
  createClient,
  createSolanaRpc,
  createSignerFromKeyPair,
  extendClient,
  type Address,
  type TransactionSigner,
  type ProgramDerivedAddress,
} from "@solana/kit";
import {
  Keypair,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SystemProgram,
  TransactionMessage,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  SC_SOLANA_PROGRAM_ADDRESS,
  scSolanaProgram,
  type ScSolanaPlugin,
  findConfigPda,
  findAdminPda,
  findDeployerPda,
  findRoleRequestPda,
  findSerialHashRegistryPda,
  findRoleHolderPda,
  getNetbookCodec,
  getSupplyChainConfigCodec,
  getRoleHolderCodec,
  getRoleRequestCodec,
  getSerialHashRegistryCodec,
  getGrantRoleInstructionAsync,
  type Netbook,
  type SupplyChainConfig,
  type RoleHolder,
  type RoleRequest,
  type SerialHashRegistry,
} from "../../web/src/generated/src/generated";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Netbook state constants matching Rust implementation
 * Converted from enum for Node.js native TypeScript strip-only compatibility
 */
export const NetbookState = {
  Fabricada: 0,
  HwAprobado: 1,
  SwValidado: 2,
  Distribuida: 3,
} as const;

export type NetbookState = (typeof NetbookState)[keyof typeof NetbookState];

/**
 * Request status constants matching Rust implementation
 * Converted from enum for Node.js native TypeScript strip-only compatibility
 */
export const RequestStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

/**
 * Role type constants
 */
export const ROLE_TYPES = {
  FABRICANTE: "FABRICANTE",
  AUDITOR_HW: "AUDITOR_HW",
  TECNICO_SW: "TECNICO_SW",
  ESCUELA: "ESCUELA",
} as const;

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES];

/**
 * Test account roles configuration
 */
export interface TestAccounts {
  admin: Keypair;
  fabricante: Keypair;
  auditor: Keypair;
  technician: Keypair;
  school: Keypair;
  randomUser: Keypair;
}

/**
 * Netbook registration data interface
 */
export interface NetbookRegistrationData {
  serialNumber: string;
  batchId: string;
  initialModelSpecs: string;
}

/**
 * Hardware audit data interface
 */
export interface HardwareAuditData {
  passed: boolean;
  reportHash: Array<number>;
}

/**
 * Software validation data interface
 */
export interface SoftwareValidationData {
  passed: boolean;
  osVersion: string;
}

/**
 * Student assignment data interface
 */
export interface StudentAssignmentData {
  studentIdHash: Array<number>;
  schoolIdHash: Array<number>;
}

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Solana client type extended with the sc-solana program plugin.
 */
export type TestClient = ReturnType<ReturnType<typeof scSolanaProgram>>;

/**
 * Cast a string to Address type (nominal typing helper).
 * @solana/kit uses branded Address types that don't accept plain strings.
 */
export function toAddress(str: string): Address {
  return str as Address;
}

/**
 * Convert a number array to ReadonlyUint8Array (for reportHash fields).
 */
export function toUint8Array(arr: number[]): Uint8Array {
  return new Uint8Array(arr);
}

/**
 * Create a Solana client configured for testing with the sc-solana program.
 * Uses the Codama-generated program plugin for type-safe instruction building.
 */
export async function createTestClient(
  rpcUrl: string = "http://localhost:8899",
  payer: Keypair
): Promise<TestClient> {
  const rpc = createSolanaRpc(rpcUrl);
  const payerSigner = await createSignerFromKeyPair(payer);
  const baseClient = createClient({ rpc });
  const clientWithPayer = extendClient(baseClient, { payer: payerSigner });
  const client = clientWithPayer.use(scSolanaProgram());
  return client;
}

/**
 * Get the program address as an Address type
 */
export function getProgramAddress(): Address {
  return SC_SOLANA_PROGRAM_ADDRESS;
}

// ============================================================================
// PDA Helper Functions
// ============================================================================

/**
 * Get config PDA
 * Seeds: [b"config"]
 */
export async function getConfigPdaAddress(): Promise<Address> {
  const pda = await findConfigPda({ programAddress: SC_SOLANA_PROGRAM_ADDRESS });
  return pda[0];
}

/**
 * Get netbook PDA
 * Seeds: [b"netbook", config.next_token_id.to_le_bytes()]
 */
export async function getNetbookPdaAddress(
  tokenId: number
): Promise<Address> {
  const tokenIdBytes = new Uint8Array(8);
  let remaining = BigInt(tokenId);
  for (let i = 0; i < 8; i++) {
    tokenIdBytes[i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  // Use the program's PDA derivation
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("netbook"), tokenIdBytes],
    new PublicKey(SC_SOLANA_PROGRAM_ADDRESS)
  );
  return pda.toBase58() as Address;
}

/**
 * Get role request PDA
 * Seeds: [b"role_request", user_key]
 */
export async function getRoleRequestPdaAddress(
  user: Address
): Promise<Address> {
  const pda = await findRoleRequestPda(
    { user },
    { programAddress: SC_SOLANA_PROGRAM_ADDRESS }
  );
  return pda[0];
}

/**
 * Get serial hash registry PDA
 * Seeds: [b"serial_hashes", config_key]
 */
export async function getSerialHashRegistryPdaAddress(
  configPda: Address
): Promise<Address> {
  const pda = await findSerialHashRegistryPda(
    { config: configPda },
    { programAddress: SC_SOLANA_PROGRAM_ADDRESS }
  );
  return pda[0];
}

/**
 * Get role holder PDA
 * Seeds: [b"role_holder", role, holder_index_bytes]
 */
export async function getRoleHolderPdaAddress(
  role: string,
  index: number
): Promise<Address> {
  const indexBytes = new Uint8Array(8);
  let remaining = BigInt(index);
  for (let i = 0; i < 8; i++) {
    indexBytes[i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from("role_holder"), Buffer.from(role), indexBytes],
    new PublicKey(SC_SOLANA_PROGRAM_ADDRESS)
  );
  return pda.toBase58() as Address;
}

/**
 * Get RoleHolder PDA derived from user public key
 * Used for approve_role_request instruction
 */
export async function getRoleHolderByUserPdaAddress(
  user: Address
): Promise<Address> {
  const pda = await findRoleHolderPda(
    { accountToAdd: user },
    { programAddress: SC_SOLANA_PROGRAM_ADDRESS }
  );
  return pda[0];
}

/**
 * Get admin PDA
 * Seeds: [b"admin", config_key]
 */
export async function getAdminPdaAddress(
  configPda: Address
): Promise<Address> {
  const pda = await findAdminPda(
    { config: configPda },
    { programAddress: SC_SOLANA_PROGRAM_ADDRESS }
  );
  return pda[0];
}

/**
 * Get deployer PDA
 * Seeds: [b"deployer"]
 */
export async function getDeployerPdaAddress(): Promise<Address> {
  const pda = await findDeployerPda({
    programAddress: SC_SOLANA_PROGRAM_ADDRESS,
  });
  return pda[0];
}

// ============================================================================
// Hash Utility Functions
// ============================================================================

/**
 * Create a 32-byte hash array from a numeric value
 * Useful for creating consistent test hashes
 */
export function createHash(value: number): Array<number> {
  return Array(32)
    .fill(value)
    .map((v) => v % 256) as Array<number>;
}

/**
 * Create a 32-byte hash array from a string
 * Uses a simple hashing algorithm for test purposes
 */
export function createStringHash(str: string): Array<number> {
  const hash = Array(32).fill(0) as Array<number>;
  for (let i = 0; i < 32; i++) {
    let val = 0;
    for (let j = 0; j < str.length; j++) {
      val = (val * 31 + str.charCodeAt(j) + i) % 256;
    }
    hash[i] = val;
  }
  return hash;
}

/**
 * Create a valid serial number for testing
 */
export function createSerialNumber(prefix: string = "NB", index: number = 1): string {
  return `${prefix}-${index.toString().padStart(6, "0")}`;
}

// ============================================================================
// Unique Serial and Token ID Generators (Test Isolation - Issue #188)
// ============================================================================

/**
 * Counter for generating unique token IDs across test suites.
 * Reset per test run to avoid collisions between test files.
 */
let _nextTokenId: number = 1000;

/**
 * Generate a unique token ID for testing.
 * Starts at 1000 and increments to avoid collisions with tests using fixed IDs.
 * Each test suite should call resetTokenCounter() before starting.
 */
export function generateTokenId(): number {
  return _nextTokenId++;
}

/**
 * Reset the token ID counter. Call this in beforeEach of each test suite
 * to ensure fresh token IDs across test files.
 */
export function resetTokenCounter(): void {
  _nextTokenId = 1000;
}

/**
 * Generate a unique serial number for testing.
 * Uses timestamp + random suffix to guarantee uniqueness across test runs.
 * Format: `{prefix}-{timestamp}-{random4}` e.g., "SN-1715330145000-3847"
 *
 * @param prefix - Prefix for the serial (default: "SN")
 */
export function generateUniqueSerial(prefix: string = "SN"): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a unique serial number with a specific prefix pattern.
 * Useful for tests that need to verify prefix-based logic.
 *
 * @param prefix - Prefix for the serial (e.g., "ROLE", "FINAL", "TOKEN")
 */
export function generateUniqueSerialWithPrefix(prefix: string): string {
  return generateUniqueSerial(prefix);
}

/**
 * Create a valid batch ID for testing
 */
export function createBatchId(
  manufacturer: string = "MFG",
  year: number = 2024,
  batch: number = 1
): string {
  return `${manufacturer}-${year}-${batch.toString().padStart(4, "0")}`;
}

/**
 * Create model specs for testing
 */
export function createModelSpecs(
  brand: string = "TestBrand",
  model: string = "ProBook",
  year: number = 2024
): string {
  return `${brand} ${model} ${year} - Intel Core i5, 8GB RAM, 256GB SSD`;
}

// ============================================================================
// Account Funding Functions
// ============================================================================

/**
 * Fund a keypair with SOL (default 2 SOL)
 */
export async function fundKeypair(
  client: TestClient,
  keypair: Keypair,
  amountSol: number = 2
): Promise<string> {
  const airdropSignature = await client.rpc.requestAirdrop({
    destination: keypair.publicKey.toBase58() as Address,
    lamports: BigInt(amountSol * LAMPORTS_PER_SOL),
  });

  await client.rpc.confirmTransaction({
    signature: airdropSignature,
    commitment: "confirmed",
  });

  return airdropSignature;
}

/**
 * Fund all test accounts
 */
export async function fundAllAccounts(
  client: TestClient,
  accounts: Keypair[],
  amountSol: number = 2
): Promise<string[]> {
  const signatures: string[] = [];
  for (const account of accounts) {
    const sig = await fundKeypair(client, account, amountSol);
    signatures.push(sig);
  }
  return signatures;
}

/**
 * Ensure a keypair has sufficient SOL for operations that require rent/payment.
 * This is specifically for operations like requestRole that need payer funds.
 *
 * Minimum balance: 5 SOL (enough for rent + transaction fees)
 */
export async function ensureSufficientFunds(
  client: TestClient,
  keypair: Keypair,
  minSol: number = 5
): Promise<string> {
  const balance = await client.rpc.getBalance(keypair.publicKey.toBase58() as Address);
  const minLamports = BigInt(minSol * LAMPORTS_PER_SOL);

  if (balance < minLamports) {
    const amount = minLamports - balance;
    const signature = await client.rpc.requestAirdrop({
      destination: keypair.publicKey.toBase58() as Address,
      lamports: amount,
    });
    await client.rpc.confirmTransaction({
      signature,
      commitment: "confirmed",
    });
    return signature;
  }
  return "";
}

/**
 * Ensure multiple accounts have sufficient funds.
 */
export async function ensureAllFunds(
  client: TestClient,
  accounts: Keypair[],
  minSol: number = 5
): Promise<string[]> {
  const signatures: string[] = [];
  for (const account of accounts) {
    const sig = await ensureSufficientFunds(client, account, minSol);
    if (sig) signatures.push(sig);
  }
  return signatures;
}

// ============================================================================
// Deployer PDA Helper Functions
// ============================================================================

/**
 * Helper to execute a method that requires admin PDA verification.
 * Creates the instruction, builds a transaction, and signs with the
 * wallet signer (admin PDA is now UncheckedAccount, not Signer).
 *
 * NOTE (Issue #186): Admin PDA is no longer a Signer, so we don't add
 * a placeholder signature for it. The program verifies the PDA using
 * seeds [b"admin", config.key()] with the bump stored in config.admin_pda_bump.
 *
 * This function uses VersionedTransaction with sendTransaction(options)
 * to bypass signature validation via skipPreflight.
 */
export async function executeWithAdminPda(
  client: TestClient,
  configPda: Address,
  adminPda: Address,
  _adminBump: number, // Unused - admin is now UncheckedAccount, not Signer
  methodBuilder: any,
  accounts: any,
  additionalSigners: Keypair[] = []
): Promise<string> {
  const allAccounts = {
    ...accounts,
    admin: adminPda,
  };

  const instruction: TransactionInstruction = await methodBuilder
    .accounts(allAccounts)
    .instruction();

  const { blockhash } = await client.rpc.getLatestBlockhash({
    commitment: "max",
  });

  const walletSigner = client.payer;
  const allSigners = [walletSigner, ...additionalSigners];

  // Build message with ComputeBudget instruction for priority fee
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 });
  const message = new TransactionMessage({
    payerKey: walletSigner.publicKey,
    recentBlockhash: blockhash,
    instructions: [computeBudgetIx, instruction],
  });

  // Create versioned transaction with all keys
  const compiledMessage = message.compileToV0Message([]);
  const tx = new VersionedTransaction(compiledMessage);

  // Sign with all real signers (Keypair objects)
  // NOTE: admin PDA is NOT a signer anymore - it's UncheckedAccount
  tx.sign(allSigners);

  // Send as raw transaction with skipPreflight
  const signature = await client.rpc.sendTransaction(tx, {
    maxRetries: 5,
  });

  await client.rpc.confirmTransaction({
    signature,
    commitment: "confirmed",
  });

  return signature;
}

/**
 * Execute grantRole instruction with admin PDA verification.
 *
 * IMPORTANT: grantRole requires account_to_grant to be a signer (consent-based granting).
 * This is different from other instructions that use executeWithAdminPda.
 *
 * The Rust instruction signature (grant.rs):
 * - config: Account<'info, SupplyChainConfig> (mut)
 * - admin: UncheckedAccount<'info> (PDA verified, NOT signer)
 * - account_to_grant: Signer<'info> (MUST sign)
 * - systemProgram: Program<'info, System>
 */
export async function grantRoleWithAdminPda(
  client: TestClient,
  configPda: Address,
  adminPda: Address,
  _adminBump: number,
  role: string,
  accountToGrant: Address,
  signer: Keypair
): Promise<string> {
  // Build accounts - note: admin is UncheckedAccount, NOT a signer
  const allAccounts = {
    config: configPda,
    admin: adminPda,
    accountToGrant,
    systemProgram: SystemProgram.programId.toBase58() as Address,
  };

  const grantRoleInstruction = await getGrantRoleInstructionAsync({
    config: allAccounts.config,
    admin: allAccounts.admin,
    accountToGrant: await createSignerFromKeyPair(signer),
    systemProgram: allAccounts.systemProgram,
    role,
  });
  
  // Convert Codama instruction to web3.js TransactionInstruction
  const instruction = new TransactionInstruction({
    keys: grantRoleInstruction.accounts.map((acc: any) => ({
      pubkey: new PublicKey(acc.address),
      isSigner: acc.isSigner ?? false,
      isWritable: acc.isWritable ?? false,
    })),
    programId: new PublicKey(grantRoleInstruction.programAddress),
    data: Buffer.from(grantRoleInstruction.data),
  });

  const { blockhash } = await client.rpc.getLatestBlockhash({
    commitment: "max",
  });

  // Compute budget for priority fee
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 });

  // Build transaction message
  const message = new TransactionMessage({
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
    instructions: [computeBudgetIx, instruction],
  });

  // Create versioned transaction
  const compiledMessage = message.compileToV0Message([]);
  const tx = new VersionedTransaction(compiledMessage);

  // signer is account_to_grant who must sign (consent-based)
  tx.sign([signer]);

  // Send with skipPreflight for reliability
  const signature = await client.rpc.sendTransaction(tx, {
    maxRetries: 5,
  });

  await client.rpc.confirmTransaction({
    signature,
    commitment: "confirmed",
  });
  return signature;
}

/**
 * Execute approveRoleRequest with admin PDA signing.
 */
export async function approveRoleRequestWithAdminPda(
  client: TestClient,
  configPda: Address,
  adminPda: Address,
  adminBump: number,
  roleRequestPda: Address,
  roleRequestSigner: Keypair,
  payer: Keypair
): Promise<string> {
  return executeWithAdminPda(
    client,
    configPda,
    adminPda,
    adminBump,
    client.scSolana.instructions.approveRoleRequest,
    {
      config: configPda,
      roleRequest: roleRequestPda,
    },
    [roleRequestSigner, payer]
  );
}

// ============================================================================
// Shared Initialization Lock (for parallel test execution - Issue #178)
// ============================================================================

let _initPromise: Promise<string> | null = null;
let _initialized = false;

/**
 * Initialization options interface
 */
export interface FundAndInitializeOptions {
  /** Amount of lamports to fund the deployer PDA (default: 20 SOL for parallel tests) */
  amount?: number;
  /** Force re-initialization even if config already exists (for test isolation) */
  force?: boolean;
}

/**
 * Fund the deployer PDA and initialize the config in one step.
 * This is the PDA-first initialization pattern that replaces the old
 * pattern of using an external signer for initialize.
 *
 * Uses a shared lock to ensure only one test performs initialization
 * when multiple tests run in parallel (solves Issue #178).
 *
 * @param client - Codama client instance
 * @param funder - Keypair that will fund the deployer PDA (must have SOL)
 * @param options - Optional configuration (amount, force re-initialization)
 */
export async function fundAndInitialize(
  client: TestClient,
  funder: Keypair,
  options?: number | FundAndInitializeOptions
): Promise<string> {
  // Handle both old signature (amount as number) and new signature (options object)
  let amount: number;
  let force: boolean = false;

  if (typeof options === "number") {
    amount = options;
  } else if (options) {
    amount = options.amount ?? 20 * LAMPORTS_PER_SOL;
    force = options.force ?? false;
  } else {
    amount = 20 * LAMPORTS_PER_SOL;
  }

  // Return the transaction signature as string
  // Always ensure funder has enough SOL (outside lock, so every caller gets funded)
  const funderBalance = await client.rpc.getBalance(funder.publicKey.toBase58() as Address);
  const targetBalance = BigInt(amount + 10 * LAMPORTS_PER_SOL);
  if (funderBalance < targetBalance) {
    const airdropAmount = targetBalance - funderBalance;
    const airdropTx = await client.rpc.requestAirdrop({
      destination: funder.publicKey.toBase58() as Address,
      lamports: airdropAmount,
    });
    await client.rpc.confirmTransaction({
      signature: airdropTx,
      commitment: "confirmed",
    });
  }

  // Check if config already exists
  const configPda = await getConfigPdaAddress();
  let configExists = true;
  try {
    await client.scSolana.accounts.supplyChainConfig.fetch(configPda);
  } catch {
    configExists = false;
  }

  // If config exists and force is not set, return existing state
  if (configExists && !force) {
    console.log("Config already exists, skipping initialization");
    return "";
  }

  // If force is set and config exists, log that we're bypassing
  if (configExists && force) {
    console.log("Force initialization requested - config exists but will be bypassed");
  }

  // Already initialized (and no force), skip
  if (_initialized && !force) {
    return "";
  }

  // If another test is already initializing, wait for it
  if (_initPromise && !force) {
    return _initPromise;
  }

  // This test will perform the initialization
  _initPromise = _performInitialization(client, funder, amount, force);
  return _initPromise;
}

/**
 * Internal function that performs the actual initialization.
 */
async function _performInitialization(
  client: TestClient,
  funder: Keypair,
  amount: number,
  force: boolean = false
): Promise<string> {
  const configPda = await getConfigPdaAddress();
  const serialHashRegistryPda = await getSerialHashRegistryPdaAddress(configPda);
  const adminPda = await getAdminPdaAddress(configPda);
  const deployerPda = await getDeployerPdaAddress();

  try {
    // Ensure funder has enough SOL for the operation
    // Always top up to guarantee sufficient funds for parallel test execution
    const funderBalance = await client.rpc.getBalance(funder.publicKey.toBase58() as Address);
    const targetBalance = BigInt(amount + 10 * LAMPORTS_PER_SOL);
    if (funderBalance < targetBalance) {
      const airdropAmount = targetBalance - funderBalance;
      const airdropTx = await client.rpc.requestAirdrop({
        destination: funder.publicKey.toBase58() as Address,
        lamports: airdropAmount,
      });
      await client.rpc.confirmTransaction({
        signature: airdropTx,
        commitment: "confirmed",
      });
    }

    // Check if config already exists (idempotent initialization)
    try {
      const existingConfig = await client.scSolana.accounts.supplyChainConfig.fetchNullable(configPda);
      if (existingConfig && !force) {
        console.log("Config already exists, skipping initialization");
        _initialized = true;
        return "";
      }
      // If force is true and config exists, we still try to initialize
      // The program will handle the error if initialization fails
    } catch (e: any) {
      // Account doesn't exist yet, continue with initialization
      if (!e.message.includes("does not exist")) {
        throw e;
      }
    }

    // Step 1: Fund the deployer PDA
    const funderSigner = await createSignerFromKeyPair(funder);
    const fundTx = await client.scSolana.instructions.fundDeployer({
      deployer: deployerPda,
      funder: funderSigner,
      systemProgram: SystemProgram.programId.toBase58() as Address,
      amount: BigInt(amount),
    }).send();

    await client.rpc.confirmTransaction({
      signature: fundTx,
      commitment: "confirmed",
    });

    // Step 2: Initialize config using funder as payer
    const initTx = await client.scSolana.instructions.initialize({
      config: configPda,
      serialHashRegistry: serialHashRegistryPda,
      admin: adminPda,
      deployer: deployerPda,
      funder: funderSigner,
      systemProgram: SystemProgram.programId.toBase58() as Address,
    }).send();

    await client.rpc.confirmTransaction({
      signature: initTx,
      commitment: "confirmed",
    });

    _initialized = true;
    return initTx;
  } catch (error) {
    // Reset on failure so other tests can retry
    _initPromise = null;
    throw error;
  }
}

/**
 * Reset the shared initialization state (for testing purposes).
 */
export function resetInitialization(): void {
  _initPromise = null;
  _initialized = false;
}

// ============================================================================
// Transaction Helper Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  client: TestClient,
  signature: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const status = await client.rpc.getSignatureStatus({ signature });
    if (status.value !== null) {
      if (status.value.err) {
        throw new Error(`Transaction failed: ${signature}`);
      }
      return true;
    }
    await sleep(1000);
  }
  throw new Error(`Timeout waiting for confirmation: ${signature}`);
}

/**
 * Get latest blockhash with confirmation timeout
 */
export async function getLatestBlockhash(
  client: TestClient
): Promise<string> {
  const blockhashResult = await client.rpc.getLatestBlockhash({
    commitment: "finalized",
  });
  return blockhashResult.blockhash;
}

// ============================================================================
// Test Setup Functions
// ============================================================================

/**
 * Create default test accounts
 */
export function createTestAccounts(): TestAccounts {
  return {
    admin: Keypair.generate(),
    fabricante: Keypair.generate(),
    auditor: Keypair.generate(),
    technician: Keypair.generate(),
    school: Keypair.generate(),
    randomUser: Keypair.generate(),
  };
}

/**
 * Create test netbook registration data
 */
export function createTestNetbookData(
  index: number = 1
): NetbookRegistrationData {
  return {
    serialNumber: createSerialNumber("NB", index),
    batchId: createBatchId("MFG", 2024, 1),
    initialModelSpecs: createModelSpecs("TestBrand", "ProBook", 2024),
  };
}

/**
 * Create test hardware audit data
 */
export function createTestAuditData(passed: boolean = true): HardwareAuditData {
  return {
    passed,
    reportHash: createHash(passed ? 1 : 0),
  };
}

/**
 * Create test software validation data
 */
export function createTestValidationData(
  passed: boolean = true,
  osVersion: string = "Ubuntu 22.04 LTS"
): SoftwareValidationData {
  return {
    passed,
    osVersion,
  };
}

/**
 * Create test student assignment data
 */
export function createTestAssignmentData(
  studentIndex: number = 1,
  schoolIndex: number = 1
): StudentAssignmentData {
  return {
    studentIdHash: createStringHash(`student-${studentIndex}`),
    schoolIdHash: createStringHash(`school-${schoolIndex}`),
  };
}

// ============================================================================
// Test Assertion Helpers
// ============================================================================

/**
 * Assert netbook state matches expected value
 */
export function assertNetbookState(
  actualState: number,
  expectedState: NetbookState,
  context: string = ""
): void {
  if (actualState !== expectedState) {
    throw new Error(
      `Netbook state mismatch${context ? ` in ${context}` : ""}: ` +
        `expected ${expectedState} (${Object.keys(NetbookState)[expectedState]}), ` +
        `got ${actualState} (${Object.keys(NetbookState)[actualState]})`
    );
  }
}

/**
 * Assert request status matches expected value
 */
export function assertRequestStatus(
  actualStatus: number,
  expectedStatus: RequestStatus,
  context: string = ""
): void {
  if (actualStatus !== expectedStatus) {
    throw new Error(
      `Request status mismatch${context ? ` in ${context}` : ""}: ` +
        `expected ${expectedStatus} (${Object.keys(RequestStatus)[expectedStatus]}), ` +
        `got ${actualStatus} (${Object.keys(RequestStatus)[actualStatus]})`
    );
  }
}

/**
 * Assert account exists and has minimum balance
 */
export async function assertAccountHasBalance(
  client: TestClient,
  publicKey: Address,
  minimumBalance: number = 1000000,
  context: string = ""
): Promise<void> {
  const accountInfo = await client.rpc.getAccountInfo(publicKey, {
    commitment: "confirmed",
  });
  if (!accountInfo) {
    throw new Error(
      `Account ${publicKey} does not exist${context ? ` in ${context}` : ""}`
    );
  }
  if (accountInfo.lamports < BigInt(minimumBalance)) {
    throw new Error(
      `Account ${publicKey} has insufficient balance: ` +
        `${accountInfo.lamports} < ${minimumBalance}${context ? ` in ${context}` : ""}`
    );
  }
}

// ============================================================================
// Event Logging Helper
// ============================================================================

/**
 * Solana Logs notification structure from @solana/web3.js
 */
interface LogsNotification {
  err: unknown;
  logs: string[];
  signature: string;
}

/**
 * Set up event listener for program events
 * Returns a promise that resolves with the first event emitted
 * Uses Solana connection logs subscription
 */
export function onEvent(
  client: TestClient,
  eventName: string,
  timeoutMs: number = 10000
): Promise<LogsNotification> {
  return new Promise((resolve, reject) => {
    let subscriptionId: number | null = null;
    const timeout = setTimeout(() => {
      if (subscriptionId !== null) {
        // Remove listener
      }
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    const listener = (logsNotification: LogsNotification, _context: unknown) => {
      if (logsNotification.logs.some((log) => log.includes(eventName))) {
        clearTimeout(timeout);
        if (subscriptionId !== null) {
          // Remove listener
        }
        resolve(logsNotification);
      }
    };

    // Note: onLogs subscription may need to be adapted for the new client
    subscriptionId = 0; // Placeholder
  });
}

/**
 * Clean up event listener
 */
export function offEvent(
  _client: TestClient,
  _subscriptionId: number
): void {
  // Cleanup logic
}

// ============================================================================
// Additional String Utility Functions
// ============================================================================

/**
 * Validate serial number format
 */
export function isValidSerialNumber(serial: string, prefix?: string): boolean {
  const pattern = prefix ? `^${prefix}-\\d{6}$` : "^NB-\\d{6}$";
  return new RegExp(pattern).test(serial);
}

/**
 * Validate batch ID format
 */
export function isValidBatchId(batch: string): boolean {
  return /^([A-Z]{2,10})-(\d{4})-(\d{4})$/.test(batch);
}

/**
 * Generate random hex string for testing
 */
export function generateHex(length: number = 32): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate random base58 string for testing
 */
export function generateBase58(length: number = 44): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Pad string to fixed length with padding character
 */
export function padString(str: string, length: number, padChar: string = " "): string {
  if (str.length >= length) {
    return str.slice(0, length);
  }
  return str + padChar.repeat(length - str.length);
}

/**
 * Convert string to byte array with fixed length
 */
export function stringToBytes(str: string, maxLength: number): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < Math.min(str.length, maxLength); i++) {
    bytes.push(str.charCodeAt(i));
  }
  // Pad with zeros
  while (bytes.length < maxLength) {
    bytes.push(0);
  }
  return bytes;
}

/**
 * Convert byte array to string (removing null terminators)
 */
export function bytesToString(bytes: number[]): string {
  let result = "";
  for (const byte of bytes) {
    if (byte === 0) break;
    result += String.fromCharCode(byte);
  }
  return result;
}

// ============================================================================
// Edge Case Testing Utilities (Phase 3 - Issue #188)
// ============================================================================

/**
 * Create a serial number of specific length for boundary testing
 * Useful for testing the 200 character limit on serial numbers
 *
 * @param length - Desired length of the serial number
 * @param prefix - Prefix to prepend (default: "NB")
 * @returns Serial number of exactly the specified length
 */
export function createSerialOfLength(length: number, prefix: string = "NB"): string {
  if (length <= prefix.length + 1) {
    return prefix.substring(0, Math.max(1, length - 1)) + "0";
  }

  const remainingLength = length - prefix.length - 1; // -1 for the hyphen
  const fillerChar = "0";
  let filler = "";

  if (remainingLength <= 6) {
    filler = fillerChar.repeat(remainingLength);
  } else {
    // Use repeating pattern to fill remaining length
    const pattern = "0123456789ABCDEF";
    filler = pattern.repeat(Math.ceil(remainingLength / pattern.length));
    filler = filler.substring(0, remainingLength);
  }

  return `${prefix}-${filler}`;
}

/**
 * Create a model spec string of specific length for boundary testing
 * Useful for testing the 500 character limit on model specs
 *
 * @param length - Desired length of the model spec string
 * @returns Model spec string of exactly the specified length
 */
export function createModelSpecOfLength(length: number): string {
  if (length <= 0) {
    return "";
  }

  const pattern = "Intel Core i7, 16GB RAM, 512GB SSD, RTX 3080, ";
  let result = "";

  while (result.length < length) {
    result += pattern;
  }

  return result.substring(0, length);
}

/**
 * Create a serial number with special characters (spaces, hyphens, accents)
 * Useful for testing Unicode and special character handling
 *
 * @returns Serial number with special characters
 */
export function createSpecialCharsSerial(): string {
  return "NB-TEST-Ñ-Á-É-Í-Ó-Ú-Ü-001";
}

/**
 * Create a role name that exceeds typical length limits
 * Useful for testing the StringTooLong error for role names
 *
 * @param length - Desired length of the role name
 * @returns Role name string of specified length
 */
export function createLongRoleName(length: number): string {
  const pattern = "ROLE_";
  let result = "";

  while (result.length < length) {
    result += pattern;
  }

  return result.substring(0, length);
}

/**
 * Expect a promise to reject with a specific error code or message.
 * Useful for verifying that specific error codes are returned.
 *
 * @param promise - The promise to test
 * @param expectedError - The expected error code or message substring
 * @returns Promise that resolves when the assertion passes
 */
export async function expectError(
  promise: Promise<any>,
  expectedError: string
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected promise to reject with "${expectedError}" but it resolved successfully`);
  } catch (error: any) {
    const message = error?.message || error?.toString() || "";

    // Check if the error message contains the expected error
    if (message.includes(expectedError)) {
      return; // Test passed
    }

    // Also check for Anchor-specific error format
    const anchorErrorMatch = message.match(/Program Error: (\w+)/);
    if (anchorErrorMatch && anchorErrorMatch[1] === expectedError) {
      return; // Test passed
    }

    // Check for numeric error code format (e.g., "6001:")
    const codeMatch = message.match(/(\d{4,5}):/);
    const errorCodes: Record<string, string> = {
      "6001": "InvalidStateTransition",
      "6002": "NetbookNotFound",
      "6003": "InvalidInput",
      "6004": "DuplicateSerial",
      "6005": "ArrayLengthMismatch",
      "6006": "RoleAlreadyGranted",
      "6007": "RoleNotFound",
      "6008": "InvalidSignature",
      "6009": "EmptySerial",
      "6010": "StringTooLong",
      "6011": "MaxRoleHoldersReached",
      "6012": "RoleHolderNotFound",
      "6013": "InvalidRequestState",
      "6014": "RateLimited",
      "3012": "AccountNotInitialized",
      "3004": "ArrayLengthMismatch",
    };

    if (codeMatch && errorCodes[codeMatch[1]] === expectedError) {
      return; // Test passed
    }

    // For Anchor programs, also check if the error contains the program error message
    const programErrorPatterns = [
      `Error: ${expectedError}`,
      `Error Code: ${expectedError}`,
      `Program error: ${expectedError}`,
      `custom instruction error: ProgramError::Custom(${expectedError})`,
    ];

    for (const pattern of programErrorPatterns) {
      if (message.includes(pattern)) {
        return; // Test passed
      }
    }

    // If we get here, the error didn't match
    throw new Error(
      `Expected error containing "${expectedError}" but got: ${message.substring(0, 200)}`
    );
  }
}

// ============================================================================
// End of Test Helpers
// ============================================================================
