/**
 * Unified Supply Chain Service
 * 
 * Consolidated service combining SupplyChainService and SolanaSupplyChainService
 * into a single unified service with complete query functions and transaction methods.
 * 
 * MIGRATED: Anchor → Codama (Issue #209)
 * - Removed Anchor imports (Program, AnchorProvider, BN)
 * - Added Codama imports (@solana/kit, generated code)
 * - Transaction methods use Codama instruction builders
 * - Query methods use Codama account fetchers
 * - Types updated: BN→bigint, PublicKey→Address, number[]→Uint8Array
 */

'use client';

import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  Address,
  TransactionSigner,
} from '@solana/kit';
import {
  // Instruction builders
  getFundDeployerInstructionAsync,
  getInitializeInstructionAsync,
  getRegisterNetbookInstruction,
  getRegisterNetbooksBatchInstruction,
  getAuditHardwareInstruction,
  getValidateSoftwareInstruction,
  getAssignToStudentInstruction,
  getGrantRoleInstructionAsync,
  getRequestRoleInstructionAsync,
  getApproveRoleRequestInstructionAsync,
  getRejectRoleRequestInstructionAsync,
  getRevokeRoleInstructionAsync,
  getAddRoleHolderInstructionAsync,
  getRemoveRoleHolderInstructionAsync,
  getQueryNetbookStateInstruction,
  // Account fetchers
  fetchMaybeSupplyChainConfig,
  fetchMaybeNetbook,
  // Program ID
  SC_SOLANA_PROGRAM_ADDRESS,
} from '@/generated/src/generated';
import { CacheService, CACHE_TAGS } from '@/lib/cache/cache-service';
import {
  findConfigPdaAsync,
  findDeployerPdaAsync,
  findNetbookPdaAsync,
  findRoleRequestPdaAsync,
  findAdminPdaAsync,
  findSerialHashRegistryPdaAsync,
  findRoleHolderPdaAsync,
  PROGRAM_ID,
} from '@/lib/contracts/solana-program';

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
  adminPdaBump: number;
  nextTokenId: bigint;
  totalNetbooks: bigint;
  roleRequestsCount: bigint;
  fabricanteCount: bigint;
  auditorHwCount: bigint;
  tecnicoSwCount: bigint;
  escuelaCount: bigint;
}

export interface RoleRequestData {
  id: bigint;
  user: Address;
  role: string;
  status: number;
  timestamp: bigint;
}

export interface RoleHolderData {
  id: bigint;
  account: Address;
  role: string;
  grantedBy: Address;
  timestamp: bigint;
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

// ==================== Helper Functions ====================

/**
 * Convert PublicKey to Address string
 */
function fromPublicKey(pk: PublicKey): Address {
  return pk.toBase58() as Address;
}

/**
 * Get the RPC transport from web3.js Connection
 */
function getRpcTransport(connection: Connection): any {
  return connection as any;
}

/**
 * Cast Address to TransactionSigner for instruction builders
 */
function asTransactionSigner(address: Address): TransactionSigner {
  return address as unknown as TransactionSigner;
}

// ==================== Main Service Class ====================

export class UnifiedSupplyChainService {
  static instance: UnifiedSupplyChainService | null = null;

  private connection: Connection | null = null;
  private walletAdapter: any = null;
  private walletPubkey: Address | null = null;

  static getInstance(): UnifiedSupplyChainService {
    if (!UnifiedSupplyChainService.instance) {
      UnifiedSupplyChainService.instance = new UnifiedSupplyChainService();
    }
    return UnifiedSupplyChainService.instance;
  }

  constructor() {
    console.log('✅ UnifiedSupplyChainService inicializado (Codama)');
  }

