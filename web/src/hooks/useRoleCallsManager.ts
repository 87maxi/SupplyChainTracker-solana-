// web/src/hooks/useRoleCallsManager.ts
// Centralized manager for role-related contract calls with batching and caching

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { getCache, setCache, isCacheStale, clearAllCache } from '@/lib/utils/cache';

interface RoleMembers {
  role: string;
  members: string[];
  count: number;
}

interface RolesSummary {
  [key: string]: RoleMembers;
}

// Batching configuration
const BATCH_CONFIG = {
  MAX_CALLS: 3, // Maximum concurrent calls
  BATCH_TIMEOUT: 500, // Reduce time window to batch calls
  CACHE_TTL: 5 * 60 * 1000, // Increase cache TTL to 5 minutes
  MAX_CONCURRENT_REQUESTS: 2 // Limit concurrent requests to reduce load
};

// Queue for batching role member requests
const roleRequestsQueue: Array<{
  resolve: (value: string[]) => void;
  reject: (reason?: unknown) => void;
  role: string;
}> = [];

// Flag to indicate if a batch is scheduled
let batchScheduled = false;

// Process the batch of role member requests
const processBatch = async () => {
  // Clear the flag since we're processing
  batchScheduled = false;

  if (roleRequestsQueue.length === 0) return;

  // Take all current requests
  const requests = [...roleRequestsQueue];
  // Clear the queue
  roleRequestsQueue.length = 0;

  // Try to get data from cache first for each unique role
  const uniqueRoles = [...new Set(requests.map(r => r.role))];
  
  // Check if we have cached data
  const cachedData: { [role: string]: string[] } = {};
  const rolesToCheck: string[] = [];
  
  uniqueRoles.forEach(role => {
    const cached = getCache<string[]>(`role_members_${role}`);
    if (cached && !isCacheStale(`role_members_${role}`)) {
      cachedData[role] = cached;
    } else {
      rolesToCheck.push(role);
    }
  });

  // If we have cached data for all roles, resolve immediately
  if (rolesToCheck.length === 0) {
    requests.forEach(request => {
      request.resolve(cachedData[request.role]);
    });
    return;
  }

  // For Solana, we return empty arrays as the service is used directly
  // The getAllRolesSummary function is called from useSupplyChainService
  requests.forEach(request => {
    request.resolve(cachedData[request.role] || []);
  });
};

// Schedule a batch process
const scheduleBatch = () => {
  if (!batchScheduled) {
    batchScheduled = true;
    setTimeout(processBatch, BATCH_CONFIG.BATCH_TIMEOUT);
  }
};

// Exported hook for getting role members
export const useRoleCallsManager = () => {
  const { address } = useWeb3();
  const { getAllRolesSummary } = useSupplyChainService();

  // Function to get members of a role with batching and caching
  const getRoleMembers = useCallback(async (role: string): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      // Add to queue
      roleRequestsQueue.push({ resolve, reject, role });
      
      // Schedule batch processing
      scheduleBatch();
    });
  }, []);

  // Function to refresh all role data
  const refreshAllRoles = useCallback(async () => {
    // Clear cache
    clearAllCache();
    
    // Process any pending requests immediately
    if (roleRequestsQueue.length > 0) {
      batchScheduled = false;
      processBatch();
    }
    
    // Call the service to refresh
    try {
      await getAllRolesSummary();
    } catch (error) {
      console.error('Error refreshing roles:', error);
    }
  }, [getAllRolesSummary]);

  // Clear all role-related caches
  const clearRoleCache = useCallback(() => {
    clearAllCache();
  }, []);

  // Debug function to get cache stats
  const getCacheStats = useCallback(() => {
    return {
      queueLength: roleRequestsQueue.length,
      batchScheduled,
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts if component unmounts
      if (batchScheduled) {
        batchScheduled = false;
      }
    };
  }, []);

  return {
    getRoleMembers,
    refreshAllRoles,
    clearRoleCache,
    getCacheStats
  };
};
