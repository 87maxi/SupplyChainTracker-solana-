/**
 * Hybrid Client Module - Unified Test Client
 *
 * Provides a unified interface for testing the SupplyChainTracker program
 * by automatically routing instructions to the appropriate client:
 *
 * - PDA instructions (grantRole, initialize, fundDeployer, etc.) → Anchor wrapper
 * - Non-PDA instructions (registerNetbook, auditHardware, query, etc.) → Codama client
 *
 * This solves the Codama PDA seed incompatibility (Issue #3012) while maximizing
 * Codama usage for non-PDA instructions.
 *
 * @see CODAMA-INCOMPATIBILITIES.md
 * @see Issue #218
 */

import type { Keypair } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import type { Address } from "@solana/kit";
import type { AnchorClientConfig } from "./anchor-client-wrapper";
import type {
  TestAccounts,
  RoleType,
  NetbookRegistrationData,
  HardwareAuditData,
  SoftwareValidationData,
  StudentAssignmentData,
} from "./test-helpers";

// ============================================================================
// Program Constants
// ============================================================================

/** Program ID (consistent across all tests) */
export const PROGRAM_ID = "BTSWNY97FaxeJrUNSq399tRbfMz68iaaY3csJwT9hQQW";

/** Role type constants (consistent with test-helpers.ts) */
export const ROLES = {
  FABRICANTE: "FABRICANTE",
  AUDITOR_HW: "AUDITOR_HW",
  TECNICO_SW: "TECNICO_SW",
  ESCUELA: "ESCUELA",
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];

// ============================================================================
// Hybrid Client Interface
// ============================================================================

/**
 * Configuration for the hybrid client
 */
export interface HybridClientConfig {
  /** RPC URL */
  rpcUrl: string;
  /** WebSocket URL */
  wsUrl?: string;
  /** Payer keypair */
  payer: Keypair;
  /** Test accounts (optional, can be created inline) */
  accounts?: TestAccounts;
  /** Commitment level */
  commitment?: "processed" | "confirmed" | "finalized";
}

/**
 * Result of executing an instruction
 */
export interface TransactionResult {
  /** Transaction signature */
  signature: string;
}

/**
 * Hybrid client that routes instructions to appropriate backend
 */
export interface HybridClient {
  /** RPC URL */
  rpcUrl: string;
  /** Program ID */
  programId: string;

  // ========================================================================
  // Initialization
  // ========================================================================

  /** Initialize supply chain config (PDA - Anchor) */
  initialize(
    config: AnchorClientConfig
  ): Promise<TransactionResult>;

  // ========================================================================
  // Role Management (PDA - Anchor)
  // ========================================================================

  /** Grant role to account (PDA - Anchor) */
  grantRole(
    config: AnchorClientConfig,
    role: RoleValue,
    adminPda: PublicKey,
    accountToGrant: PublicKey,
    extraSigners?: Keypair[]
  ): Promise<TransactionResult>;

  /** Revoke role (PDA - Anchor) */
  revokeRole(
    config: AnchorClientConfig,
    role: RoleValue,
    adminPda: PublicKey,
    accountToRevoke: PublicKey,
    extraSigners?: Keypair[]
  ): Promise<TransactionResult>;

  // ========================================================================
  // Deployer Operations (PDA - Anchor)
  // ========================================================================

  /** Fund deployer account (PDA - Anchor) */
  fundDeployer(
    config: AnchorClientConfig,
    amount: bigint | number,
    extraSigners?: Keypair[]
  ): Promise<TransactionResult>;

  // ========================================================================
  // PDA Derivation Helpers
  // ========================================================================

  /** Derive Admin PDA */
  deriveAdminPda(configPda: PublicKey): Promise<PublicKey>;

  /** Derive Deployer PDA */
  deriveDeployerPda(): Promise<PublicKey>;

  /** Derive Config PDA */
  deriveConfigPda(): Promise<PublicKey>;

  /** Derive Netbook PDA */
  deriveNetbookPda(tokenId: bigint | number): Promise<PublicKey>;

  /** Derive RoleHolder PDA */
  deriveRoleHolderPda(account: PublicKey): Promise<PublicKey>;

  /** Derive RoleRequest PDA */
  deriveRoleRequestPda(user: PublicKey): Promise<PublicKey>;

