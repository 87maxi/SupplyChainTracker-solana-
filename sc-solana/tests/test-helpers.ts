/**
 * Test Helpers Module
 *
 * Common utility functions for Anchor integration tests.
 * Provides helper functions for account creation, PDA derivation,
 * role management, and netbook lifecycle testing.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ScSolana } from "../target/types/sc_solana";
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SystemProgram,
  TransactionMessage,
  ComputeBudgetProgram,
} from "@solana/web3.js";

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
// PDA Helper Functions
// ============================================================================

/**
 * Get config PDA and bump
 * Seeds: [b"config"]
 */
export function getConfigPda(program: Program<ScSolana>): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );
  return [pda, bump];
}

/**
 * Get netbook PDA
 * Seeds: [b"netbook", config.next_token_id.to_le_bytes()]
 * Matches: seeds = [b"netbook", config.next_token_id.to_le_bytes().as_ref()]
 */
export function getNetbookPda(
  tokenId: number,
  programId: PublicKey
): PublicKey {
  const tokenIdBytes = Buffer.alloc(8);
  tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("netbook"), tokenIdBytes],
    programId
  );
  return pda;
}

/**
 * Get role request PDA
 * Seeds: [b"role_request", user_key]
 */
export function getRoleRequestPda(
  user: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("role_request"), user.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Get serial hash registry PDA
 * Seeds: [b"serial_hashes", config_key]
 */
export function getSerialHashRegistryPda(
  configPda: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("serial_hashes"), configPda.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Get role holder PDA
 * Seeds: [b"role_holder", role, holder_index_bytes]
 */
export function getRoleHolderPda(
  role: string,
  index: number,
  programId: PublicKey
): PublicKey {
  const indexBytes = Buffer.alloc(8);
  indexBytes.writeBigUInt64LE(BigInt(index), 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("role_holder"), Buffer.from(role), indexBytes],
    programId
  );
  return pda;
}

/**
 * Get RoleHolder PDA derived from user public key
 * Used for approve_role_request instruction
 */
export function getRoleHolderByUserPda(
  user: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("role_holder"), user.toBuffer()],
    programId
  );
  return pda;
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
  provider: AnchorProvider,
  keypair: Keypair,
  amountSol: number = 2
): Promise<string> {
  const signature = await provider.connection.requestAirdrop(
    keypair.publicKey,
    amountSol * anchor.web3.LAMPORTS_PER_SOL
  );
  const latestBlockhash = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
  return signature;
}

/**
 * Fund all test accounts
 */
export async function fundAllAccounts(
  provider: AnchorProvider,
  accounts: Keypair[],
  amountSol: number = 2
): Promise<string[]> {
  const signatures: string[] = [];
  for (const account of accounts) {
    const sig = await fundKeypair(provider, account, amountSol);
    signatures.push(sig);
  }
  return signatures;
}

// ============================================================================
// Deployer PDA Helper Functions
// ============================================================================

/**
 * Get deployer PDA and bump
 * Seeds: [b"deployer"]
 */
export function getDeployerPda(program: Program<ScSolana>): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("deployer")],
    program.programId
  );
  return [pda, bump];
}

/**
 * Get admin PDA and bump
 * Seeds: [b"admin", config_key]
 */
export function getAdminPda(
  configPda: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("admin"), configPda.toBuffer()],
    programId
  );
  return [pda, bump];
}

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
  program: Program<ScSolana>,
  provider: AnchorProvider,
  configPda: PublicKey,
  adminPda: PublicKey,
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

  const { blockhash } = await provider.connection.getLatestBlockhash("max");

  const walletSigner = (provider.wallet as any).payer as Keypair;
  const allSigners = [walletSigner, ...additionalSigners];

  // Build message with ComputeBudget instruction for priority fee
  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 });
  const message = new TransactionMessage({
    payerKey: provider.wallet.publicKey,
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
  const signature = await provider.connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 5,
  });

  await provider.connection.confirmTransaction(signature, "confirmed");

  return signature;
}

/**
 * Execute any instruction with admin PDA signing automatically added.
 * This is a convenience wrapper that takes the method name and arguments
 * and handles all the PDA signing details.
 */
export async function grantRoleWithAdminPda(
  program: Program<ScSolana>,
  provider: AnchorProvider,
  configPda: PublicKey,
  adminPda: PublicKey,
  adminBump: number,
  role: string,
  accountToGrant: PublicKey,
  signer: Keypair
): Promise<string> {
  return executeWithAdminPda(
    program,
    provider,
    configPda,
    adminPda,
    adminBump,
    program.methods.grantRole(role),
    {
      config: configPda,
      accountToGrant,
      systemProgram: SystemProgram.programId,
    },
    [signer]
  );
}

/**
 * Execute approveRoleRequest with admin PDA signing.
 */
