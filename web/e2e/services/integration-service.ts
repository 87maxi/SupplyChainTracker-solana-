/**
 * Integration Service for E2E Blockchain Testing
 *
 * Provides real blockchain operations against a local Solana test validator
 * instead of mocked wallet injection. This service uses Anchor + @solana/web3.js
 * to perform actual transactions (register, audit, validate, assign) and verify
 * on-chain state during E2E test execution.
 *
 * Usage:
 *   const integration = new IntegrationService("http://localhost:8899");
 *   await integration.initialize();
 *   await integration.grantRole("FABRICANTE", integration.fabricante.publicKey);
 *   const tx = await integration.registerNetbook("NB-001", "BATCH-001", "Model-X");
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  AnchorProvider,
  Program,
  Wallet,
  BN,
} from "@coral-xyz/anchor";
import idl from "../../src/contracts/sc_solana.json";

// ============================================================================
// Type Definitions
// ============================================================================

/** Netbook state constants matching Rust implementation */
export const NetbookState = {
  Fabricada: 0,
  HwAprobado: 1,
  SwValidado: 2,
  Distribuida: 3,
} as const;

export type NetbookStateValue =
  (typeof NetbookState)[keyof typeof NetbookState];

/** Role type constants */
export const ROLE_TYPES = {
  FABRICANTE: "FABRICANTE",
  AUDITOR_HW: "AUDITOR_HW",
  TECNICO_SW: "TECNICO_SW",
  ESCUELA: "ESCUELA",
} as const;

export type RoleType = (typeof ROLE_TYPES)[keyof typeof ROLE_TYPES];

/** Transaction result from blockchain operations */
export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

/** Netbook data fetched from chain */
export interface NetbookOnChain {
  serialNumber: string;
  batchId: string;
  initialModelSpecs: string;
  hwAuditor: PublicKey;
  hwIntegrityPassed: boolean;
  hwReportHash: number[];
  swTechnician: PublicKey;
  osVersion: string;
  swValidationPassed: boolean;
  destinationSchoolHash: number[];
  studentIdHash: number[];
  distributionTimestamp: BN;
  state: number;
  exists: boolean;
  tokenId: BN;
}

/** Test accounts with generated keypairs */
export interface TestAccounts {
  payer: Keypair;
  fabricante: Keypair;
  auditorHw: Keypair;
  tecnicoSw: Keypair;
  escuela: Keypair;
  randomUser: Keypair;
}

/** Configuration options for the integration service */
export interface IntegrationServiceOptions {
  /** RPC URL for the Solana test validator (default: http://localhost:8899) */
  rpcUrl?: string;
  /** Program ID override (default: from Anchor.toml localnet) */
  programId?: string;
  /** Commitment level (default: confirmed) */
  commitment?: "processed" | "confirmed" | "finalized";
  /** Amount of SOL to airdrop to each test account (default: 5) */
  airdropAmount?: number;
}

// ============================================================================
// Helper types for Anchor Program (avoids deep type instantiation)
// ============================================================================

type AnchorProgram = Program<any>;

function getNetbookAccount(program: AnchorProgram) {
  return (program.account as any).netbook;
}

function getConfigAccount(program: AnchorProgram) {
  return (program.account as any).supplyChainConfig;
}

// ============================================================================
// Integration Service
// ============================================================================

export class IntegrationService {
  public connection: Connection;
  public provider: AnchorProvider;
  public program: AnchorProgram;
  public accounts: TestAccounts;

  private options: Required<IntegrationServiceOptions>;
  private initialized = false;

