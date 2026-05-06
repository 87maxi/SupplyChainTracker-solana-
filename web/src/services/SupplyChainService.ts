"use client";

/**
 * Servicio principal para operaciones de la cadena de suministro
 * Migrado de Ethereum/Viem a Solana/Anchor
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getProgram, getProvider } from '@/lib/contracts/solana-program';
import { connection } from '@/lib/solana/connection';
import { CacheService } from '@/lib/cache/cache-service';
import { safeJsonStringify } from '@/lib/utils';

// Tipos de retorno para Solana
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

// Interface para el reporte de netbook
export interface Netbook {
  serialNumber: string;
  batchId: string;
  initialModelSpecs: string;
  hwAuditor: string;
  hwIntegrityPassed: boolean;
  hwReportHash: string;
  swTechnician: string;
  osVersion: string;
  swValidationPassed: boolean;
  destinationSchoolHash: string;
  studentIdHash: string;
  distributionTimestamp: string;
  currentState: string;
}

/**
 * Servicio principal para operaciones SupplyChain en Solana
 */
export class SupplyChainService {
  static instance: SupplyChainService | null = null;
  
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  // Obtener instancia singleton
  static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
  }

  constructor() {
    console.log('✅ SupplyChainService inicializado para Solana');
  }

  /**
   * Inicializar el programa Anchor con el provider
   */
  initialize(provider: AnchorProvider) {
    this.provider = provider;
    this.program = getProgram(provider);
    console.log('✅ SupplyChainService program inicializado');
  }

  /**
   * Obtener el programa actual
   */
  getProgram(): Program | null {
    return this.program;
  }

  /**
   * Obtener el provider actual
   */
  getProvider(): AnchorProvider | null {
    return this.provider;
  }

  /**
   * Registrar una netbook
   */
  async registerNetbook(params: {
    tokenId: number;
    serialNumber: string;
    model: string;
    manufacturer: string;
  }): Promise<TransactionResult> {
    const cacheKey = `registerNetbook:${safeJsonStringify(params)}`;
    
    const cached = CacheService.get<TransactionResult>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      if (!this.program) {
        throw new Error('Program not initialized. Call initialize() first.');
      }

      const tx = await this.program.methods
        .registerNetbook(params.tokenId, params.serialNumber, params.model, params.manufacturer)
        .rpc();

      const result = { success: true, signature: tx };
      CacheService.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error en registerNetbook:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Registrar netbooks en batch
   */
  async registerNetbooksBatch(params: {
    netbooks: Array<{
      tokenId: number;
      serialNumber: string;
      model: string;
      manufacturer: string;
    }>;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .registerNetbooksBatch(params.netbooks)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en registerNetbooksBatch:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Auditoría de hardware
   */
  async auditHardware(params: {
    tokenId: number;
    auditor: string;
    reportHash: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .auditHardware(params.tokenId, params.auditor, params.reportHash)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en auditHardware:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Validación de software
   */
  async validateSoftware(params: {
    tokenId: number;
    technician: string;
    osVersion: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .validateSoftware(params.tokenId, params.technician, params.osVersion)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en validateSoftware:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Asignar a estudiante
   */
  async assignToStudent(params: {
    tokenId: number;
    studentIdHash: string;
    schoolHash: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .assignToStudent(params.tokenId, params.studentIdHash, params.schoolHash)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en assignToStudent:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Otorgar rol
   */
  async grantRole(params: {
    role: string;
    account: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .grantRole(params.role, new PublicKey(params.account))
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en grantRole:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Revocar rol
   */
  async revokeRole(params: {
    role: string;
    account: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .revokeRole(params.role, new PublicKey(params.account))
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en revokeRole:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Solicitar rol
   */
  async requestRole(params: {
    role: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .requestRole(params.role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en requestRole:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Aprobar solicitud de rol
   */
  async approveRoleRequest(params: {
    role: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .approveRoleRequest(params.role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en approveRoleRequest:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Rechazar solicitud de rol
   */
  async rejectRoleRequest(params: {
    role: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .rejectRoleRequest(params.role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en rejectRoleRequest:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Agregar titular de rol
   */
  async addRoleHolder(params: {
    role: string;
    holder: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .addRoleHolder(params.role, new PublicKey(params.holder))
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en addRoleHolder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Remover titular de rol
   */
  async removeRoleHolder(params: {
    role: string;
    holder: string;
  }): Promise<TransactionResult> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const tx = await this.program.methods
        .removeRoleHolder(params.role, new PublicKey(params.holder))
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error en removeRoleHolder:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Consultar estado de netbook
   */
  async queryNetbook(tokenId: number): Promise<any> {
    const cacheKey = `queryNetbook:${tokenId}`;
    
    const cached = CacheService.get<any>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      const netbook = await this.program.account.netbook.fetch(
        await this.getNetbookPda(tokenId)
      );

      CacheService.set(cacheKey, netbook);
      return netbook;
    } catch (error) {
      console.error('Error en queryNetbook:', error);
      return null;
    }
  }

  /**
   * Consultar configuración
   */
  async queryConfig(): Promise<any> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized.');
      }

      return await this.program.account.supplyChainConfig.fetch(
        await this.getConfigPda()
      );
    } catch (error) {
      console.error('Error en queryConfig:', error);
      return null;
    }
  }

  /**
   * Verificar si una cuenta tiene un rol
   */
  async hasRole(account: string, role: string): Promise<boolean> {
    try {
      const config = await this.queryConfig();
      if (!config) return false;

      const accountPk = new PublicKey(account);
      const rolePk = new PublicKey(role);

      return config.roleHolders.some(
        (holder: any) => 
          holder.role.equals(rolePk) && holder.holders.some((h: any) => h.equals(accountPk))
      );
    } catch (error) {
      console.error('Error en hasRole:', error);
      return false;
    }
  }

  /**
   * Obtener todos los holders de un rol
   */
  async getRoleHolders(role: string): Promise<string[]> {
    try {
      const config = await this.queryConfig();
      if (!config) return [];

      const rolePk = new PublicKey(role);
      const roleHolder = config.roleHolders.find(
        (holder: any) => holder.role.equals(rolePk)
      );

      if (!roleHolder) return [];

      return roleHolder.holders.map((h: PublicKey) => h.toString());
    } catch (error) {
      console.error('Error en getRoleHolders:', error);
      return [];
    }
  }

  /**
   * Obtener PDA de netbook
   */
  private async getNetbookPda(tokenId: number): Promise<PublicKey> {
    const programId = await this.getProgramId();
    const tokenIdBuffer = Buffer.alloc(8);
    tokenIdBuffer.writeBigUInt64LE(BigInt(tokenId), 0);
    
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('netbook'), Buffer.from('netbook'), tokenIdBuffer.slice(0, 7)],
      programId
    );
    return pda;
  }

  /**
   * Obtener PDA de config
   */
  private async getConfigPda(): Promise<PublicKey> {
    const programId = await this.getProgramId();
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      programId
    );
    return pda;
  }

  /**
   * Obtener Program ID
   */
  private async getProgramId(): Promise<PublicKey> {
    if (!this.program) {
      throw new Error('Program not initialized.');
    }
    return this.program.programId;
  }
}

// Exportar instancia singleton
export const supplyChainService = SupplyChainService.getInstance();
