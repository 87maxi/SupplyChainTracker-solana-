'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainContract } from '@/hooks/useContract';
import { readContract } from '@wagmi/core';
import { config } from '@/lib/wagmi/config';
import SupplyChainTrackerABI from '@/lib/contracts/abi/SupplyChainTracker.json';
import { ContractRoles } from '@/types/contract';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';
import { ROLE_HASHES } from '@/lib/constants/roles';

interface UseUserRoles {
  isAdmin: boolean;
  isManufacturer: boolean;
  isHardwareAuditor: boolean;
  isSoftwareTechnician: boolean;
  isSchool: boolean;
  isLoading: boolean;
  hasRole: (roleName: ContractRoles) => boolean;
  activeRoleNames: ContractRoles[];
  refreshRoles: () => void;
}

import { CacheService } from '@/lib/cache/cache-service';

export const useUserRoles = (): UseUserRoles => {
  const { address, isConnected } = useWeb3();
  const supplyChainService = useSupplyChainContract();
  const hasRole = supplyChainService?.hasRole || (() => Promise.resolve(false)); // Añadido para evitar errores
  
  // Fallback para verificar roles si hasRole no está disponible
  const checkRoleFallback = async (roleHash: `0x${string}`, userAddress: `0x${string}`): Promise<boolean> => {
    try {
      if (supplyChainService?.hasRole) {
        return await supplyChainService.hasRole(roleHash, userAddress);
      }
      
      // Si no tenemos acceso al contrato, intentar con wagmi directamente como último recurso
      const result = await readContract(config, {
        address: NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`,
        abi: SupplyChainTrackerABI,
        functionName: 'hasRole',
        args: [roleHash, userAddress]
      });
      return result as boolean;
    } catch (error) {
      console.error('Error checking role with fallback:', error);
      return false;
    }
  };
  
  const cacheKey = `user_roles_${address || 'unknown'}`;
  const [userRoles, setUserRoles] = useState<UseUserRoles>({
    isAdmin: false,
    isManufacturer: false,
    isHardwareAuditor: false,
    isSoftwareTechnician: false,
    isSchool: false,
    isLoading: true,
    hasRole: (roleName: ContractRoles) => {
      switch (roleName) {
        case 'DEFAULT_ADMIN_ROLE': return false;
        case 'FABRICANTE_ROLE': return false;
        case 'AUDITOR_HW_ROLE': return false;
        case 'TECNICO_SW_ROLE': return false;
        case 'ESCUELA_ROLE': return false;
        default: return false;
      }
    },
    activeRoleNames: [],
    refreshRoles: () => {}
  });

  const checkRoles = useCallback(async () => {
    // Early return if not connected or missing required data
    if (!isConnected || !address || !NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
      if (isConnected && address && !NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS) {
        console.error('Contract address is not configured. Please check your .env file.');
      }
      setUserRoles(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check cache first
    const cachedRoles = CacheService.get<UseUserRoles>(cacheKey);
    if (cachedRoles && !CacheService.isCacheStale(cacheKey)) {
      setUserRoles(cachedRoles);
      return;
    }

    // If we have stale data, serve it while revalidating
    if (cachedRoles) {
      setUserRoles(cachedRoles);

    } else if (!cachedRoles) {
      setUserRoles(prev => ({ ...prev, isLoading: true }));
    }

    console.log('[useUserRoles] Starting role check for address:', address);

    try {
      const contractAddress = NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`;

      // Use precomputed role hashes from constants
      const fabricanteRoleStr = ROLE_HASHES.FABRICANTE;
      const auditorHwRoleStr = ROLE_HASHES.AUDITOR_HW;
      const tecnicoSwRoleStr = ROLE_HASHES.TECNICO_SW;
      const escuelaRoleStr = ROLE_HASHES.ESCUELA;
      const defaultAdminRoleStr = ROLE_HASHES.ADMIN;

      // Check roles using role hashes directly for better reliability
      const [isAdmin, isManufacturer, isHardwareAuditor, isSoftwareTechnician, isSchool] = await Promise.all([
        // Use fallback para verificar roles si hasRole no está disponible
        hasRole(defaultAdminRoleStr, address as `0x${string}`) ?? checkRoleFallback(defaultAdminRoleStr, address as `0x${string}`),
        hasRole(fabricanteRoleStr, address as `0x${string}`) ?? checkRoleFallback(fabricanteRoleStr, address as `0x${string}`),
        hasRole(auditorHwRoleStr, address as `0x${string}`) ?? checkRoleFallback(auditorHwRoleStr, address as `0x${string}`),
        hasRole(tecnicoSwRoleStr, address as `0x${string}`) ?? checkRoleFallback(tecnicoSwRoleStr, address as `0x${string}`),
        hasRole(escuelaRoleStr, address as `0x${string}`) ?? checkRoleFallback(escuelaRoleStr, address as `0x${string}`)
      ]);

      console.log('Role check results:', {
        isAdmin,
        isManufacturer,
        isHardwareAuditor,
        isSoftwareTechnician,
        isSchool,
        address
      });

      // Build active role names array
      const activeRoleNames: ContractRoles[] = [];
      if (isAdmin) activeRoleNames.push('DEFAULT_ADMIN_ROLE');
      if (isManufacturer) activeRoleNames.push('FABRICANTE_ROLE');
      if (isHardwareAuditor) activeRoleNames.push('AUDITOR_HW_ROLE');
      if (isSoftwareTechnician) activeRoleNames.push('TECNICO_SW_ROLE');
      if (isSchool) activeRoleNames.push('ESCUELA_ROLE');

      const newRoles: UseUserRoles = {
        isAdmin,
        isManufacturer,
        isHardwareAuditor,
        isSoftwareTechnician,
        isSchool,
        isLoading: false,
        activeRoleNames,
        hasRole: (roleName: ContractRoles) => {
          switch (roleName) {
            case 'DEFAULT_ADMIN_ROLE': return isAdmin;
            case 'FABRICANTE_ROLE': return isManufacturer;
            case 'AUDITOR_HW_ROLE': return isHardwareAuditor;
            case 'TECNICO_SW_ROLE': return isSoftwareTechnician;
            case 'ESCUELA_ROLE': return isSchool;
            default: return false;
          }
        },
        refreshRoles: checkRoles
      };

          // Cache the result with 30 second TTL and stale-while-revalidate
      CacheService.set(cacheKey, newRoles, 30000);
      
      // Always update state
      setUserRoles(newRoles);
      

      
    } catch (error) {
      console.error('Error fetching user roles:', error);

      // Check for specific WalletConnect/Reown allowlist error
      if (error.message?.includes('Allowlist') || error.details?.includes('Allowlist')) {
        console.error('CRITICAL: Origin http://localhost:3000 not found on Allowlist. Please update your configuration on cloud.reown.com');
      }


      
      // If we have stale data and we're revalidating, keep showing it
      setUserRoles(prev => ({ ...prev, isLoading: false }));
    }
  }, [address, isConnected, cacheKey, hasRole]);

  // Inicializa la verificación de roles al conectar o cambiar de dirección
  useEffect(() => {
    if (isConnected && address) {
      console.log('Address changed, refreshing roles for:', address);
      checkRoles();
    }
  }, [isConnected, address]);

  // Escucha los cambios de rol para actualizar automáticamente
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    import('@/lib/events').then(({ eventBus, EVENTS }) => {
      unsubscribe = eventBus.on(EVENTS.ROLE_UPDATED, () => {
        console.log('[useUserRoles] Role update detected, refreshing roles...');
        checkRoles();
      });
    }).catch(error => {
      console.error('Failed to import events module:', error);
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [checkRoles]); // Add checkRoles as dependency

  // Effect to update refreshRoles and hasRole function
  useEffect(() => {
    setUserRoles(prev => {
      // Only update if functions are different
      if (prev.refreshRoles !== checkRoles) {
        return { 
          ...prev, 
          refreshRoles: checkRoles,
          hasRole: (roleName: ContractRoles) => {
            switch (roleName) {
              case 'DEFAULT_ADMIN_ROLE': return prev.isAdmin;
              case 'FABRICANTE_ROLE': return prev.isManufacturer;
              case 'AUDITOR_HW_ROLE': return prev.isHardwareAuditor;
              case 'TECNICO_SW_ROLE': return prev.isSoftwareTechnician;
              case 'ESCUELA_ROLE': return prev.isSchool;
              default: return false;
            }
          }
        };
      }
      return prev;
    });
  }, [checkRoles]);

  return userRoles;
};