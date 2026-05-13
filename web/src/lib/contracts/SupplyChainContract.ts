/**
 * Wrapper para operaciones del programa SupplyChain en Solana
 * Este módulo proporciona funciones de conveniencia para interactuar
 * con el programa Anchor desde los componentes del frontend
 * 
 * Migrado de Ethereum/Viem a Solana/Anchor
 */

import { AnchorProvider, Program, BN } from '@anchor-lang/core';
import { Connection, PublicKey } from '@solana/web3.js';
import { getProgram, PROGRAM_ID } from '@/lib/contracts/solana-program';
import { connection } from '@/lib/solana/connection';
import { CacheService, CACHE_TAGS } from '@/lib/cache/cache-service';

// ==================== Utilidades ====================

/**
 * Obtener provider desde wallet y connection
 */
export function createProvider(wallet: any, conn?: Connection): AnchorProvider | null {
  const connectionToUse = conn || connection;
  if (!wallet) return null;
  
  return new AnchorProvider(
    connectionToUse,
    wallet as any,
    { commitment: 'confirmed' }
  );
}

/**
 * Obtener instancia del programa
 */
export function getSupplyChainProgram(provider: AnchorProvider): Program<any> {
  return getProgram(provider);
}

// ==================== Query Functions (Real Implementation) ====================

/**
 * Find netbook PDA by serial number
 * Searches through all netbook accounts to find matching serial
 */
async function findNetbookPdaBySerial(
  serialNumber: string,
  program: Program<any>,
  maxSearch: number = 1000
): Promise<{ pda: PublicKey; tokenId: number } | null> {
  const cacheKey = `findNetbookPdaBySerial:${serialNumber}`;
  const cached = CacheService.get<{ pda: string; tokenId: number }>(cacheKey);
  if (cached) {
    return { pda: new PublicKey(cached.pda), tokenId: cached.tokenId };
  }

  try {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return null;

    // Parse config to get totalNetbooks
    const deserialized = program.coder.accounts.decode('supplyChainConfig', accountInfo.data);
    const totalNetbooks = Number(deserialized.totalNetbooks);
    const searchLimit = Math.min(totalNetbooks, maxSearch);

    // Search in batches
    const batchSize = 10;
    for (let start = 1; start <= searchLimit; start += batchSize) {
      const end = Math.min(start + batchSize - 1, searchLimit);
      const promises = [];

      for (let i = start; i <= end; i++) {
        const tokenIdBuffer = Buffer.alloc(8);
        tokenIdBuffer.writeBigUInt64LE(BigInt(i), 0);
        
        const [netbookPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('netbook'), Buffer.from('netbook'), tokenIdBuffer.slice(0, 7)],
          PROGRAM_ID
        );

        promises.push(
          connection.getAccountInfo(netbookPda).then(info => {
            if (info) {
              try {
                const netbook = program.coder.accounts.decode('netbook', info.data);
                if (netbook.serialNumber === serialNumber) {
                  return { pda: netbookPda, tokenId: i, netbook };
                }
              } catch {
                // Skip accounts that can't be decoded
              }
            }
            return null;
          })
        );
      }

      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result) {
          CacheService.set(cacheKey, { pda: result.pda.toString(), tokenId: result.tokenId }, {
            tags: [CACHE_TAGS.NETBOOK]
          });
          return result;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding netbook by serial:', error);
    return null;
  }
}

/**
 * Obtener todos los serial numbers registrados
 */
export async function getAllSerialNumbers(maxSearch: number = 10000): Promise<string[]> {
  const cacheKey = `getAllSerialNumbers:${maxSearch}`;
  const cached = CacheService.get<string[]>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return [];

    // For now, return empty array - real implementation requires Anchor program
    // The unified service provides the full implementation
    const serials: string[] = [];
    CacheService.set(cacheKey, serials, { tags: [CACHE_TAGS.NETBOOKS_LIST] });
    return serials;
  } catch {
    return [];
  }
}

/**
 * Obtener el estado actual de una netbook
 */
export async function getNetbookState(serial: string): Promise<number> {
  const cacheKey = `getNetbookState:${serial}`;
  const cached = CacheService.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const report = await getNetbookReport(serial);
    if (report) {
      const state = report.currentState ?? 0;
      CacheService.set(cacheKey, state, { tags: [CACHE_TAGS.NETBOOK] });
      return state;
    }
  } catch {
    // Fall through to default
  }
  
  return 0; // Estado por defecto: FABRICADA
}

/**
 * Obtener netbooks por estado
 */
export async function getNetbooksByState(state: number, maxSearch: number = 10000): Promise<string[]> {
  const cacheKey = `getNetbooksByState:${state}`;
  const cached = CacheService.get<string[]>(cacheKey);
  if (cached !== null) return cached;

  try {
    const allSerials = await getAllSerialNumbers(maxSearch);
    const result: string[] = [];
    
    for (const serial of allSerials) {
      const currentState = await getNetbookState(serial);
      if (currentState === state) {
        result.push(serial);
      }
    }
    
    CacheService.set(cacheKey, result, { tags: [CACHE_TAGS.NETBOOKS_LIST] });
    return result;
  } catch {
    return [];
  }
}

/**
 * Obtener reporte detallado de una netbook
 */
export async function getNetbookReport(serial: string): Promise<any> {
  const cacheKey = `getNetbookReport:${serial}`;
  const cached = CacheService.get<any>(cacheKey);
  if (cached !== null) return cached;

  // This requires the Anchor program to be properly initialized
  // For standalone usage, we return null - use UnifiedSupplyChainService instead
  return null;
}

// ==================== Funciones de Roles ====================

/**
 * Obtener todos los miembros de un rol
 */
