'use client';

/**
 * Hook para el servicio de cadena de suministro
 * Wrapper que expone las funciones del UnifiedSupplyChainService
 */

import { useState, useEffect, useCallback } from 'react';
import { AnchorProvider, BN } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { UnifiedSupplyChainService, TransactionResult, NetbookReport } from '@/services/UnifiedSupplyChainService';

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

/**
 * Hook principal para interactuar con el programa SupplyChain
 */
export function useSupplyChainService() {
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = UnifiedSupplyChainService.getInstance();

  /**
   * Inicializar el servicio con el provider de wallet
   */
  const initialize = useCallback(async () => {
    if (!wallet || !publicKey) {
      setInitialized(false);
      return;
    }

    try {
      const provider = new AnchorProvider(
        connection,
        wallet as any,
        { commitment: 'confirmed' }
      );

      service.initialize(provider, publicKey);
      setInitialized(true);
      setError(null);
    } catch {
      setInitialized(false);
      setError('Error al inicializar servicio');
    }
  }, [connection, wallet, publicKey, service]);

  // Auto-inicializar cuando se conecta la wallet
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (wallet && publicKey) {
        await initialize();
      } else if (mounted) {
        setInitialized(false);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [wallet, publicKey, initialize]);

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
  const getNetbookPdaBySerial = useCallback(async (serial: string): Promise<PublicKey | null> => {
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
    try {
      return await service.registerNetbook(params.serialNumber, params.batchId, params.modelSpecs);
    } catch (err) {
      throw err;
    }
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
    try {
      return await service.auditHardware(params.serialNumber, params.passed, params.reportHash);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Validar software
   */
  const validateSoftware = useCallback(async (params: {
    serialNumber: string;
    osVersion: string;
    passed: boolean;
  }): Promise<string> => {
    try {
      return await service.validateSoftware(params.serialNumber, params.osVersion, params.passed);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Asignar a estudiante
   */
  const assignToStudent = useCallback(async (params: {
    serialNumber: string;
    schoolHash: number[];
    studentHash: number[];
  }): Promise<string> => {
    try {
      return await service.assignToStudent(params.serialNumber, params.schoolHash, params.studentHash);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Otorgar rol
   */
  const grantRole = useCallback(async (params: {
    role: string;
    account: string;
  }): Promise<string> => {
    try {
      return await service.grantRole(params.role, new PublicKey(params.account));
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Revocar rol
   */
  const revokeRole = useCallback(async (params: {
    role: string;
    account: string;
  }): Promise<string> => {
    try {
      return await service.revokeRole(params.role, new PublicKey(params.account));
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Solicitar rol
   */
  const requestRole = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    try {
      return await service.requestRole(params.role);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Aprobar solicitud de rol
   */
  const approveRoleRequest = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    try {
      return await service.approveRoleRequest(params.role);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Rechazar solicitud de rol
   */
  const rejectRoleRequest = useCallback(async (params: {
    role: string;
  }): Promise<string> => {
    try {
      return await service.rejectRoleRequest(params.role);
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Agregar titular de rol
   */
  const addRoleHolder = useCallback(async (params: {
    role: string;
    holder: string;
  }): Promise<string> => {
    try {
      return await service.addRoleHolder(params.role, new PublicKey(params.holder));
    } catch (err) {
      throw err;
    }
  }, [service]);

  /**
   * Remover titular de rol
   */
  const removeRoleHolder = useCallback(async (params: {
    role: string;
    holder: string;
  }): Promise<string> => {
    try {
      return await service.removeRoleHolder(params.role, new PublicKey(params.holder));
    } catch (err) {
      throw err;
    }
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

  // Exponer todas las funciones del servicio
  return {
    service,
    initialized,
    error,
    refresh: initialize,

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

    // Cache Management
    clearCaches,
    invalidateCachePrefix,
  };
}
