/**
 * Wrapper para operaciones del programa SupplyChain en Solana
 * Este módulo proporciona funciones de conveniencia para interactuar
 * con el programa Codama desde los componentes del frontend
 *
 * Migrado de Anchor a Codama (Issue #209)
 */

import {
  type Address,
  type Rpc,
  type GetAccountInfoApi,
  type GetMultipleAccountsApi,
  type MaybeAccount,
} from '@solana/kit';

import {
  fetchMaybeSupplyChainConfig,
  fetchMaybeNetbook,
  type SupplyChainConfig,
  type Netbook,
} from '@/generated/src/generated/accounts';

import { PROGRAM_ID, findConfigPda, findNetbookPda } from '@/lib/contracts/solana-program';
import { connection } from '@/lib/solana/connection';
import { CacheService, CACHE_TAGS } from '@/lib/cache/cache-service';

// ==================== RPC Helper ====================

/**
 * Get the RPC instance from the web3.js connection.
 * Codama generated account fetchers accept the RPC parameter directly.
 * The web3.js Connection object is compatible as an RPC transport
 * because Codama's fetchEncodedAccount uses standard RPC methods.
 */
function getRpc(): Rpc<GetAccountInfoApi & GetMultipleAccountsApi> {
  return connection as unknown as Rpc<GetAccountInfoApi & GetMultipleAccountsApi>;
}

// ==================== Legacy Provider/Program (Deprecated) ====================

/**
 * @deprecated Codama does not use AnchorProvider.
 * This function is retained for backward compatibility but returns null.
 * Use the Codama client pattern instead.
 */
export function createProvider(): null {
  console.warn('createProvider is deprecated in Codama migration. Use Codama client pattern.');
  return null;
}

/**
 * @deprecated Codama does not use Program instances.
 * This function is retained for backward compatibility but returns null.
 * Use Codama instruction builders from solana-program.ts instead.
 */
export function getSupplyChainProgram(): null {
  console.warn('getSupplyChainProgram is deprecated in Codama migration.');
  return null;
}

// ==================== Query Functions (Real Implementation) ====================

/**
 * Find netbook PDA by serial number
 * Searches through all netbook accounts to find matching serial
 */
