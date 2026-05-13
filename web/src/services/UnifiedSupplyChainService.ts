/**
 * Unified Supply Chain Service
 * 
 * Consolidated service combining SupplyChainService and SolanaSupplyChainService
 * into a single unified service with complete query functions and transaction methods.
 */

'use client';

import { PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@anchor-lang/core';
import {
  findConfigPda,
  findDeployerPda,
  findNetbookPda,
  findRoleRequestPda,
  getProgram,
  PROGRAM_ID,
} from '@/lib/contracts/solana-program';

/**
 * Find PDA for serial hashes registry
 */
function findSerialHashesPda(configPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('serial_hashes'), configPda.toBuffer()],
    PROGRAM_ID
  );
}

/**
 * Find PDA for admin
 */
function findAdminPda(configPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('admin'), configPda.toBuffer()],
    PROGRAM_ID
  );
}
import { CacheService, CACHE_TAGS } from '@/lib/cache/cache-service';

// Use Program<any> to avoid deep type instantiation issues with Anchor IDL
type AnchorProgram = Program<any>;

// ==================== Types ====================

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

export interface NetbookData {
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

export interface ConfigData {
  admin: PublicKey;
  fabricante: PublicKey;
  auditorHw: PublicKey;
  tecnicoSw: PublicKey;
  escuela: PublicKey;
  adminBump: number;
  adminPdaBump: number;
  nextTokenId: BN;
  totalNetbooks: BN;
  roleRequestsCount: BN;
  fabricanteCount: BN;
  auditorHwCount: BN;
  tecnicoSwCount: BN;
  escuelaCount: BN;
}

export interface RoleRequestData {
  id: BN;
  user: PublicKey;
  role: string;
  status: number;
  timestamp: BN;
}

export interface RoleHolderData {
  id: BN;
  account: PublicKey;
  role: string;
  grantedBy: PublicKey;
  timestamp: BN;
}

export interface NetbookReport {
  serialNumber: string;
  batchId: string;
  modelSpecs: string;
  hwAuditor: string;
  hwIntegrityPassed: boolean;
  hwReportHash: string;
  swTechnician: string;
  osVersion: string;
  swValidationPassed: boolean;
  destinationSchoolHash: string;
  studentIdHash: string;
  distributionTimestamp: string;
  currentState: number;
  tokenId: bigint;
}

// Helper to access accounts with type assertion for Anchor IDL typing
function getNetbookAccount(program: AnchorProgram) {
  return (program.account as any).netbook;
}

function getConfigAccount(program: AnchorProgram) {
  return (program.account as any).supplyChainConfig;
}

function getRoleRequestAccount(program: AnchorProgram) {
  return (program.account as any).roleRequest;
}

// ==================== Main Service Class ====================

export class UnifiedSupplyChainService {
  static instance: UnifiedSupplyChainService | null = null;

  private program: AnchorProgram | null = null;
  private provider: AnchorProvider | null = null;
  private walletPubkey: PublicKey | null = null;

  static getInstance(): UnifiedSupplyChainService {
    if (!UnifiedSupplyChainService.instance) {
      UnifiedSupplyChainService.instance = new UnifiedSupplyChainService();
    }
    return UnifiedSupplyChainService.instance;
  }

  constructor() {
    console.log('✅ UnifiedSupplyChainService inicializado');
  }

  initialize(provider: AnchorProvider, walletPubkey?: PublicKey | null) {
    this.provider = provider;
    this.program = getProgram(provider);
    this.walletPubkey = walletPubkey || null;
    console.log('✅ UnifiedSupplyChainService program inicializado');
  }

