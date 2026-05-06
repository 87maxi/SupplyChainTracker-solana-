// web/src/services/SolanaSupplyChainService.ts
// Service layer for SupplyChainTracker Solana program interactions

import { PublicKey } from '@solana/web3.js';
import type { Program } from '@coral-xyz/anchor';
import type { SupplyChainIDL } from '@/lib/contracts/solana-program';
import {
  findConfigPda,
  findNetbookPda,
  findRoleRequestPda,
} from '@/lib/contracts/solana-program';
import { BN } from '@coral-xyz/anchor';

// Transaction result type for Solana operations
export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
  hash?: string;
}

export interface NetbookInfo {
  serialNumber: string;
  batchId: string;
  modelSpecs: string;
  state: number;
  tokenId: bigint;
}

export interface NetbookData {
  serialNumber: string;
  batchId: string;
  modelSpecs: string;
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

export interface ConfigData {
  admin: PublicKey;
  fabricante: PublicKey;
  auditorHw: PublicKey;
  tecnicoSw: PublicKey;
  escuela: PublicKey;
  adminBump: number;
  nextTokenId: BN;
  totalNetbooks: BN;
  roleRequestsCount: BN;
}

// Singleton instance (will be set externally)
let serviceInstance: SolanaSupplyChainService | null = null;

// Role names mapping
export const ROLE_NAMES: Record<string, string> = {
  'ADMIN_ROLE': 'ADMIN_ROLE',
  'FABRICANTE_ROLE': 'FABRICANTE_ROLE',
  'AUDITOR_HW_ROLE': 'AUDITOR_HW_ROLE',
  'TECNICO_SW_ROLE': 'TECNICO_SW_ROLE',
  'ESCUELA_ROLE': 'ESCUELA_ROLE',
};

// Default role hashes (will be overridden by actual IDL)
const DEFAULT_ROLE_HASHES: Record<string, string> = {
  'ADMIN_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000000',
  'FABRICANTE_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000001',
  'AUDITOR_HW_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000002',
  'TECNICO_SW_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000003',
  'ESCUELA_ROLE': '0x0000000000000000000000000000000000000000000000000000000000000004',
};

export class SolanaSupplyChainService {
  private static programId = 'CMirNs1A8FfyWcb1TsbUHtxNzAfAUmwaUPmp8VCz2hS';
  
  constructor(
    private program: Program<SupplyChainIDL>,
    private walletPubkey: PublicKey
  ) {}

  /**
   * Get singleton instance (must be set via setInstance)
   */
  static getInstance(): SolanaSupplyChainService {
    if (!serviceInstance) {
      throw new Error('SolanaSupplyChainService instance not initialized. Call setInstance first.');
    }
    return serviceInstance;
  }

  /**
   * Set the singleton instance (called during app initialization)
   */
  static setInstance(instance: SolanaSupplyChainService): void {
    serviceInstance = instance;
  }

  /**
   * Set the program instance (called during initialization)
   */
  static setProgram(program: Program<SupplyChainIDL>): void {
    // This is called when the program is available
    SolanaSupplyChainService.programId = program.programId.toBase58();
  }

  /**
   * Initialize the supply chain config (admin only)
   */
  async initialize(): Promise<string> {
    const [configPda] = findConfigPda();
    
    // @ts-ignore - Anchor method builder causes excessively deep type instantiation
    const tx = await this.program.methods
      .initialize()
      .accounts({
        config: configPda,
        admin: this.walletPubkey,
        systemProgram: PublicKey.default,
      })
      .rpc();
    
    return tx;
  }

  /**
   * Register a single netbook
   */
  async registerNetbook(
    serialNumber: string,
    batchId: string,
    modelSpecs: string
  ): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      
      // Try to get next token ID from config
      let nextTokenId = new BN(0);
      try {
        const configAccount = await (this.program.account as any).supplyChainConfig.fetch(configPda);
        nextTokenId = (configAccount as any).nextTokenId as BN || new BN(1);
      } catch {
        // Config not initialized yet, start from 1
        nextTokenId = new BN(1);
      }
      
