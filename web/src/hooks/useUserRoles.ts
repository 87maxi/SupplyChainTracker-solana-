'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { CacheService } from '@/lib/cache/cache-service';
import { PublicKey } from '@solana/web3.js';

interface UseUserRoles {
  isAdmin: boolean;
  isManufacturer: boolean;
  isHardwareAuditor: boolean;
  isSoftwareTechnician: boolean;
  isSchool: boolean;
  isLoading: boolean;
  hasRole: (roleName: string) => boolean;
  activeRoleNames: string[];
  refreshRoles: () => void;
}

export const useUserRoles = (): UseUserRoles => {
  const { publicKey, isConnected } = useSolanaWeb3();
  const { hasRole: checkUserHasRole } = useSupplyChainService();
  
  const cacheKey = `user_roles_${publicKey?.toBase58() || 'unknown'}`;
  
  const [userRoles, setUserRoles] = useState<UseUserRoles>({
    isAdmin: false,
    isManufacturer: false,
    isHardwareAuditor: false,
    isSoftwareTechnician: false,
    isSchool: false,
    isLoading: true,
    hasRole: (roleName: string) => {
      switch (roleName) {
        case 'ADMIN_ROLE': return false;
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
    if (!isConnected || !publicKey) {
      setUserRoles(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const userAddress = publicKey.toBase58();

    // Check cache first
    const cachedRoles = CacheService.get<UseUserRoles>(cacheKey);
    if (cachedRoles && !CacheService.isCacheStale(cacheKey)) {
      setUserRoles(cachedRoles);
      return;
    }

    // If we have stale data, serve it while revalidating
    if (cachedRoles) {
      setUserRoles(cachedRoles);
    } else {
      setUserRoles(prev => ({ ...prev, isLoading: true }));
    }

    console.log('[useUserRoles] Starting role check for address:', userAddress);

    try {
      // Use Solana service to check roles (role names directly, pass address as string)
      const [isAdmin, isManufacturer, isHardwareAuditor, isSoftwareTechnician, isSchool] = await Promise.all([
        checkUserHasRole('ADMIN_ROLE', userAddress),
        checkUserHasRole('FABRICANTE_ROLE', userAddress),
        checkUserHasRole('AUDITOR_HW_ROLE', userAddress),
        checkUserHasRole('TECNICO_SW_ROLE', userAddress),
        checkUserHasRole('ESCUELA_ROLE', userAddress)
      ]);

      console.log('Role check results:', {
        isAdmin,
        isManufacturer,
        isHardwareAuditor,
        isSoftwareTechnician,
        isSchool,
        userAddress
      });

      // Build active role names array
      const activeRoleNames: string[] = [];
      if (isAdmin) activeRoleNames.push('ADMIN_ROLE');
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
        hasRole: (roleName: string) => {
          switch (roleName) {
            case 'ADMIN_ROLE': return isAdmin;
            case 'FABRICANTE_ROLE': return isManufacturer;
            case 'AUDITOR_HW_ROLE': return isHardwareAuditor;
            case 'TECNICO_SW_ROLE': return isSoftwareTechnician;
            case 'ESCUELA_ROLE': return isSchool;
            default: return false;
          }
        },
        refreshRoles: typeof checkRoles === 'function' ? checkRoles : () => {}
      };

      // Cache the result with 30 second TTL and stale-while-revalidate
      CacheService.set(cacheKey, newRoles, { ttl: 30000 });
      
      // Always update state
      setUserRoles(newRoles);
      
    } catch (error) {
      console.error('Error fetching user roles:', error);
      
      // If we have stale data and we're revalidating, keep showing it
      setUserRoles(prev => ({ ...prev, isLoading: false }));
    }
  }, [publicKey, isConnected, cacheKey, checkUserHasRole]);

  // Initialize role check when wallet connects or changes
  useEffect(() => {
    if (isConnected && publicKey) {
      console.log('Wallet changed, refreshing roles for:', publicKey.toBase58());
      checkRoles();
    }
  }, [isConnected, publicKey]);

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
  }, [checkRoles]);

  // Effect to update refreshRoles and hasRole function
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setUserRoles(prev => {
      // Only update if functions are different
      if (prev.refreshRoles !== checkRoles) {
        return { 
          ...prev, 
          refreshRoles: checkRoles,
          hasRole: (roleName: string) => {
            switch (roleName) {
              case 'ADMIN_ROLE': return prev.isAdmin;
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
