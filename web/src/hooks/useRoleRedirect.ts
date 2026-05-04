'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus, EVENTS } from '@/lib/events';

/**
 * Hook para redirigir automáticamente al dashboard cuando el usuario tiene roles asignados
 */
export const useRoleRedirect = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUserRolesAndRedirect = async () => {
      if (!isConnected || !address) return;

      try {
        // Obtener datos cacheados de roles del usuario
        const cachedData = queryClient.getQueryData(['userRoles', address]);
        
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          // Usuario tiene roles, redirigir al dashboard
          router.push('/dashboard');
          return;
        }

        // Si no hay datos cacheados, intentar obtener roles frescos
        const rolesSummary = queryClient.getQueryData(['rolesSummary']);
        
        if (rolesSummary && typeof rolesSummary === 'object') {
          const userHasRoles = Object.values(rolesSummary).some(
            (roleInfo) => 
              roleInfo?.members?.includes(address.toLowerCase())
          );

          if (userHasRoles) {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking user roles for redirect:', error);
      }
    };

    checkUserRolesAndRedirect();

    // Escuchar eventos de actualización de roles a través del event bus
    const unsubscribe = eventBus.on(EVENTS.ROLE_UPDATED, (data) => {
      // Si el evento es para el usuario actual, verificar roles
      if (data.address && address && data.address.toLowerCase() === address.toLowerCase()) {
        setTimeout(checkUserRolesAndRedirect, 1500); // Delay para permitir que se actualice la cache
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [isConnected, address, router, queryClient]);

  return null;
};