export async function approveRoleRequestWithAdminPda(
  program: Program<ScSolana>,
  provider: AnchorProvider,
  configPda: PublicKey,
  adminPda: PublicKey,
  adminBump: number,
  roleRequestPda: PublicKey,
  roleRequestSigner: Keypair,
  payer: Keypair
): Promise<string> {
  return executeWithAdminPda(
    program,
    provider,
    configPda,
    adminPda,
    adminBump,
    program.methods.approveRoleRequest(),
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
 * Fund the deployer PDA and initialize the config in one step.
 * This is the PDA-first initialization pattern that replaces the old
 * pattern of using an external signer for initialize.
 *
 * Uses a shared lock to ensure only one test performs initialization
 * when multiple tests run in parallel (solves Issue #178).
 *
 * @param program - Anchor program instance
 * @param provider - Anchor provider
 * @param funder - Keypair that will fund the deployer PDA (must have SOL)
 * @param amount - Amount of lamports to fund the deployer PDA (default: 20 SOL for parallel tests)
 */
export async function fundAndInitialize(
  program: Program<ScSolana>,
  provider: AnchorProvider,
  funder: Keypair,
  amount: number = 20 * anchor.web3.LAMPORTS_PER_SOL
): Promise<string> {
  // Return the transaction signature as string
  // Always ensure funder has enough SOL (outside lock, so every caller gets funded)
  const funderBalance = await provider.connection.getBalance(funder.publicKey);
  const targetBalance = amount + 10 * anchor.web3.LAMPORTS_PER_SOL;
  if (funderBalance < targetBalance) {
    const airdropAmount = targetBalance - funderBalance;
    const airdropTx = await provider.connection.requestAirdrop(
      funder.publicKey,
      airdropAmount
    );
    await provider.connection.confirmTransaction(airdropTx, "confirmed");
  }

  // Already initialized, skip
  if (_initialized) {
    return "";
  }

  // If another test is already initializing, wait for it
  if (_initPromise) {
    return _initPromise;
  }

  // This test will perform the initialization
  _initPromise = _performInitialization(program, provider, funder, amount);
  return _initPromise;
}

/**
 * Internal function that performs the actual initialization.
 */
async function _performInitialization(
  program: Program<ScSolana>,
  provider: AnchorProvider,
  funder: Keypair,
  amount: number
): Promise<string> {
  const [configPda] = getConfigPda(program);
  const serialHashRegistryPda = getSerialHashRegistryPda(configPda, program.programId);
  const [adminPda] = getAdminPda(configPda, program.programId);
  const [deployerPda] = getDeployerPda(program);

  try {
    // Ensure funder has enough SOL for the operation
    // Always top up to guarantee sufficient funds for parallel test execution
    const funderBalance = await provider.connection.getBalance(funder.publicKey);
    const targetBalance = amount + 10 * anchor.web3.LAMPORTS_PER_SOL;
    if (funderBalance < targetBalance) {
      const airdropAmount = targetBalance - funderBalance;
      const airdropTx = await provider.connection.requestAirdrop(
        funder.publicKey,
        airdropAmount
      );
      await provider.connection.confirmTransaction(airdropTx, "confirmed");
    }

    // Check if config already exists (idempotent initialization)
    try {
      const existingConfig = await program.account.supplyChainConfig.fetchNullable(configPda);
      if (existingConfig) {
        console.log("Config already exists, skipping initialization");
        _initialized = true;
        return "";
      }
    } catch (e: any) {
      // Account doesn't exist yet, continue with initialization
      if (!e.message.includes("does not exist")) {
        throw e;
      }
    }

    // Step 1: Fund the deployer PDA
    const fundTx = await (program.methods as any)
      .fundDeployer(new anchor.BN(amount))
      .accounts({
        deployer: deployerPda,
        funder: funder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([funder])
      .rpc();

    await provider.connection.confirmTransaction(fundTx, "confirmed");

    // Step 2: Initialize config using funder as payer
    const initTx = await (program.methods as any)
      .initialize()
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        admin: adminPda,
        deployer: deployerPda,
        funder: funder.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([funder])
      .rpc({ skipPreflight: true, maxRetries: 5 });

    await provider.connection.confirmTransaction(initTx, "confirmed");

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
  provider: AnchorProvider,
  signature: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const status = await provider.connection.getSignatureStatus(signature);
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
  provider: AnchorProvider
): Promise<string> {
  const blockhashResult = await provider.connection.getLatestBlockhash("finalized");
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
  provider: AnchorProvider,
  publicKey: PublicKey,
  minimumBalance: number = 1000000,
  context: string = ""
): Promise<void> {
  const accountInfo = await provider.connection.getAccountInfo(publicKey);
  if (!accountInfo) {
    throw new Error(
      `Account ${publicKey.toBase58()} does not exist${context ? ` in ${context}` : ""}`
    );
  }
  if (accountInfo.lamports < minimumBalance) {
    throw new Error(
      `Account ${publicKey.toBase58()} has insufficient balance: ` +
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
  provider: AnchorProvider,
  eventName: string,
  timeoutMs: number = 10000
): Promise<LogsNotification> {
  return new Promise((resolve, reject) => {
    let subscriptionId: number | null = null;
    const timeout = setTimeout(() => {
      if (subscriptionId !== null) {
        provider.connection.removeOnLogsListener(subscriptionId);
      }
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeoutMs);

    const listener = (logsNotification: LogsNotification, _context: unknown) => {
      if (logsNotification.logs.some((log) => log.includes(eventName))) {
        clearTimeout(timeout);
        if (subscriptionId !== null) {
          provider.connection.removeOnLogsListener(subscriptionId);
        }
        resolve(logsNotification);
      }
    };

    subscriptionId = provider.connection.onLogs(
      provider.wallet.publicKey,
      listener,
      "processed"
    );
  });
}

/**
 * Clean up event listener
 */
export function offEvent(
  provider: AnchorProvider,
  subscriptionId: number
): void {
  provider.connection.removeOnLogsListener(subscriptionId);
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
// End of Test Helpers
// ============================================================================