async function findNetbookPdaBySerial(
  serialNumber: string,
  maxSearch: number = 1000
): Promise<{ pda: Address; tokenId: number } | null> {
  const cacheKey = `findNetbookPdaBySerial:${serialNumber}`;
  const cached = CacheService.get<{ pda: string; tokenId: number }>(cacheKey);
  if (cached) {
    return { pda: cached.pda as Address, tokenId: cached.tokenId };
  }

  try {
    const [configPda] = await findConfigPda();
    const rpc = getRpc();

    const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda);
    if (!configAccount.exists) return null;

    // Use typed config data
    const totalNetbooks = Number(configAccount.data.totalNetbooks);
    const searchLimit = Math.min(totalNetbooks, maxSearch);

    // Search in batches
    const batchSize = 10;
    for (let start = 1; start <= searchLimit; start += batchSize) {
      const end = Math.min(start + batchSize - 1, searchLimit);
      const promises: Promise<{ pda: Address; tokenId: number } | null>[] = [];

      for (let i = start; i <= end; i++) {
        promises.push(
          (async () => {
            const [netbookPda] = await findNetbookPda(i);
            const maybeNetbook = await fetchMaybeNetbook(rpc, netbookPda);
            if (maybeNetbook.exists && maybeNetbook.data.serialNumber === serialNumber) {
              return { pda: netbookPda, tokenId: i };
            }
            return null;
          })()
        );
      }

      const results = await Promise.all(promises);

      for (const result of results) {
        if (result) {
          CacheService.set(cacheKey, { pda: result.pda, tokenId: result.tokenId }, {
            tags: [CACHE_TAGS.NETBOOK],
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
    const [configPda] = await findConfigPda();
    const rpc = getRpc();

    const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda);
    if (!configAccount.exists) return [];

    const totalNetbooks = Number(configAccount.data.totalNetbooks);
    const searchLimit = Math.min(totalNetbooks, maxSearch);
    const serials: string[] = [];

    // Fetch netbooks in batches
    const batchSize = 10;
    for (let start = 1; start <= searchLimit; start += batchSize) {
      const end = Math.min(start + batchSize - 1, searchLimit);
      const promises: Promise<string | null>[] = [];

      for (let i = start; i <= end; i++) {
        promises.push(
          (async () => {
            const [netbookPda] = await findNetbookPda(i);
            const maybeNetbook = await fetchMaybeNetbook(rpc, netbookPda);
            if (maybeNetbook.exists) {
              return maybeNetbook.data.serialNumber;
            }
            return null;
          })()
        );
      }

      const results = await Promise.all(promises);
      for (const serial of results) {
        if (serial) {
          serials.push(serial);
        }
      }
    }

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
      const state = report.state ?? 0;
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
export async function getNetbookReport(serial: string): Promise<Netbook | null> {
  const cacheKey = `getNetbookReport:${serial}`;
  const cached = CacheService.get<Netbook>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await findNetbookPdaBySerial(serial);
    if (!result) return null;

    const rpc = getRpc();
    const maybeNetbook = await fetchMaybeNetbook(rpc, result.pda);
    if (!maybeNetbook.exists) return null;

    CacheService.set(cacheKey, maybeNetbook.data, { tags: [CACHE_TAGS.NETBOOK] });
    return maybeNetbook.data;
  } catch (error) {
    console.error('Error getting netbook report:', error);
    return null;
  }
}

// ==================== Funciones de Roles ====================

/**
 * Obtener todos los miembros de un rol
 * Uses the Config account which stores the primary role holders.
 */
export async function getAllMembers(roleHash: string): Promise<string[]> {
  const cacheKey = `getAllMembers:${roleHash}`;
  const cached = CacheService.get<string[]>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [configPda] = await findConfigPda();
    const rpc = getRpc();

    const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda);
    if (!configAccount.exists) return [];

    const config = configAccount.data;
    const members: string[] = [];

    // Map role names to config fields
    const roleFields: Record<string, Address> = {
      admin: config.admin,
      fabricante: config.fabricante,
      auditorHw: config.auditorHw,
      tecnicoSw: config.tecnicoSw,
      escuela: config.escuela,
    };

    // Check if the requested role exists in config
    if (roleFields[roleHash]) {
      const addr = roleFields[roleHash];
      // Skip empty addresses (all zeros or system program)
      if (addr && !addr.startsWith('1111')) {
        members.push(addr);
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

    const [configPda] = await findConfigPda();
    const rpc = getRpc();

    const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda);
    if (!configAccount.exists) return false;

    const config = configAccount.data;

    // Check against role positions in config account
    const roleAddresses: Record<string, Address> = {
      admin: config.admin,
      fabricante: config.fabricante,
      auditorHw: config.auditorHw,
      tecnicoSw: config.tecnicoSw,
      escuela: config.escuela,
    };

    // Check if address matches the specific role
    if (roleAddresses[roleHash] === address) {
      return true;
    }

    // Also check all roles for broader matching
    for (const roleAddr of Object.values(roleAddresses)) {
      if (roleAddr === address) return true;
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
export async function getConfigData(): Promise<SupplyChainConfig | null> {
  const cacheKey = 'getConfigData';
  const cached = CacheService.get<SupplyChainConfig>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [configPda] = await findConfigPda();
    const rpc = getRpc();

    const configAccount = await fetchMaybeSupplyChainConfig(rpc, configPda);
    if (!configAccount.exists) return null;

    CacheService.set(cacheKey, configAccount.data, { tags: [CACHE_TAGS.CONFIG] });
    return configAccount.data;
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
  if (!config) return 0;
  return Number(config.totalNetbooks);
}

/**
 * Obtener el próximo token ID
 */
export async function getNextTokenId(): Promise<number> {
  const config = await getConfigData();
  if (!config) return 0;
  return Number(config.nextTokenId);
}
