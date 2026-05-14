// web/src/lib/contracts/solana-program.ts
// Codama program interaction layer for SupplyChainTracker on Solana
// Migrated from Anchor to Codama (Issue #209)

import {
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
  type ProgramDerivedAddress,
} from '@solana/kit';

import {
  scSolanaProgram,
  SC_SOLANA_PROGRAM_ADDRESS,
  // PDA finders - imported with aliases to avoid name conflicts with local wrappers
  findConfigPda as findConfigPdaGenerated,
  findDeployerPda as findDeployerPdaGenerated,
  findRoleRequestPda as findRoleRequestPdaGenerated,
  findRoleHolderPda as findRoleHolderPdaGenerated,
  findAdminPda as findAdminPdaGenerated,
  findSerialHashRegistryPda as findSerialHashRegistryPdaGenerated,
  type ScSolanaPlugin,
  getRegisterNetbookInstruction,
  getAuditHardwareInstruction,
  getValidateSoftwareInstruction,
  getAssignToStudentInstruction,
  getGrantRoleInstructionAsync,
  getRevokeRoleInstructionAsync,
  getRequestRoleInstructionAsync,
  getApproveRoleRequestInstructionAsync,
  getRejectRoleRequestInstructionAsync,
  type RegisterNetbookInput,
  type AuditHardwareInput,
  type ValidateSoftwareInput,
  type AssignToStudentInput,
  type GrantRoleAsyncInput,
  type RevokeRoleAsyncInput,
  type RequestRoleAsyncInput,
  type ApproveRoleRequestAsyncInput,
  type RejectRoleRequestAsyncInput,
} from '@/generated/src/generated';
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { useMemo } from 'react';

// ============================================================================
// Program Address
// ============================================================================

/**
 * Program ID for the SupplyChainTracker program.
 *
 * Uses NEXT_PUBLIC_PROGRAM_ID from environment when available,
 * falling back to the Codama-generated address.
 */
function getProgramId(): Address {
  const envProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (envProgramId) {
    return envProgramId as Address;
  }
  return SC_SOLANA_PROGRAM_ADDRESS;
}

export const PROGRAM_ID = getProgramId();

/**
 * Get the raw program ID string (for compatibility with existing code).
 */
export function getProgramIdString(): string {
  return PROGRAM_ID;
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Codama SupplyChain program plugin type.
 * Provides instruction builders, account codecs, and PDA derivation.
 */
export type SupplyChainProgram = ScSolanaPlugin;

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Cast a string to Address type (nominal typing helper).
 * @solana/kit uses branded Address types that don't accept plain strings.
 */
export function toAddress(str: string): Address {
  return str as Address;
}

// ============================================================================
// PDA Derivation Functions
// ============================================================================

/**
 * Find PDA for deployer (PDA-First Architecture).
 * Deployer PDA is the central payer for account creation.
 *
 * @returns Promise resolving to the deployer PDA address
 */
export const findDeployerPdaAsync = async (): Promise<ProgramDerivedAddress> => {
  return findDeployerPdaGenerated({ programAddress: PROGRAM_ID });
};

/**
 * Find PDA (Program Derived Address) for config.
 *
 * @returns Promise resolving to the config PDA address
 */
export const findConfigPdaAsync = async (): Promise<ProgramDerivedAddress> => {
  return findConfigPdaGenerated({ programAddress: PROGRAM_ID });
};

/**
 * Find PDA for netbook account.
 * Uses token_id as part of the seed (Issue #17 - fixed PDA derivation).
 *
 * @param tokenId - The token ID for the netbook
 * @returns Promise resolving to the netbook PDA address
 */
export const findNetbookPdaAsync = async (
  tokenId: number | bigint,
): Promise<ProgramDerivedAddress> => {
  const tokenIdBuffer = new Uint8Array(8);
  let remaining = BigInt(tokenId);
  for (let i = 0; i < 8; i++) {
    tokenIdBuffer[i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }

  return getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([110, 101, 116, 98, 111, 111, 107])), // "netbook"
      getBytesEncoder().encode(tokenIdBuffer),
    ],
  });
};

/**
 * Find PDA for role request.
 * NOTE: Due to PDA seed design, each user can only have ONE role request at a time.
 * To request a different role, the existing request must be rejected first.
 * @see https://github.com/87maxi/SupplyChainTracker-solana-/issues/44
 *
 * @param user - The user's address
 * @returns Promise resolving to the role request PDA address
 */