  /**
   * Create a new IntegrationService instance.
   *
   * @param options - Configuration options for connecting to the test validator
   */
  constructor(options: IntegrationServiceOptions | string = {}) {
    // Support string RPC URL for backward compatibility
    if (typeof options === "string") {
      options = { rpcUrl: options };
    }

    this.options = {
      rpcUrl: options.rpcUrl || "http://localhost:8899",
      programId: options.programId || "7bGrgLgTDyQY4SMmHpQpdT2VDur8iVCRGBBjSMrcCvrb",
      commitment: options.commitment || "confirmed",
      airdropAmount: options.airdropAmount ?? 5,
    };

    // Generate fresh keypairs for test accounts
    this.accounts = this.createTestAccounts();

    // Set up connection and provider
    this.connection = new Connection(this.options.rpcUrl, this.options.commitment);
    const wallet = new Wallet(this.accounts.payer);
    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: this.options.commitment }
    );

    this.program = new Program(
      idl as any,
      this.provider
    );
  }

  // ========================================================================
  // Initialization
  // ========================================================================

  /**
   * Initialize the integration service:
   * 1. Fund all test accounts with SOL via airdrop
   * 2. Fund the deployer PDA
   * 3. Initialize the SupplyChainConfig account
   *
   * This method is idempotent - calling it multiple times is safe.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Step 1: Fund all test accounts
    await this.fundAccounts();

    // Step 2: Fund deployer PDA
    await this.fundDeployer();

    // Step 3: Initialize config (idempotent - skips if already exists)
    await this.initializeConfig();

    this.initialized = true;
  }

  /**
   * Re-initialize the service (resets state for fresh test runs).
   * Use this between test suites that need clean state.
   */
  async reinitialize(): Promise<void> {
    this.initialized = false;
    this.accounts = this.createTestAccounts();

    // Update provider wallet with new payer
    const wallet = new Wallet(this.accounts.payer);
    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: this.options.commitment }
    );

    await this.initialize();
  }

  // ========================================================================
  // Account Management
  // ========================================================================

  /**
   * Create fresh test accounts with generated keypairs.
   */
  private createTestAccounts(): TestAccounts {
    return {
      payer: Keypair.generate(),
      fabricante: Keypair.generate(),
      auditorHw: Keypair.generate(),
      tecnicoSw: Keypair.generate(),
      escuela: Keypair.generate(),
      randomUser: Keypair.generate(),
    };
  }

  /**
   * Fund all test accounts with SOL via airdrop.
   */
  private async fundAccounts(): Promise<void> {
    const accountsToFund = [
      this.accounts.payer,
      this.accounts.fabricante,
      this.accounts.auditorHw,
      this.accounts.tecnicoSw,
      this.accounts.escuela,
      this.accounts.randomUser,
    ];

    const promises = accountsToFund.map(async (account) => {
      const signature = await this.connection.requestAirdrop(
        account.publicKey,
        this.options.airdropAmount * LAMPORTS_PER_SOL
      );
      await this.connection.confirmTransaction(signature, "confirmed");
    });

    await Promise.all(promises);
  }

  /**
   * Fund the deployer PDA with SOL for program operations.
   */
  private async fundDeployer(): Promise<string> {
    const [deployerPda] = this.getDeployerPda();

    try {
      const signature = await (this.program as any)
        .methods
        .fundDeployer(new BN(20 * LAMPORTS_PER_SOL))
        .accounts({
          deployer: deployerPda,
          funder: this.accounts.payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.accounts.payer])
        .rpc({ skipPreflight: true, maxRetries: 5 });

      await this.connection.confirmTransaction(signature, "confirmed");
      return signature;
    } catch (error: any) {
      // Deployer may already be funded - ignore
      if (error.message?.includes("already")) {
        return "";
      }
      throw error;
    }
  }

  /**
   * Initialize the SupplyChainConfig account.
   * Idempotent - skips if config already exists.
   */
  private async initializeConfig(): Promise<string> {
    const configPda = this.getConfigPda();

    // Check if config already exists
    try {
      await getConfigAccount(this.program).fetch(configPda);
      return ""; // Already initialized
    } catch {
      // Account doesn't exist, continue with initialization
    }

    const serialHashRegistryPda = this.getSerialHashRegistryPda(configPda);
    const [adminPda] = this.getAdminPda(configPda);
    const [deployerPda] = this.getDeployerPda();

    const signature = await (this.program as any)
      .methods
      .initialize()
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        admin: adminPda,
        deployer: deployerPda,
        funder: this.accounts.payer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.accounts.payer])
      .rpc({ skipPreflight: true, maxRetries: 5 });

    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  // ========================================================================
  // Role Management
  // ========================================================================

  /**
   * Grant a role to an account.
   * Uses the grantRole instruction which requires the account to sign (consent-based).
   *
   * @param role - Role type to grant (FABRICANTE, AUDITOR_HW, TECNICO_SW, ESCUELA)
   * @param accountToGrant - Public key of the account to grant the role to
   * @param signer - Keypair that will sign the transaction (must be accountToGrant)
   */
  async grantRole(
    role: RoleType,
    accountToGrant: PublicKey,
    signer?: Keypair
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const [adminPda] = this.getAdminPda(configPda);

    // Determine signer - defaults to matching accountToGrant
    let txSigner: Keypair;
    if (signer) {
      txSigner = signer;
    } else if (accountToGrant.equals(this.accounts.fabricante.publicKey)) {
      txSigner = this.accounts.fabricante;
    } else if (accountToGrant.equals(this.accounts.auditorHw.publicKey)) {
      txSigner = this.accounts.auditorHw;
    } else if (accountToGrant.equals(this.accounts.tecnicoSw.publicKey)) {
      txSigner = this.accounts.tecnicoSw;
    } else if (accountToGrant.equals(this.accounts.escuela.publicKey)) {
      txSigner = this.accounts.escuela;
    } else {
      txSigner = this.accounts.randomUser;
    }

    const instruction = await (this.program as any)
      .methods
      .grantRole(role)
      .accounts({
        config: configPda,
        admin: adminPda,
        accountToGrant: accountToGrant,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.sendTransaction(instruction, [txSigner]);
  }

  /**
   * Grant roles to all standard test accounts.
   * Convenience method for test setup.
   */
  async grantAllRoles(): Promise<string[]> {
    const signatures: string[] = [];

    signatures.push(
      await this.grantRole(
        ROLE_TYPES.FABRICANTE,
        this.accounts.fabricante.publicKey
      )
    );
    signatures.push(
      await this.grantRole(
        ROLE_TYPES.AUDITOR_HW,
        this.accounts.auditorHw.publicKey
      )
    );
    signatures.push(
      await this.grantRole(
        ROLE_TYPES.TECNICO_SW,
        this.accounts.tecnicoSw.publicKey
      )
    );
    signatures.push(
      await this.grantRole(
        ROLE_TYPES.ESCUELA,
        this.accounts.escuela.publicKey
      )
    );

    return signatures;
  }

  /**
   * Revoke a role from an account.
   */
  async revokeRole(role: RoleType, accountToRevoke: PublicKey): Promise<string> {
    const configPda = this.getConfigPda();
    const [adminPda] = this.getAdminPda(configPda);

    const instruction = await (this.program as any)
      .methods
      .revokeRole(role)
      .accounts({
        config: configPda,
        admin: adminPda,
        accountToRevoke: accountToRevoke,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.payer]);
  }

  // ========================================================================
  // Netbook Lifecycle
  // ========================================================================

  /**
   * Register a new netbook on the blockchain.
   *
   * @param serialNumber - Unique serial number for the netbook
   * @param batchId - Batch identifier
   * @param initialModelSpecs - Model specifications string
   */
  async registerNetbook(
    serialNumber: string,
    batchId: string,
    initialModelSpecs: string
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const serialHashRegistryPda = this.getSerialHashRegistryPda(configPda);

    // Derive netbook PDA from next_token_id
    const config = await getConfigAccount(this.program).fetch(configPda);
    const tokenId = Number(config.nextTokenId.toNumber());
    const netbookPda = this.getNetbookPda(tokenId);

    const instruction = await (this.program as any)
      .methods
      .registerNetbook(serialNumber, batchId, initialModelSpecs)
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        manufacturer: this.accounts.fabricante.publicKey,
        netbook: netbookPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.fabricante]);
  }

  /**
   * Register multiple netbooks in a single batch transaction.
   *
   * @param serialNumbers - Array of serial numbers
   * @param batchIds - Array of batch IDs
   * @param modelSpecs - Array of model specifications
   */
  async registerNetbooksBatch(
    serialNumbers: string[],
    batchIds: string[],
    modelSpecs: string[]
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const serialHashRegistryPda = this.getSerialHashRegistryPda(configPda);

    const instruction = await (this.program as any)
      .methods
      .registerNetbooksBatch(serialNumbers, batchIds, modelSpecs)
      .accounts({
        config: configPda,
        serialHashRegistry: serialHashRegistryPda,
        manufacturer: this.accounts.fabricante.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.fabricante]);
  }

  /**
   * Perform a hardware audit on a netbook.
   *
   * @param serialNumber - Serial number of the netbook to audit
   * @param passed - Whether the hardware audit passed
   * @param reportHash - 32-byte hash of the audit report
   */
  async auditHardware(
    serialNumber: string,
    passed: boolean,
    reportHash?: number[]
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const netbookPda = await this.findNetbookPdaBySerial(serialNumber);

    if (!netbookPda) {
      throw new Error(`Netbook with serial "${serialNumber}" not found`);
    }

    const hash = reportHash || this.createHash(passed ? 1 : 0);

    const instruction = await (this.program as any)
      .methods
      .auditHardware(passed, hash)
      .accounts({
        config: configPda,
        auditor: this.accounts.auditorHw.publicKey,
        netbook: netbookPda,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.auditorHw]);
  }

  /**
   * Validate the software installation on a netbook.
   *
   * @param serialNumber - Serial number of the netbook
   * @param osVersion - Operating system version installed
   * @param passed - Whether the software validation passed
   */
  async validateSoftware(
    serialNumber: string,
    osVersion: string,
    passed: boolean
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const netbookPda = await this.findNetbookPdaBySerial(serialNumber);

    if (!netbookPda) {
      throw new Error(`Netbook with serial "${serialNumber}" not found`);
    }

    const instruction = await (this.program as any)
      .methods
      .validateSoftware(osVersion, passed)
      .accounts({
        config: configPda,
        technician: this.accounts.tecnicoSw.publicKey,
        netbook: netbookPda,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.tecnicoSw]);
  }

  /**
   * Assign a netbook to a student at a school.
   *
   * @param serialNumber - Serial number of the netbook
   * @param schoolIdHash - 32-byte hash of the school identifier
   * @param studentIdHash - 32-byte hash of the student identifier
   */
  async assignToStudent(
    serialNumber: string,
    schoolIdHash?: number[],
    studentIdHash?: number[]
  ): Promise<string> {
    const configPda = this.getConfigPda();
    const netbookPda = await this.findNetbookPdaBySerial(serialNumber);

    if (!netbookPda) {
      throw new Error(`Netbook with serial "${serialNumber}" not found`);
    }

    const schoolHash = schoolIdHash || this.createStringHash("school-001");
    const studentHash = studentIdHash || this.createStringHash("student-001");

    const instruction = await (this.program as any)
      .methods
      .assignToStudent(schoolHash, studentHash)
      .accounts({
        config: configPda,
        school: this.accounts.escuela.publicKey,
        netbook: netbookPda,
      })
      .instruction();

    return this.sendTransaction(instruction, [this.accounts.escuela]);
  }

  // ========================================================================
  // Query Operations
  // ========================================================================

  /**
   * Fetch a netbook account by serial number.
   * Iterates through token IDs to find the matching netbook.
   *
   * @param serialNumber - Serial number to search for
   */
  async getNetbookBySerial(serialNumber: string): Promise<NetbookOnChain | null> {
    const configPda = this.getConfigPda();
    const config = await getConfigAccount(this.program).fetch(configPda);
    const totalNetbooks = Number(config.totalNetbooks.toNumber());

    for (let tokenId = 0; tokenId < totalNetbooks; tokenId++) {
      const netbookPda = this.getNetbookPda(tokenId);
      try {
        const netbook = await getNetbookAccount(this.program).fetch(netbookPda);
        if (netbook.serialNumber === serialNumber) {
          return netbook as NetbookOnChain;
        }
      } catch {
        // Account doesn't exist, continue
      }
    }

    return null;
  }

  /**
   * Fetch the SupplyChainConfig account.
   */
  async getConfig(): Promise<any> {
    const configPda = this.getConfigPda();
    return getConfigAccount(this.program).fetch(configPda);
  }

  /**
   * Check if an account has a specific role.
   *
   * @param role - Role type to check
   * @param account - Account public key
   */
  async hasRole(role: RoleType, account: PublicKey): Promise<boolean> {
    const configPda = this.getConfigPda();
    const config = await getConfigAccount(this.program).fetch(configPda);

    // Check role assignments in config
    switch (role) {
      case ROLE_TYPES.FABRICANTE:
        return config.fabricante?.toBase58() === account.toBase58();
      case ROLE_TYPES.AUDITOR_HW:
        return config.auditorHw?.toBase58() === account.toBase58();
      case ROLE_TYPES.TECNICO_SW:
        return config.tecnicoSw?.toBase58() === account.toBase58();
      case ROLE_TYPES.ESCUELA:
        return config.escuela?.toBase58() === account.toBase58();
      default:
        return false;
    }
  }

  /**
   * Get the current balance of an account.
   *
   * @param account - Account public key
   */
  async getBalance(account: PublicKey): Promise<number> {
    return this.connection.getBalance(account);
  }

  // ========================================================================
  // PDA Derivation Helpers
  // ========================================================================

  /**
   * Get the config PDA.
   * Seeds: [b"config"]
   */
  getConfigPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      this.program.programId
    );
    return pda;
  }

  /**
   * Get the admin PDA.
   * Seeds: [b"admin", config_key]
   */
  getAdminPda(configPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("admin"), configPda.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Get the deployer PDA.
   * Seeds: [b"deployer"]
   */
  getDeployerPda(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("deployer")],
      this.program.programId
    );
  }

  /**
   * Get the netbook PDA for a given token ID.
   * Seeds: [b"netbook", token_id_bytes]
   */
  getNetbookPda(tokenId: number): PublicKey {
    const tokenIdBytes = Buffer.alloc(8);
    tokenIdBytes.writeBigUInt64LE(BigInt(tokenId), 0);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("netbook"), tokenIdBytes],
      this.program.programId
    );
    return pda;
  }

  /**
   * Get the serial hash registry PDA.
   * Seeds: [b"serial_hashes", config_key]
   */
  getSerialHashRegistryPda(configPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("serial_hashes"), configPda.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  /**
   * Get the role holder PDA.
   * Seeds: [b"role_holder", user_key]
   */
  getRoleHolderPda(user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role_holder"), user.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  /**
   * Get the role request PDA.
   * Seeds: [b"role_request", user_key]
   */
  getRoleRequestPda(user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role_request"), user.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  /**
   * Find the netbook PDA by iterating through token IDs and matching serial number.
   */
  private async findNetbookPdaBySerial(serialNumber: string): Promise<PublicKey | null> {
    const configPda = this.getConfigPda();
    const config = await getConfigAccount(this.program).fetch(configPda);
    const totalNetbooks = Number(config.totalNetbooks.toNumber());

    for (let tokenId = 0; tokenId < totalNetbooks; tokenId++) {
      const netbookPda = this.getNetbookPda(tokenId);
      try {
        const netbook = await getNetbookAccount(this.program).fetch(netbookPda);
        if (netbook.serialNumber === serialNumber) {
          return netbookPda;
        }
      } catch {
        // Account doesn't exist, continue
      }
    }

    return null;
  }

  // ========================================================================
  // Transaction Helpers
  // ========================================================================

  /**
   * Send a transaction with the given instruction and signers.
   * Includes compute budget priority fee for reliable execution.
   */
  private async sendTransaction(
    instruction: TransactionInstruction,
    signers: Keypair[]
  ): Promise<string> {
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_000_000,
    });

    const message = new TransactionMessage({
      payerKey: this.accounts.payer.publicKey,
      recentBlockhash: (await this.connection.getLatestBlockhash("max")).blockhash,
      instructions: [computeBudgetIx, instruction],
    });

    const compiledMessage = message.compileToV0Message([]);
    const tx = new VersionedTransaction(compiledMessage);

    // Add payer as signer if not already included
    const allSigners = signers.includes(this.accounts.payer)
      ? signers
      : [this.accounts.payer, ...signers];

    tx.sign(allSigners);

    const signature = await this.connection.sendTransaction(tx, {
      skipPreflight: true,
      maxRetries: 5,
    });

    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  // ========================================================================
  // Hash Utilities
  // ========================================================================

  /**
   * Create a 32-byte hash array from a numeric value.
   */
  createHash(value: number): number[] {
    return Array(32)
      .fill(value)
      .map((v) => v % 256);
  }

  /**
   * Create a 32-byte hash array from a string.
   */
  createStringHash(str: string): number[] {
    const hash = Array(32).fill(0);
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
   * Create a valid serial number for testing.
   */
  createSerialNumber(prefix: string = "NB", index: number = 1): string {
    return `${prefix}-${index.toString().padStart(6, "0")}`;
  }

  /**
   * Generate a unique serial number with timestamp.
   */
  generateUniqueSerial(prefix: string = "SN"): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a valid batch ID for testing.
   */
  createBatchId(
    manufacturer: string = "MFG",
    year: number = 2024,
    batch: number = 1
  ): string {
    return `${manufacturer}-${year}-${batch.toString().padStart(4, "0")}`;
  }

  /**
   * Create model specs for testing.
   */
  createModelSpecs(
    brand: string = "TestBrand",
    model: string = "ProBook",
    year: number = 2024
  ): string {
    return `${brand} ${model} ${year} - Intel Core i5, 8GB RAM, 256GB SSD`;
  }

  // ========================================================================
  // Complete Lifecycle Helper
  // ========================================================================

  /**
   * Execute the complete netbook lifecycle in sequence:
   * register -> audit -> validate -> assign
   *
   * @param serialNumber - Serial number for the netbook
   * @param batchId - Batch identifier
   * @param modelSpecs - Model specifications
   */
  async executeFullLifecycle(
    serialNumber: string,
    batchId?: string,
    modelSpecs?: string
  ): Promise<{
    register: string;
    audit: string;
    validate: string;
    assign: string;
    netbook: NetbookOnChain;
  }> {
    const batch = batchId || this.createBatchId();
    const specs = modelSpecs || this.createModelSpecs();

    // Step 1: Register
    const registerTx = await this.registerNetbook(serialNumber, batch, specs);

    // Step 2: Hardware Audit
    const auditTx = await this.auditHardware(serialNumber, true);

    // Step 3: Software Validation
    const validateTx = await this.validateSoftware(serialNumber, "Ubuntu 22.04 LTS", true);

    // Step 4: Assign to Student
    const assignTx = await this.assignToStudent(serialNumber);

    // Fetch final state
    const netbook = await this.getNetbookBySerial(serialNumber);
    if (!netbook) {
      throw new Error(`Netbook "${serialNumber}" not found after lifecycle`);
    }

    return {
      register: registerTx,
      audit: auditTx,
      validate: validateTx,
      assign: assignTx,
      netbook,
    };
  }
}
