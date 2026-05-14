// web/src/services/SolanaSupplyChainService.ts
// @deprecated Use UnifiedSupplyChainService from './UnifiedSupplyChainService' instead
// This file provides backward compatibility by delegating to UnifiedSupplyChainService

import { PublicKey } from '@solana/web3.js';
import { Address } from '@solana/kit';
import { UnifiedSupplyChainService } from './UnifiedSupplyChainService';

// ==================== Legacy Type Exports ====================

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
  hwAuditor: Address;
  hwIntegrityPassed: boolean;
  hwReportHash: Uint8Array;
  swTechnician: Address;
  osVersion: string;
  swValidationPassed: boolean;
  destinationSchoolHash: Uint8Array;
  studentIdHash: Uint8Array;
  distributionTimestamp: bigint;
  state: number;
  exists: boolean;
  tokenId: bigint;
}

export interface ConfigData {
  admin: Address;
  fabricante: Address;
  auditorHw: Address;
  tecnicoSw: Address;
  escuela: Address;
  adminBump: number;
  nextTokenId: bigint;
  totalNetbooks: bigint;
  roleRequestsCount: bigint;
}

// ==================== Legacy Class (Compatibility Shim) ====================

/**
 * @deprecated Use UnifiedSupplyChainService.getInstance() instead.
 * This class delegates all calls to UnifiedSupplyChainService for backward compatibility.
 */
export class SolanaSupplyChainService {
  private unifiedService: UnifiedSupplyChainService;

  constructor() {
    this.unifiedService = UnifiedSupplyChainService.getInstance();
  }

  static getInstance(): SolanaSupplyChainService {
    // Return the unified service wrapped in legacy interface
    const instance = new SolanaSupplyChainService();
    return instance;
  }

  static setInstance(_instance: SolanaSupplyChainService): void {
    // No-op in new architecture; UnifiedSupplyChainService uses its own singleton
    void _instance;
    console.warn('SolanaSupplyChainService.setInstance() is deprecated. Use UnifiedSupplyChainService.initialize() instead.');
  }

  static setProgram(_program: any): void {
    void _program;
    console.warn('SolanaSupplyChainService.setProgram() is deprecated.');
  }

  // ==================== Delegated Methods ====================

  async initialize(): Promise<string> {
    console.warn('SolanaSupplyChainService.initialize() is deprecated. Use UnifiedSupplyChainService instead.');
    return '';
  }

  async registerNetbook(serialNumber: string, batchId: string, modelSpecs: string): Promise<TransactionResult> {
    try {
      const result = await this.unifiedService.registerNetbook(serialNumber, batchId, modelSpecs);
      return { signature: result.signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async registerNetbooks(
    serialNumbers: string[],
    batchIds: string[],
    modelSpecs: string[],
    _metadata: string[],
    _userPubkey: PublicKey
  ): Promise<TransactionResult> {
    try {
      if (serialNumbers.length !== batchIds.length || serialNumbers.length !== modelSpecs.length) {
        return { signature: '', success: false, error: 'Array lengths must match' };
      }
      // Register each sequentially
      for (let i = 0; i < serialNumbers.length; i++) {
        const result = await this.registerNetbook(serialNumbers[i], batchIds[i], modelSpecs[i]);
        if (!result.success) {
          return result;
        }
      }
      return { signature: '', success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async auditHardware(serialNumber: string, passed: boolean, reportHash: number[]): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.auditHardware(serialNumber, passed, reportHash);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async validateSoftware(serialNumber: string, osVersion: string, passed: boolean): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.validateSoftware(serialNumber, osVersion, passed);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async assignToStudent(serialNumber: string, schoolHash: number[], studentHash: number[]): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.assignToStudent(serialNumber, schoolHash, studentHash);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async queryNetbookState(serialNumber: string): Promise<any> {
    return this.unifiedService.queryNetbookState(serialNumber);
  }

  async queryConfig(): Promise<ConfigData | null> {
    return this.unifiedService.queryConfig();
  }

  async grantRole(role: string, accountToGrant: Address): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.grantRole(role, accountToGrant);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async revokeRole(role: string, accountToRevoke: Address): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.revokeRole(role, accountToRevoke);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async requestRole(role: string): Promise<TransactionResult> {
    try {
      const signature = await this.unifiedService.requestRole(role);
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async approveRoleRequest(_requestId: number, _approver: PublicKey): Promise<TransactionResult> {
    console.warn('approveRoleRequest with requestId is deprecated. Use UnifiedSupplyChainService.approveRoleRequest(role) instead.');
    try {
      const signature = await this.unifiedService.approveRoleRequest('');
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async rejectRoleRequest(_requestId: number): Promise<TransactionResult> {
    console.warn('rejectRoleRequest with requestId is deprecated. Use UnifiedSupplyChainService.rejectRoleRequest(role) instead.');
    try {
      const signature = await this.unifiedService.rejectRoleRequest('');
      return { signature, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error.message };
    }
  }

  async getRoleMembers(role: string): Promise<string[]> {
    return this.unifiedService.getAllMembers(role);
  }

  async getAllRolesSummary(): Promise<Record<string, { members: string[]; count: number }>> {
    const roles = ['ADMIN_ROLE', 'FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'];
    const summary: Record<string, { members: string[]; count: number }> = {};
    for (const role of roles) {
      const members = await this.unifiedService.getAllMembers(role);
      summary[role] = { members, count: members.length };
    }
    return summary;
  }

  async hasRole(role: string, userAddress: Address): Promise<boolean> {
    return this.unifiedService.hasRole(role, userAddress);
  }

  async getAccountBalance(_address: Address): Promise<number> {
    void _address;
    console.warn('getAccountBalance is not implemented in UnifiedSupplyChainService');
    return 0;
  }

  async getNetbook(serialNumber: string): Promise<NetbookInfo | null> {
    const data = await this.unifiedService.findNetbookBySerial(serialNumber);
    if (!data) return null;
    return {
      serialNumber: data.serialNumber,
      batchId: data.batchId,
      modelSpecs: data.initialModelSpecs,
      state: data.state,
      tokenId: BigInt(data.tokenId.toString()),
    };
  }

  async getNetbookState(serial: string): Promise<number> {
    return this.unifiedService.getNetbookState(serial);
  }

  async getAllSerialNumbers(): Promise<string[]> {
    return this.unifiedService.getAllSerialNumbers();
  }

  async getRoleRequest(_userAddress: Address): Promise<any> {
    void _userAddress;
    const requests = await this.unifiedService.getRoleRequests();
    return requests[0] || null;
  }
}

// Role names mapping (kept for backward compatibility)
export const ROLE_NAMES: Record<string, string> = {
  'ADMIN_ROLE': 'ADMIN_ROLE',
  'FABRICANTE_ROLE': 'FABRICANTE_ROLE',
  'AUDITOR_HW_ROLE': 'AUDITOR_HW_ROLE',
  'TECNICO_SW_ROLE': 'TECNICO_SW_ROLE',
  'ESCUELA_ROLE': 'ESCUELA_ROLE',
};