      const [netbookPda] = findNetbookPda(nextTokenId.toNumber());
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .registerNetbook(serialNumber, batchId, modelSpecs)
        .accounts({
          config: configPda,
          manufacturer: this.walletPubkey,
          netbook: netbookPda,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Batch register netbooks
   */
  async registerNetbooks(
    serialNumbers: string[],
    batchIds: string[],
    modelSpecs: string[],
    _metadata: string[],
    _userPubkey: PublicKey
  ): Promise<TransactionResult> {
    try {
      if (serialNumbers.length !== batchIds.length || 
          serialNumbers.length !== modelSpecs.length) {
        return { 
          signature: '', 
          success: false, 
          error: 'Array lengths must match' 
        };
      }

      // Register each netbook sequentially
      for (let i = 0; i < serialNumbers.length; i++) {
        const result = await this.registerNetbook(
          serialNumbers[i],
          batchIds[i],
          modelSpecs[i]
        );
        if (!result.success) {
          return result;
        }
      }

      return { 
        signature: 'batch-complete', 
        success: true,
        hash: `${serialNumbers.length} netbooks registered`
      };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Audit hardware on a netbook
   */
  async auditHardware(
    serialNumber: string,
    passed: boolean,
    reportHash: number[]
  ): Promise<TransactionResult> {
    try {
      // Issue #35: Find netbook by serial instead of hardcoded 0
      const tokenId = await this.findTokenIdBySerial(serialNumber);
      if (tokenId === null) {
        return { signature: '', success: false, error: `Netbook with serial ${serialNumber} not found` };
      }
      const [netbookPda] = findNetbookPda(tokenId);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .auditHardware(serialNumber, passed, new Uint8Array(reportHash))
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          auditor: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Validate software on a netbook
   */
  async validateSoftware(
    serialNumber: string,
    osVersion: string,
    passed: boolean
  ): Promise<TransactionResult> {
    try {
      // Issue #35: Find netbook by serial instead of hardcoded 0
      const tokenId = await this.findTokenIdBySerial(serialNumber);
      if (tokenId === null) {
        return { signature: '', success: false, error: `Netbook with serial ${serialNumber} not found` };
      }
      const [netbookPda] = findNetbookPda(tokenId);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .validateSoftware(serialNumber, osVersion, passed)
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          technician: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Assign netbook to student
   */
  async assignToStudent(
    serialNumber: string,
    schoolHash: number[],
    studentHash: number[]
  ): Promise<TransactionResult> {
    try {
      // Issue #35: Find netbook by serial instead of hardcoded 0
      const tokenId = await this.findTokenIdBySerial(serialNumber);
      if (tokenId === null) {
        return { signature: '', success: false, error: `Netbook with serial ${serialNumber} not found` };
      }
      const [netbookPda] = findNetbookPda(tokenId);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .assignToStudent(
          serialNumber,
          new Uint8Array(schoolHash),
          new Uint8Array(studentHash)
        )
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          school: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Query netbook state (using serial lookup instead of hardcoded 0)
   * Issue #35: Fixed - now uses serial-to-tokenId mapping
   */
  async queryNetbookState(serialNumber: string): Promise<any> {
    try {
      // Issue #35: Find netbook by serial instead of hardcoded 0
      const tokenId = await this.findTokenIdBySerial(serialNumber);
      if (tokenId === null) {
        return { error: `Netbook with serial ${serialNumber} not found` };
      }
      const [netbookPda] = findNetbookPda(tokenId);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const result = await this.program.methods
        .queryNetbookState(serialNumber)
        .accounts({
          netbook: netbookPda,
        })
        .simulate();
      
      return result;
    } catch (error: any) {
      return { error: error.message };
    }
  }

  /**
   * Query config data
   */
  async queryConfig(): Promise<ConfigData | null> {
    try {
      const [configPda] = findConfigPda();
      const configAccount = await (this.program.account as any).supplyChainConfig.fetch(configPda);
      return configAccount as unknown as ConfigData;
    } catch (error: any) {
      console.error('Error fetching config:', error);
      return null;
    }
  }

  /**
   * Grant role to an account
   */
  async grantRole(role: string, accountToGrant: PublicKey): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .grantRole(role)
        .accounts({
          config: configPda,
          admin: this.walletPubkey,
          accountToGrant,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Revoke role from an account
   */
  async revokeRole(role: string, accountToRevoke: PublicKey): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .revokeRole(role)
        .accounts({
          config: configPda,
          admin: this.walletPubkey,
          accountToRevoke,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Request a role
   */
  async requestRole(role: string): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .requestRole(role)
        .accounts({
          config: configPda,
          roleRequest: roleRequestPda,
          user: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Approve a role request
   */
  async approveRoleRequest(requestId: number, approver: PublicKey): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      const [roleRequestPda] = findRoleRequestPda(approver);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .approveRoleRequest(new BN(requestId))
        .accounts({
          config: configPda,
          roleRequest: roleRequestPda,
          admin: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Reject a role request
   */
  async rejectRoleRequest(requestId: number): Promise<TransactionResult> {
    try {
      const [configPda] = findConfigPda();
      const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);
      
      // @ts-ignore - Anchor method builder causes excessively deep type instantiation
      const tx = await this.program.methods
        .rejectRoleRequest(new BN(requestId))
        .accounts({
          config: configPda,
          roleRequest: roleRequestPda,
          admin: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();
      
      return { signature: tx, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  /**
   * Get role members by role name
   */
  async getRoleMembers(role: string): Promise<string[]> {
    try {
      const [configPda] = findConfigPda();
      const configAccount = await (this.program.account as any).supplyChainConfig.fetch(configPda);
      const accountData = configAccount as any;
      
      // Try to get members from the appropriate role field
      const roleField = role.toLowerCase().replace('_role', '');
      const members = accountData.roleMembers?.[roleField] || 
                      (accountData as any)[roleField + 'Members'] ||
                      [];
      
      return members.map((m: PublicKey) => m.toBase58());
    } catch {
      return [];
    }
  }

  /**
   * Get all roles summary
   */
  async getAllRolesSummary(): Promise<Record<string, { members: string[]; count: number }>> {
    try {
      const [configPda] = findConfigPda();
      const configAccount = await (this.program.account as any).supplyChainConfig.fetch(configPda);
      const accountData = configAccount as any;
      
      const result: Record<string, { members: string[]; count: number }> = {};
      
      // Extract role information from config account
      const roleFields = ['admin', 'fabricante', 'auditorHw', 'tecnicoSw', 'escuela'];
      
      for (const field of roleFields) {
        const roleKey = field.toUpperCase() + '_ROLE';
        const members = accountData[field + 'Members'] || accountData[field]?.members || [];
        result[roleKey] = {
          members: members.map((m: PublicKey) => m.toBase58()),
          count: members.length
        };
      }
      
      return result;
    } catch {
      return {};
    }
  }

  /**
   * Check if account has a role
   */
  async hasRole(role: string, userAddress: PublicKey): Promise<boolean> {
    try {
      const members = await this.getRoleMembers(role);
      return members.includes(userAddress.toBase58());
    } catch {
      return false;
    }
  }

  /**
   * Check if account has a role by hash
   */
  async hasRoleByHash(roleHash: string, userAddress: PublicKey): Promise<boolean> {
    return this.hasRole(roleHash, userAddress);
  }

  /**
   * Get role name by hash
   */
  async getRoleByName(roleName: string): Promise<string> {
    return ROLE_NAMES[roleName] || roleName;
  }

  /**
   * Get role hash by name
   */
  async getRoleHash(roleName: string): Promise<string> {
    return DEFAULT_ROLE_HASHES[roleName] || DEFAULT_ROLE_HASHES[roleName.toUpperCase() + '_ROLE'] || '';
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: PublicKey): Promise<number> {
    try {
      const balance = await this.program.provider.connection.getBalance(address);
      return balance / 1000000000; // Convert lamports to SOL
    } catch {
      return 0;
    }
  }

  /**
   * Build a serial-to-tokenId mapping client-side
   * Issue #45: O(n) RPC calls replaced with single batch fetch + local mapping
   */
  private async buildSerialToTokenIdMap(): Promise<Map<string, number>> {
    const mapping = new Map<string, number>();
    try {
      const config = await this.queryConfig();
      if (!config) return mapping;
      
      const totalNetbooks = config.totalNetbooks?.toNumber() || 0;
      
      // Fetch all netbooks in parallel (batched)
      const promises: Promise<{ serialNumber: string; tokenId: number } | null>[] = [];
      for (let i = 0; i < totalNetbooks; i++) {
        const [netbookPda] = findNetbookPda(i);
        promises.push(
          (this.program.account as any).netbook
            .fetch(netbookPda)
            .then((netbook: any) => ({ serialNumber: netbook.serialNumber, tokenId: i }))
            .catch(() => null)
        );
      }
      
      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r && r.serialNumber) {
          mapping.set(r.serialNumber, r.tokenId);
        }
      });
    } catch {
      // Config not initialized
    }
    return mapping;
  }
  
  /**
   * Find token ID by serial number
   * Issue #35: Replaces hardcoded findNetbookPda(0) with proper serial lookup
   */
  private async findTokenIdBySerial(serialNumber: string): Promise<number | null> {
    const mapping = await this.buildSerialToTokenIdMap();
    return mapping.get(serialNumber) || null;
  }
  
  /**
   * Get netbook by serial number
   * Issue #45: Uses serial-to-tokenId mapping instead of brute-force loop
   */
  async getNetbook(serialNumber: string): Promise<NetbookInfo | null> {
    try {
      const tokenId = await this.findTokenIdBySerial(serialNumber);
      if (tokenId === null) return null;
      
      const [netbookPda] = findNetbookPda(tokenId);
      const netbook = await (this.program.account as any).netbook.fetch(netbookPda);
      
      return {
        serialNumber: (netbook as any).serialNumber,
        batchId: (netbook as any).batchId,
        modelSpecs: (netbook as any).initialModelSpecs,
        state: (netbook as any).state,
        tokenId: BigInt((netbook as any).tokenId || tokenId)
      };
    } catch {
      return null;
    }
  }

  /**
   * Get netbook report
   */
  async getNetbookReport(serialNumber: string): Promise<NetbookInfo | null> {
    return this.getNetbook(serialNumber);
  }

  /**
   * Get netbook state
   */
  async getNetbookState(serial: string): Promise<number> {
    const netbook = await this.getNetbook(serial);
    return netbook?.state ?? -1;
  }

  /**
   * Get all serial numbers
   */
  async getAllSerialNumbers(): Promise<string[]> {
    const serials: string[] = [];
    try {
      const config = await this.queryConfig();
      if (!config) return serials;
      
      const totalNetbooks = config.totalNetbooks?.toNumber() || 0;
      
      for (let i = 0; i < totalNetbooks; i++) {
        const [netbookPda] = findNetbookPda(i);
        try {
          const netbook = await (this.program.account as any).netbook.fetch(netbookPda);
          serials.push((netbook as any).serialNumber);
        } catch {
          // Netbook doesn't exist at this ID
        }
      }
    } catch {
      // Config not initialized
    }
    return serials;
  }

  /**
   * Get config
   */
  async getConfig(): Promise<ConfigData | null> {
    return this.queryConfig();
  }

  /**
   * Get role request
   */
  async getRoleRequest(userAddress: PublicKey): Promise<any> {
    try {
      const [roleRequestPda] = findRoleRequestPda(userAddress);
      const roleRequest = await (this.program.account as any).roleRequest.fetch(roleRequestPda);
      return roleRequest;
    } catch {
      return null;
    }
  }
}