  /**
   * Fund and Initialize - PDA-First Architecture
   *
   * Funds the deployer PDA and then initializes the config.
   * Used for initial deployment of the supply chain system.
   */
  async fundAndInitialize(amount: number = 10_000_000_000): Promise<TransactionResult> {
    if (!this.program || !this.provider || !this.walletPubkey) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const [deployerPda] = findDeployerPda();
      const [configPda] = findConfigPda();
      const [serialHashesPda] = findSerialHashesPda(configPda);
      const [adminPda] = findAdminPda(configPda);

      // Step 1: Fund deployer PDA
      const fundTx = await (this.program as any)
        .methods
        .fundDeployer(new BN(amount))
        .accounts({
          deployer: deployerPda,
          funder: this.walletPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // Step 2: Initialize config
      const initTx = await (this.program as any)
        .methods
        .initialize()
        .accounts({
          config: configPda,
          serialHashRegistry: serialHashesPda,
          admin: adminPda,
          deployer: deployerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, signature: initTx };
    } catch (err: any) {
      console.error('Error in fundAndInitialize:', err);
      return {
        success: false,
        error: err?.message ?? 'Error en fundAndInitialize',
      };
    }
  }

  getProgram(): AnchorProgram | null {
    return this.program;
  }

  getProvider(): AnchorProvider | null {
    return this.provider;
  }

  getWalletPubkey(): PublicKey | null {
    return this.walletPubkey;
  }

  // ==================== Query Functions ====================

  async findNetbookBySerial(
    serialNumber: string,
    maxSearch: number = 1000,
    batchSize: number = 10
  ): Promise<NetbookData | null> {
    const cacheKey = `findNetbookBySerial:${serialNumber}`;
    const cached = CacheService.get<NetbookData>(cacheKey);
    if (cached !== null) return cached;

    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }

    try {
      const [configPda] = findConfigPda();
      const configAccount = await getConfigAccount(this.program).fetch(configPda);
      const totalNetbooks = (configAccount as any).totalNetbooks as BN;

      const searchLimit = Math.min(Number(totalNetbooks), maxSearch);

      for (let start = 1; start <= searchLimit; start += batchSize) {
        const end = Math.min(start + batchSize - 1, searchLimit);
        const batch = [];

        for (let i = start; i <= end; i++) {
          const [netbookPda] = findNetbookPda(i);
          batch.push(
            getNetbookAccount(this.program).fetchNullable(netbookPda).catch(() => null)
          );
        }

        const results = await Promise.all(batch);

        for (const result of results) {
          if (
            result &&
            result.serialNumber === serialNumber &&
            result.exists
          ) {
            const netbookData = result as unknown as NetbookData;
            CacheService.set(cacheKey, netbookData, { tags: [CACHE_TAGS.NETBOOK] });
            return netbookData;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding netbook by serial:', error);
      return null;
    }
  }

  async getNetbookPdaBySerial(serialNumber: string): Promise<PublicKey | null> {
    const netbookData = await this.findNetbookBySerial(serialNumber);
    if (!netbookData) return null;

    const [netbookPda] = findNetbookPda(Number(netbookData.tokenId));
    return netbookPda;
  }

  async getAllSerialNumbers(maxSearch: number = 10000): Promise<string[]> {
    const cacheKey = `getAllSerialNumbers:${maxSearch}`;
    const cached = CacheService.get<string[]>(cacheKey);
    if (cached !== null) return cached;

    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }

    try {
      const [configPda] = findConfigPda();
      const configAccount = await getConfigAccount(this.program).fetch(configPda);
      const totalNetbooks = (configAccount as any).totalNetbooks as BN;

      const searchLimit = Math.min(Number(totalNetbooks), maxSearch);
      const serials: string[] = [];

      const batchSize = 20;
      for (let start = 1; start <= searchLimit; start += batchSize) {
        const end = Math.min(start + batchSize - 1, searchLimit);
        const batch = [];

        for (let i = start; i <= end; i++) {
          const [netbookPda] = findNetbookPda(i);
          batch.push(
            getNetbookAccount(this.program).fetchNullable(netbookPda).catch(() => null)
          );
        }

        const results = await Promise.all(batch);

        for (const result of results) {
          if (result && result.exists && result.serialNumber) {
            serials.push(result.serialNumber);
          }
        }
      }

      CacheService.set(cacheKey, serials, { tags: [CACHE_TAGS.NETBOOKS_LIST] });
      return serials;
    } catch (error) {
      console.error('Error getting serial numbers:', error);
      return [];
    }
  }

  async getNetbookState(serial: string): Promise<number> {
    const cacheKey = `getNetbookState:${serial}`;
    const cached = CacheService.get<number>(cacheKey);
    if (cached !== null) return cached;

    try {
      const netbook = await this.findNetbookBySerial(serial);
      const state = netbook?.state ?? 0;
      CacheService.set(cacheKey, state, { tags: [CACHE_TAGS.NETBOOK] });
      return state;
    } catch {
      return 0;
    }
  }

  async getNetbooksByState(state: number, maxSearch: number = 10000): Promise<string[]> {
    const cacheKey = `getNetbooksByState:${state}`;
    const cached = CacheService.get<string[]>(cacheKey);
    if (cached !== null) return cached;

    try {
      const allSerials = await this.getAllSerialNumbers(maxSearch);
      const result: string[] = [];

      for (const serial of allSerials) {
        const netbook = await this.findNetbookBySerial(serial, maxSearch, 50);
        if (netbook && netbook.state === state) {
          result.push(serial);
        }
      }

      CacheService.set(cacheKey, result, { tags: [CACHE_TAGS.NETBOOKS_LIST] });
      return result;
    } catch (error) {
      console.error('Error getting netbooks by state:', error);
      return [];
    }
  }

  async getNetbookReport(serial: string): Promise<NetbookReport | null> {
    const cacheKey = `getNetbookReport:${serial}`;
    const cached = CacheService.get<NetbookReport>(cacheKey);
    if (cached !== null) return cached;

    try {
      const netbook = await this.findNetbookBySerial(serial);
      if (!netbook) return null;

      const report: NetbookReport = {
        serialNumber: netbook.serialNumber,
        batchId: netbook.batchId,
        modelSpecs: netbook.initialModelSpecs,
        hwAuditor: netbook.hwAuditor.toString(),
        hwIntegrityPassed: netbook.hwIntegrityPassed,
        hwReportHash: Buffer.from(netbook.hwReportHash).toString('hex'),
        swTechnician: netbook.swTechnician.toString(),
        osVersion: netbook.osVersion,
        swValidationPassed: netbook.swValidationPassed,
        destinationSchoolHash: Buffer.from(netbook.destinationSchoolHash).toString('hex'),
        studentIdHash: Buffer.from(netbook.studentIdHash).toString('hex'),
        distributionTimestamp: netbook.distributionTimestamp.toString(),
        currentState: netbook.state,
        tokenId: BigInt(netbook.tokenId.toString()),
      };

      CacheService.set(cacheKey, report, { tags: [CACHE_TAGS.NETBOOK] });
      return report;
    } catch (error) {
      console.error('Error getting netbook report:', error);
      return null;
    }
  }

  /**
   * Query the config account from chain.
   *
   * Distingue entre "account no existe" y "error de red" para proporcionar
   * mensajes de error claros y permitir graceful degradation.
   *
   * @returns ConfigData si existe, null si no está inicializada
   * @throws Error descriptivo si hay problemas de red o inicialización
   */
  async queryConfig(): Promise<ConfigData | null> {
    const cacheKey = 'queryConfig';
    const cached = CacheService.get<ConfigData>(cacheKey);
    if (cached !== null) return cached;

    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }

    const [configPda] = findConfigPda();

    try {
      const configAccount = await getConfigAccount(this.program).fetch(configPda);
      const configData = configAccount as unknown as ConfigData;

      CacheService.set(cacheKey, configData, { tags: [CACHE_TAGS.CONFIG] });
      return configData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Distinguir entre "account no existe" y "error de red"
      if (errorMessage.includes('does not exist') || errorMessage.includes('No accounts found')) {
        console.warn(
          `[SupplyChain] Config account no existe en ${configPda.toBase58()}. ` +
          'El programa puede no estar inicializado. Ejecuta la instrucción de inicialización.'
        );
        return null;
      }

      // Error de red u otro problema
      console.error('[SupplyChain] Error querying config:', error);
      return null;
    }
  }

  async getTotalNetbooks(): Promise<number> {
    const config = await this.queryConfig();
    if (!config) return 0;
    return Number(config.totalNetbooks);
  }

  async getNextTokenId(): Promise<bigint> {
    const config = await this.queryConfig();
    if (!config) return BigInt(0);
    return BigInt(config.nextTokenId.toString());
  }

  // ==================== Role Functions ====================

  async getAllMembers(role: string): Promise<string[]> {
    const cacheKey = `getAllMembers:${role}`;
    const cached = CacheService.get<string[]>(cacheKey);
    if (cached !== null) return cached;

    try {
      const config = await this.queryConfig();
      if (!config) return [];

      const members = [
        config.admin.toString(),
        config.fabricante.toString(),
        config.auditorHw.toString(),
        config.tecnicoSw.toString(),
        config.escuela.toString(),
      ].filter(pk => !pk.startsWith('1111') && !pk.startsWith('0000'));

      CacheService.set(cacheKey, members, { tags: [CACHE_TAGS.ROLE] });
      return members;
    } catch (error) {
      console.error('Error getting role members:', error);
      return [];
    }
  }

  async getRoleMemberCount(role: string): Promise<number> {
    const members = await this.getAllMembers(role);
    return members.length;
  }

  async hasRole(role: string, address: string): Promise<boolean> {
    try {
      const config = await this.queryConfig();
      if (!config) return false;

      const userPubkey = new PublicKey(address);

      const roleMap: Record<string, PublicKey> = {
        'fabricante': config.fabricante,
        'auditor_hw': config.auditorHw,
        'tecnico_sw': config.tecnicoSw,
        'escuela': config.escuela,
        'admin': config.admin,
      };

      const targetRole = roleMap[role];
      if (!targetRole) return false;

      return targetRole.equals(userPubkey);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  async getRoleRequests(): Promise<RoleRequestData[]> {
    const cacheKey = 'getRoleRequests';
    const cached = CacheService.get<RoleRequestData[]>(cacheKey);
    if (cached !== null) return cached;

    if (!this.program) {
      throw new Error('Program not initialized. Call initialize() first.');
    }

    try {
      const config = await this.queryConfig();
      if (!config) return [];

      const count = Number(config.roleRequestsCount);
      const requests: RoleRequestData[] = [];

      for (let i = 1; i <= count; i++) {
        const [roleRequestPda] = findRoleRequestPda(config.admin);

        try {
          const request = await getRoleRequestAccount(this.program).fetch(roleRequestPda);
          requests.push(request as unknown as RoleRequestData);
        } catch {
          // Skip non-existent requests
        }
      }

      CacheService.set(cacheKey, requests, { tags: [CACHE_TAGS.ROLE_REQUESTS] });
      return requests;
    } catch (error) {
      console.error('Error getting role requests:', error);
      return [];
    }
  }

  // ==================== Transaction Functions ====================

  async registerNetbook(
    serialNumber: string,
    batchId: string,
    modelSpecs: string
  ): Promise<{ signature: string; tokenId: bigint }> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const configAccount = await getConfigAccount(this.program).fetch(configPda);
      const nextTokenId = (configAccount as any).nextTokenId as BN;

      const [netbookPda] = findNetbookPda(nextTokenId.toNumber());

      // Use as any to avoid type instantiation issues
      const programAny = this.program as any;
      const tx = await programAny.methods
        .registerNetbook(serialNumber, batchId, modelSpecs)
        .accounts({
          config: configPda,
          manufacturer: this.walletPubkey,
          netbook: netbookPda,
          systemProgram: PublicKey.default,
        })
        .rpc();

      // Invalidate caches
      CacheService.invalidateByTag(CACHE_TAGS.NETBOOK, CACHE_TAGS.NETBOOKS_LIST, CACHE_TAGS.CONFIG);

      return { signature: tx, tokenId: BigInt(nextTokenId.toString()) };
    } catch (error) {
      console.error('Error in registerNetbook:', error);
      throw error;
    }
  }

  async registerNetbooksBatch(params: {
    netbooks: Array<{
      tokenId: number;
      serialNumber: string;
      model: string;
      manufacturer: string;
    }>;
  }): Promise<TransactionResult> {
    if (!this.program) {
      throw new Error('Program not initialized.');
    }

    try {
      const programAny = this.program as any;
      const tx = await programAny.methods
        .registerNetbooksBatch(
          params.netbooks.map(n => n.serialNumber),
          params.netbooks.map(n => n.serialNumber),
          params.netbooks.map(n => n.model)
        )
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.NETBOOK, CACHE_TAGS.NETBOOKS_LIST, CACHE_TAGS.CONFIG);

      return { success: true, signature: tx };
    } catch (error) {
      console.error('Error in registerNetbooksBatch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async auditHardware(
    serialNumber: string,
    passed: boolean,
    reportHash: number[]
  ): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const programAny = this.program as any;
      const tx = await programAny.methods
        .auditHardware(serialNumber, passed, new Uint8Array(reportHash) as any)
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          auditor: this.walletPubkey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error in auditHardware:', error);
      throw error;
    }
  }

  async validateSoftware(
    serialNumber: string,
    osVersion: string,
    passed: boolean
  ): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const programAny = this.program as any;
      const tx = await programAny.methods
        .validateSoftware(serialNumber, osVersion, passed)
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          technician: this.walletPubkey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error in validateSoftware:', error);
      throw error;
    }
  }

