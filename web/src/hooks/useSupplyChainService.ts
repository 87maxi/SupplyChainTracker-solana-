'use client';

/**
 * Hook para el servicio de cadena de suministro
 * Wrapper que expone las funciones del UnifiedSupplyChainService
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Address } from '@solana/kit';
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { UnifiedSupplyChainService, TransactionResult, NetbookReport, NetbookData } from '@/services/UnifiedSupplyChainService';

// ==================== Types ====================

export interface RegisterNetbookParams {
  tokenId: number;
  serialNumber: string;
  model: string;
  manufacturer: string;
}

export interface AuditHardwareParams {
  tokenId: number;
  auditor: string;
  reportHash: string;
}

export interface ValidateSoftwareParams {
  tokenId: number;
  technician: string;
  osVersion: string;
}

export interface AssignToStudentParams {
  tokenId: number;
  studentIdHash: string;
  schoolHash: string;
}

// Re-export NetbookData from UnifiedSupplyChainService for consistency
export type { NetbookData } from '@/services/UnifiedSupplyChainService';

/**
 * Hook principal para interactuar con el programa SupplyChain
 */
export function useSupplyChainService() {
  const { publicKey, isConnected } = useSolanaWeb3();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = UnifiedSupplyChainService.getInstance();

  // Create connection
  const connection = useMemo(() => {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL ||
      `https://api.${process.env.NEXT_PUBLIC_CLUSTER || 'devnet'}.solana.com`;
    return new Connection(rpcUrl, 'confirmed');
  }, []);

  /**
   * Inicializar el servicio con el wallet adapter (Codama)
   */
  const initialize = useCallback(async () => {
    if (!publicKey || !isConnected) {
      setInitialized(false);
      return;
    }

    try {
      // Create wallet adapter for Codama service
      const walletAdapter = {
        publicKey,
        signTransaction: async <T>(tx: T) => tx,
        signAllTransactions: async <T>(txs: T[]) => txs,
      };

      service.initialize(walletAdapter, connection);
      setInitialized(true);
      setError(null);
    } catch {
      setInitialized(false);
      setError('Error al inicializar servicio');
    }
  }, [connection, publicKey, isConnected, service]);

  // Auto-inicializar cuando se conecta la wallet
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (isConnected && publicKey) {
        await initialize();
      } else if (mounted) {
        setInitialized(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [isConnected, publicKey, initialize]);

  // ==================== Query Functions ====================

  /**
   * Obtener todos los serial numbers registrados
   */
  const getAllSerialNumbers = useCallback(async (maxSearch?: number): Promise<string[]> => {
    try {
      return await service.getAllSerialNumbers(maxSearch ?? 10000);
    } catch (err) {
      console.error('Error in getAllSerialNumbers:', err);
      return [];
    }
  }, [service]);

  /**
   * Obtener el estado actual de una netbook
   */
  const getNetbookState = useCallback(async (serial: string): Promise<number> => {
    try {
      return await service.getNetbookState(serial);
    } catch {
      return 0;
    }
  }, [service]);

  /**
   * Obtener netbooks por estado
   */
  const getNetbooksByState = useCallback(async (state: number, maxSearch?: number): Promise<string[]> => {
    try {
      return await service.getNetbooksByState(state, maxSearch ?? 10000);
    } catch {
      return [];
    }
  }, [service]);

  /**
   * Obtener reporte detallado de una netbook
   */
  const getNetbookReport = useCallback(async (serial: string): Promise<NetbookReport | null> => {
    try {
      return await service.getNetbookReport(serial);
    } catch {
      return null;
    }
  }, [service]);

  /**
   * Buscar netbook por serial number
   */
  const findNetbookBySerial = useCallback(async (serial: string): Promise<NetbookData | null> => {
    try {
      return await service.findNetbookBySerial(serial);
    } catch {
      return null;
    }
  }, [service]);

  /**
   * Obtener PDA de netbook por serial
   */
  const getNetbookPdaBySerial = useCallback(async (serial: string): Promise<Address | null> => {
    try {
      return await service.getNetbookPdaBySerial(serial);
    } catch {
      return null;
    }
  }, [service]);

  /**
   * Obtener datos de configuración
   */
  const queryConfig = useCallback(async () => {
    try {
      return await service.queryConfig();
    } catch {
      return null;
    }
  }, [service]);

  /**
   * Obtener total de netbooks
   */
  const getTotalNetbooks = useCallback(async (): Promise<number> => {
    try {
      return await service.getTotalNetbooks();
    } catch {
      return 0;
    }
  }, [service]);

  /**
   * Obtener próximo token ID
   */
  const getNextTokenId = useCallback(async (): Promise<bigint> => {
    try {
      return await service.getNextTokenId();
    } catch {
      return BigInt(0);
    }
  }, [service]);

  // ==================== Role Functions ====================

  /**
   * Obtener todos los miembros de un rol
   */
  const getAllMembers = useCallback(async (role: string): Promise<string[]> => {
    try {
      return await service.getAllMembers(role);
    } catch {
      return [];
    }
  }, [service]);

  /**
   * Obtener conteo de miembros de un rol
   */
  const getRoleMemberCount = useCallback(async (role: string): Promise<number> => {
    try {
      return await service.getRoleMemberCount(role);
    } catch {
      return 0;
    }
  }, [service]);

  /**
   * Verificar si una dirección tiene un rol específico
   */
  const hasRole = useCallback(async (role: string, address: string): Promise<boolean> => {
    try {
      return await service.hasRole(role, address);
    } catch {
      return false;
    }
  }, [service]);

  /**
   * Obtener role requests
   */
  const getRoleRequests = useCallback(async () => {
    try {
      return await service.getRoleRequests();
    } catch {
      return [];
    }
  }, [service]);

  // ==================== Transaction Functions ====================

  /**
   * Registrar una netbook
   */
  const registerNetbook = useCallback(async (params: {
    serialNumber: string;
    batchId: string;
    modelSpecs: string;
  }): Promise<{ signature: string; tokenId: bigint }> => {
    return service.registerNetbook(params.serialNumber, params.batchId, params.modelSpecs);
  }, [service]);

  /**
   * Registrar netbooks en batch
   */
  const registerNetbooksBatch = useCallback(async (params: {
    netbooks: Array<{
      tokenId: number;
      serialNumber: string;
      model: string;
      manufacturer: string;
    }>;
  }): Promise<TransactionResult> => {
    try {
      return await service.registerNetbooksBatch(params);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [service]);

  /**
   * Auditar hardware
   */
  const auditHardware = useCallback(async (params: {
    serialNumber: string;
    passed: boolean;
    reportHash: number[];
  }): Promise<string> => {
    return service.auditHardware(params.serialNumber, params.passed, params.reportHash);
  }, [service]);

  /**
   * Validar software
   */
  const validateSoftware = useCallback(async (params: {
    serialNumber: string;
    osVersion: string;
    passed: boolean;
  }): Promise<string> => {
    return service.validateSoftware(params.serialNumber, params.osVersion, params.passed);
  }, [service]);

  /**
   * Asignar a estudiante
   */
  const assignToStudent = useCallback(async (params: {
    serialNumber: string;
    schoolHash: number[];
    studentHash: number[];
  }): Promise<string> => {
    return service.assignToStudent(params.serialNumber, params.schoolHash, params.studentHash);
  }, [service]);

  /**
   * Otorgar rol
   */
  const grantRole = useCallback(async (params: {
    role: string;
    account: string;
  }): Promise<string> => {
    return service.grantRole(params.role, params.account as Address);
  }, [service]);

  /**
   * Revocar rol
   */
  const revokeRole = useCallback(async (params: {
    role: string;
    account: string;
  }): Promise<string> => {
    return service.revokeRole(params.role, params.account as Address);
  }, [service]);

  /**
   * Solicitar rol
   */
  const requestRole = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    return service.requestRole(params.role);
  }, [service]);

  /**
   * Aprobar solicitud de rol
   */
  const approveRoleRequest = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    return service.approveRoleRequest(params.role);
  }, [service]);

  /**
   * Rechazar solicitud de rol
   */
  const rejectRoleRequest = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    return service.rejectRoleRequest(params.role);
  }, [service]);

  /**
   * Agregar titular de rol
   */
  const addRoleHolder = useCallback(async (params: {
    role: string;
    holder: string;
  }): Promise<string> => {
    return service.addRoleHolder(params.role, params.holder as Address);
  }, [service]);

  /**
   * Remover titular de rol
   */
  const removeRoleHolder = useCallback(async (params: {
    role: string;
    holder: string;
  }): Promise<string> => {
    return service.removeRoleHolder(params.role, params.holder as Address);
  }, [service]);

  // ==================== Cache Management ====================

  /**
   * Limpiar todos los caches
   */
  const clearCaches = useCallback(() => {
    service.clearCaches();
  }, [service]);

  /**
   * Invalidar cache por prefijo
   */
  const invalidateCachePrefix = useCallback((prefix: string) => {
    service.invalidateCachePrefix(prefix);
  }, [service]);

  /**
   * Fund and Initialize - PDA-First Architecture
   *
   * This method funds the deployer PDA and then initializes the config.
   * Used for initial deployment of the supply chain system.
   */
  const fundAndInitialize = useCallback(async (amount: number = 10_000_000_000): Promise<TransactionResult> => {
    if (!isConnected || !publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      // Create wallet adapter for Codama service
      const walletAdapter = {
        publicKey,
        signTransaction: async <T>(tx: T) => tx,
        signAllTransactions: async <T>(txs: T[]) => txs,
      };

      service.initialize(walletAdapter, connection);

      // Fund deployer PDA first, then initialize
      const result = await service.fundAndInitialize(amount);
      setInitialized(true);
      setError(null);
      return result;
    } catch (err: unknown) {
      setInitialized(false);
      const errorMsg = err instanceof Error ? err.message : 'Error en fundAndInitialize';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [isConnected, publicKey, connection, service]);

  // Exponer todas las funciones del servicio
  return {
    service,
    initialized,
    error,
    refresh: initialize,
    fundAndInitialize,

    // Query Functions
    getAllSerialNumbers,
    getNetbookState,
    getNetbooksByState,
    getNetbookReport,
    findNetbookBySerial,
    getNetbookPdaBySerial,
    queryConfig,
    getTotalNetbooks,
    getNextTokenId,

    // Role Functions
    getAllMembers,
    getRoleMemberCount,
    hasRole,
    getRoleRequests,

    // Transaction Functions
    registerNetbook,
    registerNetbooksBatch,
    auditHardware,
    validateSoftware,
    assignToStudent,
    grantRole,
    revokeRole,
    requestRole,
    approveRoleRequest,
    rejectRoleRequest,
    addRoleHolder,
    removeRoleHolder,

    // Legacy mappings
    getNetbook: findNetbookBySerial,
    getAllRolesSummary: async () => {
      const summary: Record<string, { members: string[]; count: number }> = {};
      const roles = ['ADMIN_ROLE', 'FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'];
      for (const r of roles) {
        const members = await service.getAllMembers(r);
        summary[r] = { members, count: members.length };
      }
      return summary;
    },

    // Cache Management
    clearCaches,
    invalidateCachePrefix,
  };
}
