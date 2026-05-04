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
   */
  async auditHardware(
    serialNumber: string,
    passed: boolean,
    reportHash: number[]
  ): Promise<string> {
    const [netbookPda] = findNetbookPda(0); // Need to find by serial
    
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
   */
  async validateSoftware(
    serialNumber: string,
    osVersion: string,
    passed: boolean
  ): Promise<string> {
    const [netbookPda] = findNetbookPda(0); // Need to find by serial
    
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
   */
  async assignToStudent(
    serialNumber: string,
    schoolHash: number[],
    studentHash: number[]
  ): Promise<string> {
    const [netbookPda] = findNetbookPda(0); // Need to find by serial
    
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
   */
  async queryNetbookState(serialNumber: string): Promise<any> {
    const [netbookPda] = findNetbookPda(0); // Need to find by serial
    
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
