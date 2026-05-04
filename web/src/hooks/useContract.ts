// web/src/hooks/useContract.ts
// Hook para acceder a contratos registrados en el sistema

import { useContext, useMemo } from 'react';
import { BaseContractService } from '@/services/contracts/base-contract.service';
import { contractRegistry } from '@/services/contract-registry.service';

/**
 * Hook genérico para acceder a un contrato por nombre
 * @param name Nombre del contrato registrado
 * @returns Instancia del contrato o null si no existe
 */
export const useContract = <T extends BaseContractService>(name: string): T | null => {
  return useMemo(() => {
    const contract = contractRegistry.get(name);
    return contract as T || null;
  }, [name]);
};

/**
 * Hook específico para acceder al contrato SupplyChainTracker
 * @returns Instancia de SupplyChainService o null si no está registrada
 */
export const useSupplyChainContract = () => {
  return useContract('SupplyChainTracker');
};