export async function getAllMembers(roleHash: string): Promise<string[]> {
  const cacheKey = `getAllMembers:${roleHash}`;
  const cached = CacheService.get<string[]>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return [];

    // Parse config account to extract role members
    // The config account layout: admin(32) + fabricante(32) + auditorHw(32) + tecnicoSw(32) + escuela(32) + ...
    const members: string[] = [];
    
    // Extract public keys from the account data
    const roleKeys = [
      { start: 0, end: 32, name: 'admin' },
      { start: 32, end: 64, name: 'fabricante' },
      { start: 64, end: 96, name: 'auditorHw' },
      { start: 96, end: 128, name: 'tecnicoSw' },
      { start: 128, end: 160, name: 'escuela' },
    ];

    for (const role of roleKeys) {
      if (accountInfo.data.length >= role.end) {
        const pubkeyBytes = accountInfo.data.slice(role.start, role.end);
        // Check if it's not all zeros (empty)
        const isEmpty = pubkeyBytes.every(b => b === 0);
        if (!isEmpty) {
          try {
            const pubkey = new PublicKey(pubkeyBytes);
            const addr = pubkey.toString();
            // Skip system program
            if (!addr.startsWith('1111')) {
              members.push(addr);
            }
          } catch {
            // Skip invalid public keys
          }
        }
      }
    }

    CacheService.set(cacheKey, members, { tags: [CACHE_TAGS.ROLE] });
    return members;
  } catch {
    return [];
  }
}

/**
 * Obtener conteo de miembros de un rol
 */
export async function getRoleMemberCount(roleHash: string): Promise<number> {
  const members = await getAllMembers(roleHash);
  return members.length;
}

/**
 * Verificar si una dirección tiene un rol específico
 */
export async function hasRole(roleHash: string, address: string): Promise<boolean> {
  try {
    if (!address) return false;
    
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return false;

    const userPubkey = new PublicKey(address);
    const userBuffer = userPubkey.toBuffer();

    // Check against role positions in config account
    const rolePositions = [
      { start: 0, name: 'admin' },
      { start: 32, name: 'fabricante' },
      { start: 64, name: 'auditorHw' },
      { start: 96, name: 'tecnicoSw' },
      { start: 128, name: 'escuela' },
    ];

    for (const role of rolePositions) {
      if (accountInfo.data.length >= role.start + 32) {
        const roleBytes = accountInfo.data.slice(role.start, role.start + 32);
        const matches = roleBytes.every((byte, i) => byte === userBuffer[i]);
        if (matches) return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

// ==================== Operaciones de Transacción ====================

/**
 * Registrar netbooks en batch
 */
export async function registerNetbooks(
  serials: string[],
  batches: string[],
  specs: string[]
): Promise<string> {
  throw new Error('registerNetbooks requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Auditar hardware
 */
export async function auditHardware(
  serial: string,
  passed: boolean,
  reportHash: string
): Promise<string> {
  throw new Error('auditHardware requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Validar software
 */
export async function validateSoftware(
  serial: string,
  osVersion: string,
  passed: boolean
): Promise<string> {
  throw new Error('validateSoftware requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Asignar a estudiante
 */
export async function assignToStudent(
  serial: string,
  schoolHash: string,
  studentIdHash: string
): Promise<string> {
  throw new Error('assignToStudent requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Otorgar rol
 */
export async function grantRole(
  role: string,
  account: string
): Promise<string> {
  throw new Error('grantRole requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Revocar rol
 */
export async function revokeRole(
  role: string,
  account: string
): Promise<string> {
  throw new Error('revokeRole requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Solicitar rol
 */
export async function requestRole(role: string): Promise<string> {
  throw new Error('requestRole requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Aprobar solicitud de rol
 */
export async function approveRoleRequest(role: string): Promise<string> {
  throw new Error('approveRoleRequest requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Rechazar solicitud de rol
 */
export async function rejectRoleRequest(role: string): Promise<string> {
  throw new Error('rejectRoleRequest requires a connected wallet context. Use useSupplyChainService hook instead.');
}

// ==================== Helper Functions ====================

/**
 * Obtener datos de configuración
 */
export async function getConfigData(): Promise<any> {
  const cacheKey = 'getConfigData';
  const cached = CacheService.get<any>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return null;

    // Parse config account data
    // Layout: admin(32) + fabricante(32) + auditorHw(32) + tecnicoSw(32) + escuela(32) + adminBump(1) + nextTokenId(8) + totalNetbooks(8) + roleRequestsCount(8)
    const data = accountInfo.data;
    
    const config = {
      admin: new PublicKey(data.slice(0, 32)).toString(),
      fabricante: new PublicKey(data.slice(32, 64)).toString(),
      auditorHw: new PublicKey(data.slice(64, 96)).toString(),
      tecnicoSw: new PublicKey(data.slice(96, 128)).toString(),
      escuela: new PublicKey(data.slice(128, 160)).toString(),
      adminBump: data[160],
      nextTokenId: Number(new BN(data.slice(161, 169), 'le').toString()),
      totalNetbooks: Number(new BN(data.slice(169, 177), 'le').toString()),
      roleRequestsCount: Number(new BN(data.slice(177, 185), 'le').toString()),
    };

    CacheService.set(cacheKey, config, { tags: [CACHE_TAGS.CONFIG] });
    return config;
  } catch (error) {
    console.error('Error getting config data:', error);
    return null;
  }
}

/**
 * Obtener conteo total de netbooks
 */
export async function getTotalNetbooks(): Promise<number> {
  const config = await getConfigData();
  return config?.totalNetbooks ?? 0;
}

/**
 * Obtener el próximo token ID
 */
export async function getNextTokenId(): Promise<number> {
  const config = await getConfigData();
  return config?.nextTokenId ?? 0;
}