export const findRoleRequestPdaAsync = async (
  user: Address,
): Promise<ProgramDerivedAddress> => {
  return findRoleRequestPdaGenerated(
    { user },
    { programAddress: PROGRAM_ID },
  );
};

/**
 * Find PDA for role holder.
 *
 * @param account - The account address to look up
 * @returns Promise resolving to the role holder PDA address
 */
export const findRoleHolderPdaAsync = async (
  account: Address,
): Promise<ProgramDerivedAddress> => {
  return findRoleHolderPdaGenerated(
    { accountToAdd: account },
    { programAddress: PROGRAM_ID },
  );
};

/**
 * Find PDA for admin.
 * Seeds: [b"admin", config_key]
 *
 * @param config - The config account address
 * @returns Promise resolving to the admin PDA address
 */
export const findAdminPdaAsync = async (
  config: Address,
): Promise<ProgramDerivedAddress> => {
  return findAdminPdaGenerated(
    { config },
    { programAddress: PROGRAM_ID },
  );
};

/**
 * Find PDA for serial hash registry.
 * Seeds: [b"serial_hashes", config_key]
 *
 * @param config - The config account address
 * @returns Promise resolving to the serial hash registry PDA address
 */
export const findSerialHashRegistryPdaAsync = async (
  config: Address,
): Promise<ProgramDerivedAddress> => {
  return findSerialHashRegistryPdaGenerated(
    { config },
    { programAddress: PROGRAM_ID },
  );
};

// ============================================================================
// Transaction Builder Functions (Codama Instruction Builders)
// ============================================================================

/**
 * Build register_netbook instruction using Codama instruction builder.
 */
export const buildRegisterNetbookTx = (
  input: RegisterNetbookInput,
): ReturnType<typeof getRegisterNetbookInstruction> => {
  return getRegisterNetbookInstruction(input, { programAddress: PROGRAM_ID });
};

/**
 * Build audit_hardware instruction using Codama instruction builder.
 */
export const buildAuditHardwareTx = (
  input: AuditHardwareInput,
): ReturnType<typeof getAuditHardwareInstruction> => {
  return getAuditHardwareInstruction(input, { programAddress: PROGRAM_ID });
};

/**
 * Build validate_software instruction using Codama instruction builder.
 */
export const buildValidateSoftwareTx = (
  input: ValidateSoftwareInput,
): ReturnType<typeof getValidateSoftwareInstruction> => {
  return getValidateSoftwareInstruction(input, { programAddress: PROGRAM_ID });
};

/**
 * Build assign_to_student instruction using Codama instruction builder.
 */
export const buildAssignToStudentTx = (
  input: AssignToStudentInput,
): ReturnType<typeof getAssignToStudentInstruction> => {
  return getAssignToStudentInstruction(input, { programAddress: PROGRAM_ID });
};

/**
 * Build grant_role instruction using Codama async instruction builder.
 * Resolves admin PDA automatically from config.
 */
export const buildGrantRoleTx = async (
  input: GrantRoleAsyncInput,
): Promise<ReturnType<typeof getGrantRoleInstructionAsync>> => {
  return getGrantRoleInstructionAsync(input, { programAddress: PROGRAM_ID });
};

/**
 * Build revoke_role instruction using Codama async instruction builder.
 * Resolves admin PDA automatically from config.
 */
export const buildRevokeRoleTx = async (
  input: RevokeRoleAsyncInput,
): Promise<ReturnType<typeof getRevokeRoleInstructionAsync>> => {
  return getRevokeRoleInstructionAsync(input, { programAddress: PROGRAM_ID });
};

/**
 * Build request_role instruction using Codama async instruction builder.
 * Resolves role_request PDA automatically from user.
 */
export const buildRequestRoleTx = async (
  input: RequestRoleAsyncInput,
): Promise<ReturnType<typeof getRequestRoleInstructionAsync>> => {
  return getRequestRoleInstructionAsync(input, { programAddress: PROGRAM_ID });
};

/**
 * Build approve_role_request instruction using Codama async instruction builder.
 * Resolves admin PDA automatically from config.
 */
export const buildApproveRoleRequestTx = async (
  input: ApproveRoleRequestAsyncInput,
): Promise<ReturnType<typeof getApproveRoleRequestInstructionAsync>> => {
  return getApproveRoleRequestInstructionAsync(input, {
    programAddress: PROGRAM_ID,
  });
};

