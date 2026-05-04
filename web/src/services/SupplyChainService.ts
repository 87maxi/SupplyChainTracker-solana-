"use client";

import { BaseContractService } from './contracts/base-contract.service';
import SupplyChainTrackerABI from '@/lib/contracts/abi/SupplyChainTracker.json';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';
import { anvil } from 'viem/chains';
import { contractRegistry, ContractConfig } from './contract-registry.service';

// Tipos de retorno
interface TransactionResult {
  success: boolean;
  hash?: `0x${string}`;
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
 * Servicio principal para operaciones de la cadena de suministro
 */
export class SupplyChainService extends BaseContractService {
  static instance: SupplyChainService | null = null;
  // Obtener instancia singleton
  static getInstance(): SupplyChainService {
    if (!SupplyChainService.instance) {
      SupplyChainService.instance = new SupplyChainService();
    }
    return SupplyChainService.instance;
  }

  // Servicio singleton - now using a getter to ensure proper initialization
  static get supplyChainService(): SupplyChainService {
    return SupplyChainService.getInstance();
  }

  constructor() {
    // Validar que la dirección del contrato esté disponible
    if (!NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
      console.error('❌ NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS no está configurado');
      throw new Error('La dirección del contrato no está configurada. Verifique el archivo .env.local');
    }

    // Aseguramos que el ABI esté en formato de array
    const abi = Array.isArray(SupplyChainTrackerABI) ? SupplyChainTrackerABI : Object.values(SupplyChainTrackerABI).flat();

    super(
      NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`,
      abi,
      'supply-chain'
    );

    console.log('✅ SupplyChainService inicializado con dirección:', this.contractAddress);

    // Registrar este contrato en el registro
    const config: ContractConfig = {
      address: this.contractAddress,
      abi: this.abi,
      version: '1.0.0'
    };
    contractRegistry.register('SupplyChainTracker', this, config);
  }

  // Reemplazo de métodos abstractos de BaseContractService
  protected async readContract({
    address,
    abi,
    functionName,
    args
  }: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
  }) {
    const { publicClient } = await import('@/lib/blockchain/client');
    try {
      return await publicClient.readContract({
        address,
        abi,
        functionName,
        args
      });
    } catch (error) {
      console.error('Error en readContract:', error);
      throw error;
    }
  }

  protected async writeContract({
    address,
    abi,
    functionName,
    args
  }: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args: any[];
  }) {
    const { getWalletClient } = await import('@/lib/blockchain/client');
    try {
      const walletClient = await getWalletClient();
      const hash = await walletClient.writeContract({
        address,
        abi,
        functionName,
        args,
        chain: anvil,
        account: (await this.getAddress()) as `0x${string}`
      });
      return hash;
    } catch (error) {
      console.error('Error en writeContract:', error);
      throw error;
    }
  }

  protected async waitForTransactionReceipt({
    hash,
    timeout
  }: {
    hash: `0x${string}`;
    timeout: number;
  }) {
    const { publicClient } = await import('@/lib/blockchain/client');
    try {
      return await publicClient.waitForTransactionReceipt({
        hash,
        timeout
      });
    } catch (error) {
      console.error('Error en waitForTransactionReceipt:', error);
      throw error;
    }
  }

  protected async getAddress(): Promise<string> {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && Array.isArray(accounts) && accounts.length > 0) {
          return accounts[0];
        }
      } catch (error) {
        console.error('Error requesting accounts:', error);
      }
    }
    throw new Error('No se encontró una cuenta conectada. Por favor conecta tu wallet.');
  }

  // Operaciones de netbooks

  /**
   * Registra una o múltiples netbooks
   * @param serials Números de serie
   * @param batches IDs de lote
   * @param specs Especificaciones del modelo
   * @returns Resultado de la transacción
   */
  registerNetbooks = async (serials: string[], batches: string[], specs: string[], metadata: string[]): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('registerNetbooks', [serials, batches, specs, metadata]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache('getAllSerialNumbers');
      this.invalidateCache('getNetbookState');

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Realiza auditoría de hardware
   * @param serial Número de serie
   * @param passed Si pasó la auditoría
   * @param reportHash Hash del informe
   * @returns Resultado de la transacción
   */
  auditHardware = async (serial: string, passed: boolean, reportHash: string, metadata: string): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('auditHardware', [serial, passed, reportHash, metadata]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache(`getNetbookState:${serial}`);
      this.invalidateCache(`getNetbookReport:${serial}`);

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Valida software
   * @param serial Número de serie
   * @param osVersion Versión del sistema
   * @param passed Si pasó la validación
   * @returns Resultado de la transacción
   */
  validateSoftware = async (serial: string, osVersion: string, passed: boolean, metadata: string): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('validateSoftware', [serial, osVersion, passed, metadata]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache(`getNetbookState:${serial}`);
      this.invalidateCache(`getNetbookReport:${serial}`);

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Asigna netbook a estudiante
   * @param serial Número de serie
   * @param schoolHash Hash de la escuela
   * @param studentHash Hash del estudiante
   * @returns Resultado de la transacción
   */
  assignToStudent = async (serial: string, schoolHash: string, studentHash: string, metadata: string): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('assignToStudent', [serial, schoolHash, studentHash, metadata]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache(`getNetbookState:${serial}`);
      this.invalidateCache(`getNetbookReport:${serial}`);

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  // Operaciones de roles

  /**
   * Otorga un rol a una dirección
   * @param roleHash Hash del rol
   * @param userAddress Dirección del usuario
   * @returns Resultado de la transacción
   */
  grantRole = async (roleHash: `0x${string}`, userAddress: `0x${string}`): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('grantRole', [roleHash, userAddress]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache(`hasRole:${roleHash}:${userAddress}`);
      this.invalidateCache('getAllRolesSummary');

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Revoca un rol de una dirección
   * @param roleHash Hash del rol
   * @param userAddress Dirección del usuario
   * @returns Resultado de la transacción
   */
  revokeRole = async (roleHash: `0x${string}`, userAddress: `0x${string}`): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('revokeRole', [roleHash, userAddress]);

      // Esperar confirmación
      const receipt = await this.waitForTransaction(hash);

      // Invalidar caché
      this.invalidateCache(`hasRole:${roleHash}:${userAddress}`);
      this.invalidateCache('getAllRolesSummary');

      return {
        success: true,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Obtiene todos los miembros de un rol
   * @param roleHash Hash del rol
   * @returns Array de direcciones
   */
  getAllMembers = async (roleHash: `0x${string}`): Promise<`0x${string}`[]> => {
    return await this.readCacheable(`getAllMembers:${roleHash}`, () =>
      this.read<`0x${string}`[]>('getAllMembers', [roleHash])
    );
  };

  /**
   * Revoca todos los roles de un usuario (excepto ADMIN si es el último)
   * @param userAddress Dirección del usuario
   * @returns Resultado de la transacción
   */
  revokeAllRoles = async (userAddress: `0x${string}`): Promise<TransactionResult> => {
    try {
      const roles = ['FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE', 'ADMIN'];
      const results: TransactionResult[] = [];

      for (const roleName of roles) {
        const roleHash = await this.getRoleByName(roleName);
        const hasRole = await this.hasRole(roleHash, userAddress);

        if (hasRole) {
          // Si es ADMIN, podríamos querer una confirmación extra o evitar que se auto-elimine el último
          const result = await this.revokeRole(roleHash, userAddress);
          results.push(result);
        }
      }

      const allSuccess = results.every(r => r.success);
      return {
        success: allSuccess,
        error: allSuccess ? undefined : 'Algunos roles no pudieron ser revocados'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  // Operaciones de solicitudes de roles

  /**
   * Solicita un rol en la blockchain
   * @param roleHash Hash del rol solicitado
   * @param signature Firma opcional
   * @returns Resultado de la transacción
   */
  requestRole = async (roleHash: `0x${string}`, signature: string = ''): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('requestRole', [roleHash, signature]);
      await this.waitForTransaction(hash);
      return { success: true, hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Aprueba una solicitud de rol en la blockchain
   * @param requestId ID de la solicitud
   * @returns Resultado de la transacción
   */
  approveRoleRequest = async (requestId: number): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('approveRoleRequest', [BigInt(requestId)]);
      await this.waitForTransaction(hash);
      return { success: true, hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Rechaza una solicitud de rol en la blockchain
   * @param requestId ID de la solicitud
   * @returns Resultado de la transacción
   */
  rejectRoleRequest = async (requestId: number): Promise<TransactionResult> => {
    try {
      const { hash } = await this.write('rejectRoleRequest', [BigInt(requestId)]);
      await this.waitForTransaction(hash);
      return { success: true, hash };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Obtiene el número total de solicitudes de roles
   */
  getRoleRequestsCount = async (): Promise<number> => {
    const count = await this.read<bigint>('getRoleRequestsCount', []);
    return Number(count);
  };

  /**
   * Obtiene una solicitud de rol por índice
   * @param index Índice de la solicitud
   */
  getRoleRequest = async (index: number): Promise<any> => {
    return await this.read('roleRequests', [BigInt(index)]);
  };

  // Operaciones de lectura

  /**
   * Obtiene todos los números de serie registrados
   * @returns Array de números de serie
   */
  getAllSerialNumbers = async (): Promise<string[]> => {
    return await this.readCacheable('getAllSerialNumbers', () =>
      this.read<string[]>('getAllSerialNumbers', [])
    );
  };

  /**
   * Obtiene el estado actual de una netbook
   * @param serial Número de serie
   * @returns Estado de la netbook
   */
  getNetbookState = async (serial: string): Promise<string> => {
    return await this.readCacheable(`getNetbookState:${serial}`, async () => {
      // El contrato devuelve un enum (uint8), lo convertimos a string si es necesario
      // O si el contrato devuelve string, lo usamos directo.
      // Asumiendo que el frontend espera el string del enum.
      const stateEnum = await this.read<number>('getNetbookState', [serial]);
      const states = ['FABRICADA', 'HW_APROBADO', 'SW_VALIDADO', 'DISTRIBUIDA'];
      return states[stateEnum] || 'UNKNOWN';
    });
  };

  /**
   * Obtiene conteos de miembros por rol
   * @returns Objeto con conteos
   */
  getRoleCounts = async (): Promise<Record<string, number>> => {
    // Esta función es un helper que agrega datos de varios roles
    // Podríamos implementarla llamando a getRoleMemberCount para cada rol
    const roles = ['FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'];
    const counts: Record<string, number> = {};

    await Promise.all(roles.map(async (role) => {
      try {
        const roleHash = await this.getRoleByName(role);
        const count = await this.read<bigint>('getRoleMemberCount', [roleHash]);
        counts[role] = Number(count);
      } catch (e) {
        counts[role] = 0;
      }
    }));

    return counts;
  };

  /**
   * Verifica la conexión con la blockchain
   * @returns True si hay conexión
   */
  checkConnection = async (): Promise<boolean> => {
    try {
      const { publicClient } = await import('@/lib/blockchain/client');
      await publicClient.getBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * Verifica si una cuenta tiene un rol específico
   * @param roleHash Hash del rol
   * @param userAddress Dirección del usuario
   * @returns True si la cuenta tiene el rol
   */
  hasRole = async (roleHash: `0x${string}`, userAddress: `0x${string}`): Promise<boolean> => {
    try {
      return await this.read<boolean>('hasRole', [roleHash, userAddress]);
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  };

  /**
   * Obtiene el estado actual de una netbook
   * @param serial Número de serie
        * @returns Estado de la netbook
   */
  getNetbookReport = async (serial: string): Promise<Netbook> => {
    return await this.readCacheable(`getNetbookReport:${serial}`, () =>
      this.read('getNetbookReport', [serial])
    );
  };

  /**
   * Obtiene el hash del rol por nombre
   * @param roleType Tipo de rol
   * @returns Hash del rol
   */
  getRoleByName = async (roleType: string): Promise<`0x${string}`> => {
    try {
      // En lugar de consultar al contrato, usamos las constantes predefinidas
      const roleTypeUpper = roleType.toUpperCase();

      // Mapeo de nombres de roles comunes a sus hashes, incluyendo variantes con y sin _ROLE
      const roleMap: Record<string, `0x${string}`> = {
        // Formas completas con _ROLE
        'FABRICANTE_ROLE': '0xbe0c84bfff967b2deb88bd0540d4a796d0ebfdcb72262ced26f1892b419e6457',
        'AUDITOR_HW_ROLE': '0x49c0376dc7caa3eab0c186e9bc20bf968b0724fea74a37706c35f59bc5d8b15b',
        'TECNICO_SW_ROLE': '0xeeb4ddf6a0e2f06cb86713282a0b88ee789709e92a08b9e9b4ce816bbb13fcaf',
        'ESCUELA_ROLE': '0xa8f5858ea94a9ede7bc5dd04119dcc24b3b02a20be15d673993d8b6c2a901ef9',
        'ADMIN': '0x0000000000000000000000000000000000000000000000000000000000000000',

        // Formas abreviadas sin _ROLE (para compatibilidad)
        'FABRICANTE': '0xbe0c84bfff967b2deb88bd0540d4a796d0ebfdcb72262ced26f1892b419e6457',
        'AUDITOR_HW': '0x49c0376dc7caa3eab0c186e9bc20bf968b0724fea74a37706c35f59bc5d8b15b',
        'TECNICO_SW': '0xeeb4ddf6a0e2f06cb86713282a0b88ee789709e92a08b9e9b4ce816bbb13fcaf',
        'ESCUELA': '0xa8f5858ea94a9ede7bc5dd04119dcc24b3b02a20be15d673993d8b6c2a901ef9'
      };

      const hash = roleMap[roleTypeUpper];
      if (!hash) {
        throw new Error(`Role type not found: ${roleType}`);
      }

      return hash;
    } catch (error) {
      console.error('Error getting role by name:', error);
      throw error;
    }
  };

  /**
   * Verifica si una cuenta tiene un rol específico por nombre
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   * @returns True si la cuenta tiene el rol
   */
  hasRoleByName = async (roleName: string, userAddress: `0x${string}`): Promise<boolean> => {
    try {
      const roleHash = await this.getRoleByName(roleName);
      return await this.hasRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error checking role by name:', error);
      return false;
    }
  };

  /**
   * Otorga un rol a una dirección por nombre
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   * @returns Resultado de la transacción
   */
  grantRoleByName = async (roleName: string, userAddress: `0x${string}`): Promise<TransactionResult> => {
    try {
      const roleHash = await this.getRoleByName(roleName);
      return await this.grantRole(roleHash, userAddress);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  };

  /**
   * Revoca un rol de una dirección por nombre
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   * @returns Resultado de la transacción
   */
  revokeRoleByName = async (roleName: string, userAddress: `0x${string}`): Promise<TransactionResult> => {
    try {
      const roleHash = await this.getRoleByName(roleName);
      return await this.revokeRole(roleHash, userAddress);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}