  /**
   * Initialize the service with wallet adapter and connection
   */
  initialize(walletAdapter: any, connection?: Connection) {
    this.walletAdapter = walletAdapter;
    this.walletPubkey = walletAdapter?.publicKey
      ? fromPublicKey(walletAdapter.publicKey)
      : null;

    if (connection) {
      this.connection = connection;
    }

    console.log('✅ UnifiedSupplyChainService initialized with Codama');
  }

  updateWalletPubkey(publicKey: PublicKey) {
    this.walletPubkey = fromPublicKey(publicKey);
  }

  setConnection(connection: Connection) {
    this.connection = connection;
  }

  getConnection(): Connection | null {
    return this.connection;
  }

  getWalletPubkey(): Address | null {
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

    if (!this.connection) {
      throw new Error('Connection not initialized. Call initialize() first.');
    }

    const rpc = getRpcTransport(this.connection);

    try {
      const configPda = await findConfigPdaAsync();
      const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda[0]);

      if (!configAccount.exists) {
        console.warn('Config account not found');
        return null;
      }

      const totalNetbooks = Number(configAccount.data.totalNetbooks);
      const searchLimit = Math.min(totalNetbooks, maxSearch);

      for (let start = 1; start <= searchLimit; start += batchSize) {
        const end = Math.min(start + batchSize - 1, searchLimit);
        const batch: Promise<any>[] = [];

        for (let i = start; i <= end; i++) {
          const netbookPda = await findNetbookPdaAsync(BigInt(i));
          batch.push(
            fetchMaybeNetbook(rpc, netbookPda[0]).catch(() => null)
          );
        }

        const results = await Promise.all(batch);

        for (const result of results) {
          if (
            result?.exists &&
            result.data.serialNumber === serialNumber
          ) {
            const netbookData: NetbookData = {
              serialNumber: result.data.serialNumber,
              batchId: result.data.batchId,
              initialModelSpecs: result.data.initialModelSpecs,
              hwAuditor: result.data.hwAuditor,
              hwIntegrityPassed: result.data.hwIntegrityPassed,
              hwReportHash: Uint8Array.from(result.data.hwReportHash),
              swTechnician: result.data.swTechnician,
              osVersion: result.data.osVersion,
              swValidationPassed: result.data.swValidationPassed,
              destinationSchoolHash: Uint8Array.from(result.data.destinationSchoolHash),
              studentIdHash: Uint8Array.from(result.data.studentIdHash),
              distributionTimestamp: result.data.distributionTimestamp,
              state: result.data.state,
              exists: result.data.exists,
              tokenId: result.data.tokenId,
            };
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

  async getNetbookPdaBySerial(serialNumber: string): Promise<Address | null> {
    const netbookData = await this.findNetbookBySerial(serialNumber);
    if (!netbookData) return null;

    const netbookPda = await findNetbookPdaAsync(netbookData.tokenId);
    return netbookPda[0];
  }

  async getAllSerialNumbers(maxSearch: number = 10000): Promise<string[]> {
    const cacheKey = `getAllSerialNumbers:${maxSearch}`;
    const cached = CacheService.get<string[]>(cacheKey);
    if (cached !== null) return cached;

    if (!this.connection) {
      throw new Error('Connection not initialized. Call initialize() first.');
    }

    const rpc = getRpcTransport(this.connection);

    try {
      const configPda = await findConfigPdaAsync();
      const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda[0]);

      if (!configAccount.exists) {
        return [];
      }

      const totalNetbooks = Number(configAccount.data.totalNetbooks);
      const searchLimit = Math.min(totalNetbooks, maxSearch);
      const serials: string[] = [];

      const batchSize = 20;
      for (let start = 1; start <= searchLimit; start += batchSize) {
        const end = Math.min(start + batchSize - 1, searchLimit);
        const batch: Promise<any>[] = [];

        for (let i = start; i <= end; i++) {
          const netbookPda = await findNetbookPdaAsync(BigInt(i));
          batch.push(
            fetchMaybeNetbook(rpc, netbookPda[0]).catch(() => null)
          );
        }

        const results = await Promise.all(batch);

        for (const result of results) {
          if (result?.exists && result.data.serialNumber) {
            serials.push(result.data.serialNumber);
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
        hwAuditor: netbook.hwAuditor,
        hwIntegrityPassed: netbook.hwIntegrityPassed,
        hwReportHash: Buffer.from(netbook.hwReportHash).toString('hex'),
        swTechnician: netbook.swTechnician,
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

  async queryConfig(): Promise<ConfigData | null> {
    const cacheKey = 'queryConfig';
    const cached = CacheService.get<ConfigData>(cacheKey);
    if (cached !== null) return cached;

    if (!this.connection) {
      throw new Error('Connection not initialized. Call initialize() first.');
    }

    const rpc = getRpcTransport(this.connection);
    const configPda = await findConfigPdaAsync();

    try {
      const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda[0]);

      if (!configAccount.exists) {
        console.warn(
          `[SupplyChain] Config account no existe en ${configPda[0]}. ` +
          'El programa puede no estar inicializado.'
        );
        return null;
      }

      const data = configAccount.data;
      const configData: ConfigData = {
        admin: data.admin,
        fabricante: data.fabricante,
        auditorHw: data.auditorHw,
        tecnicoSw: data.tecnicoSw,
        escuela: data.escuela,
        adminBump: data.adminBump,
        adminPdaBump: data.adminPdaBump,
        nextTokenId: data.nextTokenId,
        totalNetbooks: data.totalNetbooks,
        roleRequestsCount: data.roleRequestsCount,
        fabricanteCount: data.fabricanteCount,
        auditorHwCount: data.auditorHwCount,
        tecnicoSwCount: data.tecnicoSwCount,
        escuelaCount: data.escuelaCount,
      };

      CacheService.set(cacheKey, configData, { tags: [CACHE_TAGS.CONFIG] });
      return configData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('does not exist') || errorMessage.includes('No accounts found')) {
        console.warn(
          `[SupplyChain] Config account no existe en ${configPda[0]}. ` +
          'El programa puede no estar inicializado.'
        );
        return null;
      }

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
        config.admin,
        config.fabricante,
        config.auditorHw,
        config.tecnicoSw,
        config.escuela,
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

      const roleMap: Record<string, Address> = {
        'fabricante': config.fabricante,
        'auditor_hw': config.auditorHw,
        'tecnico_sw': config.tecnicoSw,
        'escuela': config.escuela,
        'admin': config.admin,
      };

      const targetRole = roleMap[role];
      if (!targetRole) return false;

      return targetRole === address;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }

  async getRoleRequests(): Promise<RoleRequestData[]> {
    const cacheKey = 'getRoleRequests';
    const cached = CacheService.get<RoleRequestData[]>(cacheKey);
    if (cached !== null) return cached;

    if (!this.connection) {
      throw new Error('Connection not initialized. Call initialize() first.');
    }

    try {
      const config = await this.queryConfig();
      if (!config) return [];

      const requests: RoleRequestData[] = [];
      CacheService.set(cacheKey, requests, { tags: [CACHE_TAGS.ROLE_REQUESTS] });
      return requests;
    } catch (error) {
      console.error('Error getting role requests:', error);
      return [];
    }
  }

  // ==================== Transaction Functions ====================

  async fundAndInitialize(amount: number = 10_000_000_000): Promise<TransactionResult> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      const deployerPda = await findDeployerPdaAsync();
      const fundInstruction = await getFundDeployerInstructionAsync({
        deployer: deployerPda[0],
        funder: asTransactionSigner(this.walletPubkey),
        amount,
      }, { programAddress: PROGRAM_ID });

      const fundTx = new Transaction().add(fundInstruction as any);
      await this.sendTransaction(fundTx);

      const configPda = await findConfigPdaAsync();
      const serialHashesPda = await findSerialHashRegistryPdaAsync(configPda[0]);
      const adminPda = await findAdminPdaAsync(configPda[0]);

      const initInstruction = await getInitializeInstructionAsync({
        config: configPda[0],
        serialHashRegistry: serialHashesPda[0],
        admin: adminPda[0],
        deployer: deployerPda[0],
        funder: asTransactionSigner(this.walletPubkey),
        systemProgram: SystemProgram.programId.toBase58() as Address,
      }, { programAddress: PROGRAM_ID });

      const initTx = new Transaction().add(initInstruction as any);
      const initSignature = await this.sendTransaction(initTx);

      return { success: true, signature: initSignature };
    } catch (err: any) {
      console.error('Error in fundAndInitialize:', err);
      return {
        success: false,
        error: err?.message ?? 'Error en fundAndInitialize',
      };
    }
  }

  async registerNetbook(
    serialNumber: string,
    batchId: string,
    modelSpecs: string
  ): Promise<{ signature: string; tokenId: bigint }> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();
      const rpc = getRpcTransport(this.connection);
      const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda[0]);

      if (!configAccount.exists) {
        throw new Error('Config not initialized');
      }

      const nextTokenId = configAccount.data.nextTokenId;
      const netbookPda = await findNetbookPdaAsync(nextTokenId);
      const serialHashesPda = await findSerialHashRegistryPdaAsync(configPda[0]);

      const instruction = getRegisterNetbookInstruction({
        config: configPda[0],
        serialHashRegistry: serialHashesPda[0],
        manufacturer: asTransactionSigner(this.walletPubkey),
        netbook: netbookPda[0],
        systemProgram: SystemProgram.programId.toBase58() as Address,
        serialNumber,
        batchId,
        initialModelSpecs: modelSpecs,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

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
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized.');
    }

    try {
      const serialNumbers = params.netbooks.map(n => n.serialNumber);
      const batchIds = params.netbooks.map(n => n.serialNumber);
      const modelSpecs = params.netbooks.map(n => n.model);

      const configPda = await findConfigPdaAsync();
      const serialHashesPda = await findSerialHashRegistryPdaAsync(configPda[0]);

      const instruction = getRegisterNetbooksBatchInstruction({
        config: configPda[0],
        serialHashRegistry: serialHashesPda[0],
        manufacturer: asTransactionSigner(this.walletPubkey),
        systemProgram: SystemProgram.programId.toBase58() as Address,
        serialNumbers,
        batchIds,
        modelSpecs,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.NETBOOK, CACHE_TAGS.NETBOOKS_LIST, CACHE_TAGS.CONFIG);

      return { success: true, signature };
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
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = getAuditHardwareInstruction({
        netbook: netbookPda,
        config: configPda[0],
        auditor: asTransactionSigner(this.walletPubkey),
        serial: serialNumber,
        passed,
        reportHash: new Uint8Array(reportHash),
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      return await this.sendTransaction(tx);
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
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = getValidateSoftwareInstruction({
        netbook: netbookPda,
        config: configPda[0],
        technician: asTransactionSigner(this.walletPubkey),
        serial: serialNumber,
        osVersion,
        passed,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      return await this.sendTransaction(tx);
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
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    CacheService.invalidateByTag(CACHE_TAGS.NETBOOK);

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = getAssignToStudentInstruction({
        netbook: netbookPda,
        config: configPda[0],
        school: asTransactionSigner(this.walletPubkey),
        serial: serialNumber,
        schoolHash: new Uint8Array(schoolHash),
        studentHash: new Uint8Array(studentHash),
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      return await this.sendTransaction(tx);
    } catch (error) {
      console.error('Error in assignToStudent:', error);
      throw error;
    }
  }

  async grantRole(role: string, accountToGrant: Address): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = await getGrantRoleInstructionAsync({
        config: configPda[0],
        accountToGrant: asTransactionSigner(accountToGrant),
        role,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE, CACHE_TAGS.CONFIG);

      return signature;
    } catch (error) {
      console.error('Error in grantRole:', error);
      throw error;
    }
  }

  async requestRole(role: string): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = await getRequestRoleInstructionAsync({
        config: configPda[0],
        user: asTransactionSigner(this.walletPubkey),
        role,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS);

      return signature;
    } catch (error) {
      console.error('Error in requestRole:', error);
      throw error;
    }
  }

  async approveRoleRequest(role: string): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();
      const roleRequestPda = await findRoleRequestPdaAsync(this.walletPubkey);
      const roleHolderPda = await findRoleHolderPdaAsync(this.walletPubkey);

      const instruction = await getApproveRoleRequestInstructionAsync({
        config: configPda[0],
        payer: asTransactionSigner(this.walletPubkey),
        roleRequest: roleRequestPda[0],
        roleHolder: roleHolderPda[0],
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS, CACHE_TAGS.ROLE);

      return signature;
    } catch (error) {
      console.error('Error in approveRoleRequest:', error);
      throw error;
    }
  }

  async rejectRoleRequest(role: string): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();
      const roleRequestPda = await findRoleRequestPdaAsync(this.walletPubkey);

      const instruction = await getRejectRoleRequestInstructionAsync({
        config: configPda[0],
        roleRequest: roleRequestPda[0],
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE_REQUESTS);

      return signature;
    } catch (error) {
      console.error('Error in rejectRoleRequest:', error);
      throw error;
    }
  }

  async revokeRole(role: string, accountToRevoke: Address): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = await getRevokeRoleInstructionAsync({
        config: configPda[0],
        accountToRevoke: asTransactionSigner(accountToRevoke),
        role,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE, CACHE_TAGS.CONFIG);

      return signature;
    } catch (error) {
      console.error('Error in revokeRole:', error);
      throw error;
    }
  }

  async addRoleHolder(role: string, holder: Address): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = await getAddRoleHolderInstructionAsync({
        config: configPda[0],
        payer: asTransactionSigner(this.walletPubkey),
        accountToAdd: holder,
        role,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE);

      return signature;
    } catch (error) {
      console.error('Error in addRoleHolder:', error);
      throw error;
    }
  }

  async removeRoleHolder(role: string, holder: Address): Promise<string> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    try {
      const configPda = await findConfigPdaAsync();

      const instruction = await getRemoveRoleHolderInstructionAsync({
        config: configPda[0],
        roleHolder: holder,
        role,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const signature = await this.sendTransaction(tx);

      CacheService.invalidateByTag(CACHE_TAGS.ROLE);

      return signature;
    } catch (error) {
      console.error('Error in removeRoleHolder:', error);
      throw error;
    }
  }

  async queryNetbookState(serialNumber: string): Promise<any> {
    if (!this.connection || !this.walletAdapter || !this.walletPubkey) {
      throw new Error('Program not initialized or wallet not connected.');
    }

    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }

    try {
      const instruction = getQueryNetbookStateInstruction({
        netbook: netbookPda,
        serial: serialNumber,
      }, { programAddress: PROGRAM_ID });

      const tx = new Transaction().add(instruction as any);
      const simulation = await this.connection.simulateTransaction(tx);

      return simulation;
    } catch (error) {
      console.error('Error in queryNetbookState:', error);
      throw error;
    }
  }

  // ==================== Helper Methods ====================

  private async sendTransaction(transaction: Transaction): Promise<string> {
    if (!this.walletAdapter?.signTransaction || !this.connection) {
      throw new Error('Wallet or connection not available');
    }

    const signed = await this.walletAdapter.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature);

    return signature;
  }

  clearCaches(): void {
    CacheService.clear();
  }

  invalidateCachePrefix(prefix: string): void {
    CacheService.invalidateByPrefix(prefix);
  }
}

export const unifiedSupplyChainService = UnifiedSupplyChainService.getInstance();
