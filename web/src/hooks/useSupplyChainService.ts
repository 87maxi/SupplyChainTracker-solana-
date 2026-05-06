'use client';

/**
 * Hook para el servicio de cadena de suministro
 * Wrapper que expone las funciones del SupplyChainService
 */

import { useState, useEffect, useCallback } from 'react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SupplyChainService } from '@/services/SupplyChainService';

// Tipos para las operaciones del servicio
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

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Hook principal para interactuar con el programa SupplyChain
 */
export function useSupplyChainService() {
  const { connection } = useConnection();
  const { publicKey, wallet } = useWallet();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = SupplyChainService.getInstance();

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

      service.initialize(provider);
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

  // Exponer todas las funciones del servicio
  return {
    service,
    initialized,
    error,
    refresh: initialize,

    // Funciones delegadas al servicio
    registerNetbook: async (params: RegisterNetbookParams): Promise<TransactionResult> => {
      try {
        const result = await service.registerNetbook({
          tokenId: params.tokenId,
          serialNumber: params.serialNumber,
          model: params.model,
          manufacturer: params.manufacturer,
        });
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en registerNetbook',
        };
      }
    },

    registerNetbooksBatch: async (params: {
      netbooks: Array<{
        tokenId: number;
        serialNumber: string;
        model: string;
        manufacturer: string;
      }>;
    }): Promise<TransactionResult> => {
      try {
        const result = await service.registerNetbooksBatch(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en registerNetbooksBatch',
        };
      }
    },

    auditHardware: async (params: AuditHardwareParams): Promise<TransactionResult> => {
      try {
        const result = await service.auditHardware(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en auditHardware',
        };
      }
    },

    validateSoftware: async (params: ValidateSoftwareParams): Promise<TransactionResult> => {
      try {
        const result = await service.validateSoftware(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en validateSoftware',
        };
      }
    },

    assignToStudent: async (params: AssignToStudentParams): Promise<TransactionResult> => {
      try {
        const result = await service.assignToStudent(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en assignToStudent',
        };
      }
    },

    // Funciones de role management
    grantRole: async (params: { role: string; account: string }): Promise<TransactionResult> => {
      try {
        const result = await service.grantRole(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en grantRole',
        };
      }
    },

    revokeRole: async (params: { role: string; account: string }): Promise<TransactionResult> => {
      try {
        const result = await service.revokeRole(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en revokeRole',
        };
      }
    },

    requestRole: async (params: { role: string }): Promise<TransactionResult> => {
      try {
        const result = await service.requestRole(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en requestRole',
        };
      }
    },

    approveRoleRequest: async (params: { role: string }): Promise<TransactionResult> => {
      try {
        const result = await service.approveRoleRequest(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en approveRoleRequest',
        };
      }
    },

    rejectRoleRequest: async (params: { role: string }): Promise<TransactionResult> => {
      try {
        const result = await service.rejectRoleRequest(params);
        return result as TransactionResult;
      } catch {
        return {
          success: false,
          error: 'Error en rejectRoleRequest',
        };
      }
    },
  };
}