  async assignToStudent(
    serialNumber: string,
    schoolHash: number[],
    studentHash: number[]
  ): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const programAny = this.program as any;
      const tx = await programAny.methods
        .assignToStudent(
          serialNumber,
          new Uint8Array(schoolHash) as any,
          new Uint8Array(studentHash) as any
        )
        .accounts({
          netbook: netbookPda,
          config: findConfigPda()[0],
          school: this.walletPubkey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error('Error in assignToStudent:', error);
      throw error;
    }
  }

  async grantRole(role: string, accountToGrant: PublicKey): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .grantRole(role)
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          accountToGrant,
          systemProgram: PublicKey.default,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE, CACHE_TAGS.CONFIG);

      return tx;
    } catch (error) {
      console.error('Error in grantRole:', error);
      throw error;
    }
  }

  async requestRole(role: string): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .requestRole(role)
        .accounts({
          config: configPda,
          roleRequest: roleRequestPda,
          user: this.walletPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS);

      return tx;
    } catch (error) {
      console.error('Error in requestRole:', error);
      throw error;
    }
  }

  async approveRoleRequest(role: string): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);
      const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .approveRoleRequest()
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          roleRequest: roleRequestPda,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS, CACHE_TAGS.ROLE);

      return tx;
    } catch (error) {
      console.error('Error in approveRoleRequest:', error);
      throw error;
    }
  }

  async rejectRoleRequest(role: string): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);
      const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .rejectRoleRequest()
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          roleRequest: roleRequestPda,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS);

      return tx;
    } catch (error) {
      console.error('Error in rejectRoleRequest:', error);
      throw error;
    }
  }

  async revokeRole(role: string, accountToRevoke: PublicKey): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .revokeRole(role)
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          accountToRevoke,
          systemProgram: PublicKey.default,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE, CACHE_TAGS.CONFIG);

      return tx;
    } catch (error) {
      console.error('Error in revokeRole:', error);
      throw error;
    }
  }

  async addRoleHolder(role: string, holder: PublicKey): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .addRoleHolder(role, holder)
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          systemProgram: PublicKey.default,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE);

      return tx;
    } catch (error) {
      console.error('Error in addRoleHolder:', error);
      throw error;
    }
  }

  async removeRoleHolder(role: string, holder: PublicKey): Promise<string> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const [configPda] = findConfigPda();
      const [adminPda] = findAdminPda(configPda);

      const programAny = this.program as any;
      const tx = await programAny.methods
        .removeRoleHolder(role, holder)
        .accounts({
          config: configPda,
          admin: adminPda,  // Admin PDA as account reference (not signer)
          systemProgram: PublicKey.default,
        })
        .signers([this.walletPubkey as any])  // Only sign with user wallet
        .rpc();

      CacheService.invalidateByTag(CACHE_TAGS.ROLE);

      return tx;
    } catch (error) {
      console.error('Error in removeRoleHolder:', error);
      throw error;
    }
  }

  async queryNetbookState(serialNumber: string): Promise<any> {
    if (!this.program || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    try {
      const programAny = this.program as any;
      const tx = await programAny.methods
        .queryNetbookState(serialNumber)
        .accounts({
          netbook: netbookPda,
        })
        .simulate();

      return tx;
    } catch (error) {
      console.error('Error in queryNetbookState:', error);
      throw error;
    }
  }

  clearCaches(): void {
    CacheService.clear();
  }

  invalidateCachePrefix(prefix: string): void {
    CacheService.invalidateByPrefix(prefix);
  }
}

// Export singleton instance
export const unifiedSupplyChainService = UnifiedSupplyChainService.getInstance();
