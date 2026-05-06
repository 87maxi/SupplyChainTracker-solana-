// web/src/hooks/useContract.ts
// Hook para acceder a servicios registrados en el sistema
// Legacy Ethereum-based hook - migrated to Solana (use useSupplyChainService instead)

import { useMemo } from 'react';
import { BaseContractService } from '@/services/contracts/base-contract.service';
import { serviceRegistry } from '@/services/contract-registry.service';

/**
 * Hook genérico para acceder a un servicio por nombre
 * @deprecated Use useSupplyChainService from @/hooks/useSupplyChainService instead
 * @param name Nombre del servicio registrado
 * @returns Instancia del servicio o null si no existe
 */
export const useContract = <T extends BaseContractService>(name: string): T | null => {
  return useMemo(() => {
    const service = serviceRegistry.get(name);
    return service as T || null;
  }, [name]);
};

/**
 * Hook específico para acceder al servicio SupplyChainTracker
 * @deprecated Use useSupplyChainService from @/hooks/useSupplyChainService instead
 * @returns Instancia de SupplyChainService o null si no está registrado
 */
export const useSupplyChainContract = () => {
  return useContract('SupplyChainTracker');
};
