// web/src/hooks/use-contracts/use-role.hook.ts

import { useCallback, useState } from 'react';
import { RoleService } from '@/services/contracts/role.service';
import { useToast } from '@/hooks/use-toast';
import { ActivityLogger } from '@/lib/activity-logger';
import { ContractRoles } from '@/types/contract';
import { Address } from 'viem';

// La instancia se creará con los parámetros necesarios desde el componente que use el hook
// No podemos crear una instancia singleton aquí porque necesitamos la cuenta del usuario
let roleService: RoleService | null = null;

/**
 * Hook personalizado para gestionar roles en el contrato inteligente
 * Proporciona funciones para todas las operaciones de roles con manejo de estado
 */
export const useRoleContract = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  
  // Obtener el estado de la cuenta del usuario
  const { address: userAddress, isConnected } = useAccount();

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
   * Verifica si una dirección tiene un rol específico
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   * @returns True si tiene el rol, false en caso contrario
   */
  const hasRole = useCallback(async (
    roleName: ContractRoles,
    userAddress: Address
  ): Promise<boolean> => {
    const operation = `hasRole:${roleName}`;
    setLoadingState(operation, true);
    
    try {
      const result = await roleService.hasRole(roleName, userAddress);
      ActivityLogger.system(operation, `Verificación de rol para ${userAddress}: ${result}`);
      return result;
    } catch (error) {
      handleError(error, operation);
      return false;
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  /**
   * Otorga un rol a una dirección
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   */
  const grantRole = useCallback(async (
    roleName: ContractRoles,
    userAddress: Address
  ) => {
    const operation = `grantRole:${roleName}`;
    setLoadingState(operation, true);
    
    try {
      const result = await roleService.grantRole(roleName, userAddress);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        ActivityLogger.roleChange(userAddress, 'grant', roleName, 'success');
        return result;
      } else {
        throw new Error(result.error || 'No se pudo otorgar el rol');
      }
    } catch (error) {
      ActivityLogger.roleChange(userAddress, 'grant', roleName, 'failed');
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Revoca un rol de una dirección
   * @param roleName Nombre del rol
   * @param userAddress Dirección del usuario
   */
  const revokeRole = useCallback(async (
    roleName: ContractRoles,
    userAddress: Address
  ) => {
    const operation = `revokeRole:${roleName}`;
    setLoadingState(operation, true);
    
    try {
      const result = await roleService.revokeRole(roleName, userAddress);
      
      if (result.success && result.hash) {
        handleSuccess(operation, result.hash);
        ActivityLogger.roleChange(userAddress, 'revoke', roleName, 'success');
        return result;
      } else {
        throw new Error(result.error || 'No se pudo revocar el rol');
      }
    } catch (error) {
      ActivityLogger.roleChange(userAddress, 'revoke', roleName, 'failed');
      return {
        success: false,
        error: handleError(error, operation)
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, handleSuccess, setLoadingState]);

  /**
   * Obtiene todos los miembros de un rol
   * @param roleName Nombre del rol
   * @returns Miembros del rol
   */
  const getRoleMembers = useCallback(async (roleName: ContractRoles) => {
    const operation = `getRoleMembers:${roleName}`;
    setLoadingState(operation, true);
    
    try {
      const result = await roleService.getRoleMembers(roleName);
      ActivityLogger.system(operation, `Se obtuvieron ${result.count} miembros para ${roleName}`);
      return result;
    } catch (error) {
      handleError(error, operation);
      return {
        role: roleName,
        members: [],
        count: 0
      };
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  /**
   * Obtiene todos los miembros de todos los roles
   * @returns Mapa de roles con sus miembros
   */
  const getAllRolesSummary = useCallback(async () => {
    const operation = 'getAllRolesSummary';
    setLoadingState(operation, true);
    
    try {
      const summary = await roleService.getAllRolesSummary();
      
      // Registrar estadísticas
      const totalUsers = Object.values(summary).reduce((acc, role) => acc + role.count, 0);
      ActivityLogger.system(operation, `Se obtuvo resumen de roles: ${totalUsers} usuarios totales`);
      
      return summary;
    } catch (error) {
      handleError(error, operation);
      return {};
    } finally {
      setLoadingState(operation, false);
    }
  }, [handleError, setLoadingState]);

  // Inicializar el servicio de roles cuando tengamos la dirección
  useEffect(() => {
    if (userAddress && isConnected && !roleService) {
      roleService = new RoleService(
        NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`,
        SupplyChainTrackerABI,
        config,
        userAddress
      );
    }
  }, [userAddress, isConnected]);

  return {
    hasRole,
    grantRole,
    revokeRole,
    getRoleMembers,
    getAllRolesSummary,
    isLoading,
    handleSuccess,
    handleError
  };
}

// Importaciones adicionales necesarias
import { useAccount } from 'wagmi';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';
import SupplyChainTrackerABI from '@/lib/contracts/abi/SupplyChainTracker.json';
import { config } from '@/lib/wagmi/config';