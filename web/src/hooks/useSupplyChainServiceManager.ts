// web/src/hooks/useSupplyChainServiceManager.ts
// Hook para manejar el estado de inicialización del servicio de cadena de suministro

import { useState, useEffect, useCallback } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatusMock';
import { SupplyChainService } from '@/services/SupplyChainService';
import { useNotifications } from '@/hooks/use-notifications';

interface ServiceStatus {
  initialized: boolean;
  error: string | null;
  retry: () => void;
}

export const useSupplyChainServiceManager = (): ServiceStatus => {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { status: connectionStatus } = useConnectionStatus();

  const initializeService = useCallback(async () => {
    try {
      // Verificar que la dirección del contrato esté disponible
      if (!process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
        throw new Error('La dirección del contrato no está configurada');
      }

      // Intentar inicializar el servicio
      const service = SupplyChainService.getInstance();
      
      // Realizar una operación de prueba con el contrato
      await service.read('getAllSerialNumbers', [], false);
      
      setInitialized(true);
      setError(null);
      
      // Mostrar notificación de éxito si es apropiado
      if (typeof window !== 'undefined') {
        const { notify } = useNotifications();
        notify.success('Conexión establecida', 'Servicio de cadena de suministro listo');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al conectar con el contrato: ${errorMessage}`);
      
      // Mostrar notificación de error
      const { notify } = useNotifications();
      notify.error('Error de conexión', errorMessage);
      
      setInitialized(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    // Reiniciar estado cuando cambia el estado de conexión
    setInitialized(false);
    setError(null);
    
    // Intentar inicializar después de un breve retraso para permitir la conexión
    const timeoutId = setTimeout(() => {
      initializeService();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [connectionStatus, retryCount, initializeService]);

  return { initialized, error, retry };
};
