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

export class SolanaSupplyChainService {
  constructor(
    private program: Program<SupplyChainIDL>,
    private walletPubkey: PublicKey
  ) {}

  /**
   * Find netbook by serial number (Issue #35, #45 fix)
   * Uses parallel batch fetching for O(n/10) performance instead of O(n)
   * @param serialNumber - The serial number to search for
   * @param maxSearch - Maximum token IDs to search (default: 1000)
   * @param batchSize - Number of parallel fetches (default: 10)
   * @returns NetbookData if found, null otherwise
   */
  async findNetbookBySerial(serialNumber: string, maxSearch: number = 1000, batchSize: number = 10): Promise<NetbookData | null> {
    const [configPda] = findConfigPda();
    const configAccount = await this.program.account.supplyChainConfig.fetch(configPda);
    const totalNetbooks = (configAccount as any).totalNetbooks as BN;
    
    const searchLimit = Math.min(Number(totalNetbooks), maxSearch);
    
    // Process in batches for parallel fetching
    for (let start = 1; start <= searchLimit; start += batchSize) {
      const end = Math.min(start + batchSize - 1, searchLimit);
      const batch = [];
      
      for (let i = start; i <= end; i++) {
        const [netbookPda] = findNetbookPda(i);
        batch.push(this.program.account.netbook.fetchNullable(netbookPda).catch(() => null));
      }
      
      const results = await Promise.all(batch);
      
      for (const result of results) {
        if (result && (result as any).serialNumber === serialNumber && (result as any).exists) {
          return result as unknown as NetbookData;
        }
      }
    }
    
    return null;
  }

  /**
   * Get netbook PDA by serial number (returns PDA key only, no data)
   * Issue #35 fix - replaces hardcoded findNetbookPda(0)
   * @param serialNumber - The serial number to search for
   * @returns PublicKey of the netbook PDA, or null if not found
   */
  async getNetbookPdaBySerial(serialNumber: string): Promise<PublicKey | null> {
    const netbookData = await this.findNetbookBySerial(serialNumber);
    if (!netbookData) return null;
    
    const [netbookPda] = findNetbookPda(Number(netbookData.tokenId));
    return netbookPda;
  }

  /**
   * Initialize the supply chain config (admin only)
   */
  async initialize(): Promise<string> {
    const [configPda] = findConfigPda();
    
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
  ): Promise<{ signature: string; tokenId: bigint }> {
    const [configPda] = findConfigPda();
    const configAccount = await this.program.account.supplyChainConfig.fetch(configPda);
    const nextTokenId = (configAccount as any).nextTokenId as BN;
    
    const [netbookPda] = findNetbookPda(nextTokenId.toNumber());
    
    const tx = await this.program.methods
      .registerNetbook(serialNumber, batchId, modelSpecs)
      .accounts({
        config: configPda,
        manufacturer: this.walletPubkey,
        netbook: netbookPda,
        systemProgram: PublicKey.default,
      })
      .rpc();
    
    return { signature: tx, tokenId: nextTokenId.toBigInt() };
  }

  /**
   * Audit hardware on a netbook
   * Issue #35 fix - uses getNetbookPdaBySerial instead of hardcoded 0
   */
  async auditHardware(
    serialNumber: string,
    passed: boolean,
    reportHash: number[]
  ): Promise<string> {
    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }
    
    const tx = await this.program.methods
      .auditHardware(serialNumber, passed, new Uint8Array(reportHash) as any)
      .accounts({
        netbook: netbookPda,
        config: findConfigPda()[0],
        auditor: this.walletPubkey,
      })
      .rpc();
    
    return tx;
  }

  /**
   * Validate software on a netbook
   * Issue #35 fix - uses getNetbookPdaBySerial instead of hardcoded 0
   */
  async validateSoftware(
    serialNumber: string,
    osVersion: string,
    passed: boolean
  ): Promise<string> {
    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }
    
    const tx = await this.program.methods
      .validateSoftware(serialNumber, osVersion, passed)
      .accounts({
        netbook: netbookPda,
        config: findConfigPda()[0],
        technician: this.walletPubkey,
      })
      .rpc();
    
    return tx;
  }

  /**
   * Assign netbook to student
   * Issue #35 fix - uses getNetbookPdaBySerial instead of hardcoded 0
   */
  async assignToStudent(
    serialNumber: string,
    schoolHash: number[],
    studentHash: number[]
  ): Promise<string> {
    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }
    
    const tx = await this.program.methods
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
  }

  /**
   * Query netbook state (using simulateTransaction)
   * Issue #35 fix - uses getNetbookPdaBySerial instead of hardcoded 0
   */
  async queryNetbookState(serialNumber: string): Promise<any> {
    const netbookPda = await this.getNetbookPdaBySerial(serialNumber);
    if (!netbookPda) {
      throw new Error(`Netbook with serial ${serialNumber} not found`);
    }
    
    const tx = await this.program.methods
      .queryNetbookState(serialNumber)
      .accounts({
        netbook: netbookPda,
      })
      .simulate();
    
    return tx;
  }

  /**
   * Query config data
   */
  async queryConfig(): Promise<ConfigData> {
    const [configPda] = findConfigPda();
    const configAccount = await this.program.account.supplyChainConfig.fetch(configPda);
    return configAccount as unknown as ConfigData;
  }

  /**
   * Grant role to an account
   */
  async grantRole(role: string, accountToGrant: PublicKey): Promise<string> {
    const [configPda] = findConfigPda();
    
    const tx = await this.program.methods
      .grantRole(role)
      .accounts({
        config: configPda,
        admin: this.walletPubkey,
        accountToGrant,
        systemProgram: PublicKey.default,
      })
      .rpc();
    
    return tx;
  }

  /**
   * Request a role
   */
  async requestRole(role: string): Promise<string> {
    const [configPda] = findConfigPda();
    const [roleRequestPda] = findRoleRequestPda(this.walletPubkey);
    
    const tx = await this.program.methods
      .requestRole(role)
      .accounts({
        config: configPda,
        roleRequest: roleRequestPda,
        user: this.walletPubkey,
        systemProgram: PublicKey.default,
      })
      .rpc();
    
    return tx;
  }
}