  /** Derive SerialHashRegistry PDA */
  deriveSerialHashRegistryPda(config: PublicKey): Promise<PublicKey>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a hybrid client instance
 */
export async function createHybridClient(
  config: HybridClientConfig
): Promise<HybridClient> {
  const { rpcUrl, payer } = config;

  const anchorConfig: AnchorClientConfig = {
    rpcUrl,
    payer,
    commitment: config.commitment as any,
  };

  // Dynamically import anchor-client-wrapper to avoid circular dependencies
  const anchorWrapper = async () => {
    const module = await import("./anchor-client-wrapper");
    return module;
  };

  return {
    rpcUrl,
    programId: PROGRAM_ID,

    // Initialize
    async initialize(cfg) {
      const wrapper = await anchorWrapper();
      const signature = await wrapper.initializeViaAnchor(cfg);
      return { signature };
    },

    // Role Management
    async grantRole(cfg, role, adminPda, accountToGrant, extraSigners) {
      const wrapper = await anchorWrapper();
      const signature = await wrapper.grantRoleViaAnchor(
        cfg,
        adminPda,
        accountToGrant,
        role,
        extraSigners
      );
      return { signature };
    },

    async revokeRole(cfg, role, adminPda, accountToRevoke, extraSigners) {
      // Revoke role via Anchor - use executeAnchorInstruction directly
      const { getAnchorClient, executeAnchorInstruction, deriveConfigPda, deriveAdminPda } = await anchorWrapper();
      const program = await getAnchorClient(cfg);
      const configPda = await deriveConfigPda();
      const [adminPdaDerived] = await deriveAdminPda(configPda[0]);

      const signature = await executeAnchorInstruction(
        program,
        "revokeRole",
        {
          config: configPda[0],
          admin: adminPdaDerived,
          accountToRevoke: accountToRevoke,
          systemProgram: new PublicKey("11111111111111111111111111111111"),
        },
        [role],
        { signers: extraSigners }
      );
      return { signature };
    },

    // Deployer Operations
    async fundDeployer(cfg, amount, extraSigners) {
      const wrapper = await anchorWrapper();
      const signature = await wrapper.fundDeployerViaAnchor(
        cfg,
        amount,
        extraSigners
      );
      return { signature };
    },

    // PDA Derivation
    async deriveAdminPda(configPda) {
      const wrapper = await anchorWrapper();
      const [adminPda] = await wrapper.deriveAdminPda(configPda);
      return adminPda;
    },

    async deriveDeployerPda() {
      const wrapper = await anchorWrapper();
      const [deployerPda] = await wrapper.deriveDeployerPda();
      return deployerPda;
    },

    async deriveConfigPda() {
      const wrapper = await anchorWrapper();
      const [configPda] = await wrapper.deriveConfigPda();
      return configPda;
    },

    async deriveNetbookPda(tokenId) {
      const wrapper = await anchorWrapper();
      const [netbookPda] = await wrapper.deriveNetbookPda(tokenId);
      return netbookPda;
    },

    async deriveRoleHolderPda(account) {
      const wrapper = await anchorWrapper();
      const [roleHolderPda] = await wrapper.deriveRoleHolderPda(account);
      return roleHolderPda;
    },

    async deriveRoleRequestPda(user) {
      const wrapper = await anchorWrapper();
      const [roleRequestPda] = await wrapper.deriveRoleRequestPda(user);
      return roleRequestPda;
    },

    async deriveSerialHashRegistryPda(config) {
      const wrapper = await anchorWrapper();
      const [registryPda] = await wrapper.deriveSerialHashRegistryPda(config);
      return registryPda;
    },
  };
}

/**
 * Create a default test accounts set
 */
export async function createDefaultTestAccounts(): Promise<TestAccounts> {
  const { Keypair } = await import("@solana/web3.js");

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
 * Create a fully configured hybrid client with test accounts
 */
export async function createTestHybridClient(
  rpcUrl: string,
  payer: Keypair,
  options?: {
    commitment?: "processed" | "confirmed" | "finalized";
  }
): Promise<{ client: HybridClient; accounts: TestAccounts }> {
  const accounts = await createDefaultTestAccounts();

  const client = await createHybridClient({
    rpcUrl,
    payer,
    accounts,
    commitment: options?.commitment,
  });

  return { client, accounts };
}
