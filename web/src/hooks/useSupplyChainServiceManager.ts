// web/src/hooks/useSupplyChainServiceManager.ts
// Hook para manejar el estado de inicialización del servicio de cadena de suministro
// @deprecated Legacy Ethereum-based hook - migrated to Solana (use useSupplyChainService instead)

import { useState, useEffect, useCallback } from 'react';
// Legacy: useConnectionStatusMock was removed - use useSolanaWeb3 from @/hooks/useSolanaWeb3 instead
import { useNotifications } from '@/hooks/use-notifications';

interface ServiceStatus {
  initialized: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * @deprecated Use useSupplyChainService from @/hooks/useSupplyChainService instead
 * This hook was removed during Ethereum to Solana migration.
 */
export const useSupplyChainServiceManager = (): ServiceStatus => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const initializeService = useCallback(async () => {
    try {
      // Legacy Ethereum service removed during Solana migration
      // Use SolanaSupplyChainService from @/services/SolanaSupplyChainService instead
      if (!process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
        throw new Error('La dirección del contrato no está configurada');
      }

      setInitialized(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize service');
      setInitialized(false);
    }
  }, [retryCount]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    initializeService();
  }, [initializeService]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { initialized, error, retry };
};