/**
 * Build reject_role_request instruction using Codama async instruction builder.
 * Resolves admin PDA automatically from config.
 */
export const buildRejectRoleRequestTx = async (
  input: RejectRoleRequestAsyncInput,
): Promise<ReturnType<typeof getRejectRoleRequestInstructionAsync>> => {
  return getRejectRoleRequestInstructionAsync(input, {
    programAddress: PROGRAM_ID,
  });
};

// ============================================================================
// Backward-Compatible Exports (Legacy Name Aliases)
// ============================================================================

/**
 * @deprecated Use findConfigPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findConfigPda = findConfigPdaAsync;

/**
 * @deprecated Use findDeployerPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findDeployerPda = findDeployerPdaAsync;

/**
 * @deprecated Use findNetbookPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findNetbookPda = findNetbookPdaAsync;

/**
 * @deprecated Use findRoleRequestPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findRoleRequestPda = findRoleRequestPdaAsync;

/**
 * @deprecated Use findRoleHolderPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findRoleHolderPda = findRoleHolderPdaAsync;

/**
 * @deprecated Use findAdminPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findAdminPda = findAdminPdaAsync;

/**
 * @deprecated Use findSerialHashRegistryPdaAsync instead.
 * Backward-compatible alias for the old Anchor-style function name.
 */
export const findSerialHashRegistryPda = findSerialHashRegistryPdaAsync;

/**
 * @deprecated This function is no longer used with Codama.
 * Codama uses standalone instruction builders instead of a Program instance.
 * Use the buildTx.* functions or getScSolanaProgramPlugin() instead.
 */
export function getProgram() {
  return getScSolanaProgramPlugin();
}

// ============================================================================
// Program Plugin Factory
// ============================================================================

/**
 * Get the sc-solana program plugin configuration.
 * This returns the plugin factory function that can be used with
 * `client.use(scSolanaProgram())` to extend a Codama client.
 */
export function getScSolanaProgramPlugin() {
  return scSolanaProgram();
}

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook to get the SupplyChain program tools using Codama.
 *
 * Returns Codama instruction builders, PDA derivation functions,
 * and connection context for the SupplyChain program.
 *
 * @example
 * ```tsx
 * const { program, connection, findPda, buildTx } = useSupplyChainProgram();
 * const configPda = await findPda.config();
 * const instruction = buildTx.registerNetbook({ config: configPda, ... });
 * ```
 */
export function useSupplyChainProgram() {
  const { publicKey, isConnected } = useSolanaWeb3();

  const rpcUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_RPC_URL ||
      `https://api.${process.env.NEXT_PUBLIC_CLUSTER || 'devnet'}.solana.com`
    );
  }, []);

  // PDA derivation functions (memoized).
  const findPda = useMemo(
    () => ({
      deployer: findDeployerPdaAsync,
      config: findConfigPdaAsync,
      netbook: findNetbookPdaAsync,
      roleRequest: findRoleRequestPdaAsync,
      roleHolder: findRoleHolderPdaAsync,
      admin: findAdminPdaAsync,
      serialHashRegistry: findSerialHashRegistryPdaAsync,
    }),
    [],
  );

  // Instruction builder functions (memoized).
  const buildTx = useMemo(
    () => ({
      registerNetbook: buildRegisterNetbookTx,
      auditHardware: buildAuditHardwareTx,
      validateSoftware: buildValidateSoftwareTx,
      assignToStudent: buildAssignToStudentTx,
      grantRole: buildGrantRoleTx,
      revokeRole: buildRevokeRoleTx,
      requestRole: buildRequestRoleTx,
      approveRoleRequest: buildApproveRoleRequestTx,
      rejectRoleRequest: buildRejectRoleRequestTx,
    }),
    [],
  );

  return {
    /** Program ID address */
    programId: PROGRAM_ID,
    /** RPC URL for the current cluster */
    connection: rpcUrl,
    /** Connected wallet public key (or null) */
    publicKey: isConnected ? publicKey : null,
    /** Whether wallet is connected */
    isConnected,
    /** PDA derivation functions */
    findPda,
    /** Instruction builder functions */
    buildTx,
    /** Program plugin factory (for client extension) */
    programPlugin: getScSolanaProgramPlugin(),
  };
}
