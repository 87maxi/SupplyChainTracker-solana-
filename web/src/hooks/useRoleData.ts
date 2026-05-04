// web/src/hooks/useRoleData.ts
// Specialized hook for role data with proper address context

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useCachedData } from '@/hooks/use-cached-data';

interface RoleData {
  isAdmin: boolean;
  isManufacturer: boolean;
  isHardwareAuditor: boolean;
  isSoftwareTechnician: boolean;
  isSchool: boolean;
}

const DEFAULT_ROLE_DATA: RoleData = {
  isAdmin: false,
  isManufacturer: false,
  isHardwareAuditor: false,
  isSoftwareTechnician: false,
  isSchool: false,
};

export const useRoleData = () => {
  const { address } = useWeb3();
  const cacheKey = `user_roles_${address || 'unknown'}`;

  const fetchRoles = useCallback(async (): Promise<RoleData> => {
    if (!address) return DEFAULT_ROLE_DATA;
    
    // This would call the actual role checking logic from SupplyChainService
    // For now, returning default data
    return DEFAULT_ROLE_DATA;
  }, [address]);

  const { data, isLoading, error, refresh, invalidate } = useCachedData<RoleData>(
    cacheKey,
    fetchRoles,
    {
      ttl: 30 * 1000, // 30 seconds
      staleWhileRevalidate: true,
    }
  );

  return {
    roles: data || DEFAULT_ROLE_DATA,
    isLoading,
    error,
    refresh,
    invalidate,
  };
};