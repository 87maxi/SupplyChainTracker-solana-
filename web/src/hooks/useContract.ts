// web/src/hooks/useContract.ts
// Hook para acceder a servicios registrados en el sistema
// @deprecated Legacy Ethereum-based hook - migrated to Solana (use useSupplyChainService instead)
// This file is kept for backward compatibility but all functionality has been removed.

import { useMemo } from 'react';

/**
 * Hook genérico para acceder a un servicio por nombre
 * @deprecated Use useSupplyChainService from @/hooks/useSupplyChainService instead
 * @param name Nombre del servicio registrado
 * @returns null (legacy hook removed)
 */
export const useContract = <T>(name: string): null => {
  return useMemo(() => {
    // Legacy Ethereum service registry removed during Solana migration
    return null;
  }, [name]);
};

/**
 * Hook específico para acceder al servicio SupplyChainTracker
 * @deprecated Use useSupplyChainService from @/hooks/useSupplyChainService instead
 * @returns null (legacy hook removed)
 */
export const useSupplyChainContract = () => {
  return useContract('SupplyChainTracker');
};
