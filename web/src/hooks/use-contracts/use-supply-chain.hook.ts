// web/src/hooks/use-contracts/use-supply-chain.hook.ts

import { useCallback, useState } from 'react';
import { SupplyChainService } from '@/services/SupplyChainService';
const supplyChainService = SupplyChainService.supplyChainService;
import { useToast } from '@/hooks/use-toast';
import { ActivityLogger } from '@/lib/activity-logger';

// Use singleton instance from services
import { SupplyChainService } from '@/services/SupplyChainService';
const supplyChainService = SupplyChainService.supplyChainService;

/**
 * Hook personalizado para interactuar con el contrato SupplyChainTracker
 * Proporciona funciones para todas las operaciones del contrato con manejo de estado
 */
export const useSupplyChainContract = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  /**
   * Estado de carga para una operación específica
   * @param operation Nombre de la operación
   * @returns Si la operación está cargando
   */
  const isLoading = useCallback((operation: string): boolean => {
    return loading[operation] || false;
  }, [loading]);

  /**
   * Establece el estado de carga para una operación
   * @param operation Nombre de la operación
   * @param status Estado de carga
   */
  const setLoadingState = useCallback((operation: string, status: boolean) => {
    setLoading(prev => ({ ...prev, [operation]: status }));
  }, []);

  /**
   * Maneja errores y muestra notificaciones
   * @param error Error a manejar
   * @param operation Operación que causó el error
   */
  const handleError = useCallback((error: unknown, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
    
    ActivityLogger.error('system', operation, errorMessage);
    
    return errorMessage;
  }, [toast]);

  /**
   * Registra una acción exitosa
   * @param operation Operación realizada
   * @param hash Hash de la transacción
   */
  const handleSuccess = useCallback((operation: string, hash?: string) => {
    toast({
      title: 'Éxito',
      description: `Operación completada: ${hash ? hash.slice(0, 8) + '...' : ''}`,
    });
    
    if (hash) {
      ActivityLogger.system(operation, `Transacción completada: ${hash}`);
    }
  }, [toast]);

  /**
   * Registra múltiples netbooks
   * @param serials Números de serie
   * @param batches IDs de lote
   * @param specs Especificaciones del modelo
   */
  const registerNetbooks = useCallback(async (
    serials: string[], 
    batches: string[], 
    specs: string[]
  ) => {
    const operation = 'registerNetbooks';
    setLoadingState(operation, true);
    
    try {
      const result = await supplyChainService.registerNetbooks(serials, batches, specs);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        return result;
      } else {
        throw new Error(result.error || 'Registro fallido');
      }
    } catch (error) {
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Realiza auditoría de hardware
   * @param serial Número de serie
   * @param passed Si pasó la auditoría
   * @param reportHash Hash del informe
   * @param userAddress Dirección del usuario
   */
  const auditHardware = useCallback(async (
    serial: string,
    passed: boolean,
    reportHash: string,
    userAddress: string
  ) => {
    const operation = 'auditHardware';
    setLoadingState(operation, true);
    
    try {
      const result = await supplyChainService.auditHardware(serial, passed, reportHash, userAddress);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        return result;
      } else {
        throw new Error(result.error || 'Auditoría fallida');
      }
    } catch (error) {
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Valida software
   * @param serial Número de serie
   * @param osVersion Versión del sistema
   * @param passed Si pasó la validación
   */
  const validateSoftware = useCallback(async (
    serial: string,
    osVersion: string,
    passed: boolean
  ) => {
    const operation = 'validateSoftware';
    setLoadingState(operation, true);
    
    try {
      const result = await supplyChainService.validateSoftware(serial, osVersion, passed);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        return result;
      } else {
        throw new Error(result.error || 'Validación fallida');
      }
    } catch (error) {
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Asigna netbook a estudiante
   * @param serial Número de serie
   * @param schoolHash Hash de la escuela
   * @param studentHash Hash del estudiante
   */
  const assignToStudent = useCallback(async (
    serial: string,
    schoolHash: string,
    studentHash: string
  ) => {
    const operation = 'assignToStudent';
    setLoadingState(operation, true);
    
    try {
      const result = await supplyChainService.assignToStudent(serial, schoolHash, studentHash);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        return result;
      } else {
        throw new Error(result.error || 'Asignación fallida');
      }
    } catch (error) {
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Obtiene el estado de una netbook
   * @param serial Número de serie
   */
  const getNetbookState = useCallback(async (serial: string) => {
    const operation = 'getNetbookState';
    setLoadingState(operation, true);
    
    try {
      const state = await supplyChainService.getNetbookState(serial);
      ActivityLogger.system(operation, `Estado obtenido para ${serial}: ${state}`);
      return state;
    } catch (error) {
      handleError(error, operation);
      return null;
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  /**
   * Obtiene el reporte completo de una netbook
   * @param serial Número de serie
   */
  const getNetbookReport = useCallback(async (serial: string) => {
    const operation = 'getNetbookReport';
    setLoadingState(operation, true);
    
    try {
      const report = await supplyChainService.getNetbookReport(serial);
      ActivityLogger.system(operation, `Reporte obtenido para ${serial}`);
      return report;
    } catch (error) {
      handleError(error, operation);
      return null;
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  /**
   * Obtiene todos los números de serie
   */
  const getAllSerialNumbers = useCallback(async () => {
    const operation = 'getAllSerialNumbers';
    setLoadingState(operation, true);
    
    try {
      const serials = await supplyChainService.getAllSerialNumbers();
      ActivityLogger.system(operation, `Se obtuvieron ${serials.length} números de serie`);
      return serials;
    } catch (error) {
      handleError(error, operation);
      return [];
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  return {
    // Operaciones de netbooks
    registerNetbooks,
    auditHardware,
    validateSoftware,
    assignToStudent,
    
    // Consultas de netbooks
    getNetbookState,
    getNetbookReport,
    getAllSerialNumbers,
    
    // Estado
    isLoading
  };
}