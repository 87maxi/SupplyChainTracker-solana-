// web/src/hooks/useRoleCallsManager.ts
// Centralized manager for role-related contract calls with batching and caching

import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { getAllRolesSummary } from '@/services/SupplyChainService';
import { getCache, setCache, isCacheStale, clearCache, clearAllCache } from '@/lib/utils/cache';

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
  const rolesToFetch: string[] = [];
  
  uniqueRoles.forEach(role => {
    const cached = getCache<string[]>(`role_members_${role}`);
    if (cached && !isCacheStale(`role_members_${role}`)) {
      cachedData[role] = cached;
    } else {
      rolesToFetch.push(role);
    }
  });

  // If we have cached data for all roles, resolve immediately
  if (rolesToFetch.length === 0) {
    requests.forEach(request => {
      request.resolve(cachedData[request.role]);
    });
    return;
  }

  // Only make one call to get all roles summary if needed
  let summary: RolesSummary | null = null;
  try {
    // Use the actual getAllRolesSummary function
    summary = await getAllRolesSummary();
    
    // Cache each role's members with longer TTL
    if (summary) {
      Object.entries(summary).forEach(([roleName, roleData]) => {
        setCache(`role_members_${roleName}`, roleData.members, BATCH_CONFIG.CACHE_TTL);
      });
    } else {
      console.warn('getAllRolesSummary returned null, using empty summary');
      summary = {};
    }
  } catch (error) {
    console.error('Error fetching roles summary:', error);
    // Reject all requests that couldn't be fulfilled from cache
    // For now, return empty array for all roles
    requests.forEach(request => {
      request.resolve([]);
    });
    return;
  }

  // Resolve all requests
  requests.forEach(request => {
    // Use cached data if available, otherwise use fetched data
    const members = cachedData[request.role] || 
                  (summary?.[request.role]?.members || []);
    request.resolve(members);
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
  const refreshAllRoles = useCallback(() => {
    // Clear cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('role_members_')) {
        clearCache(key);
      }
    });
    
    // Process any pending requests immediately
    if (roleRequestsQueue.length > 0) {
      batchScheduled = false;
      processBatch();
    }
  }, []);

  // Clear all role-related caches
  const clearRoleCache = useCallback(() => {
    // Instead of using localStorage, we'll use our global cache map
    // But our clearCache function doesn't take parameters, so we need to modify our approach
    // For now, we'll just use clearAllCache or find another way
    // Importing clearAllCache from cache utilities
    clearAllCache(); // Using clearAllCache since our clearCache doesn't take parameters
  }, []);

  // Debug function to get cache stats
  const getCacheStats = useCallback(() => {
    return {
      queueLength: roleRequestsQueue.length,
      batchScheduled,
      // Add more stats as needed
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
  
  // Remove clearSpecificCache since we have clearRoleCache and clearAllCache
  // The clearCache from utilities is already imported and used appropriately

  return {
    getRoleMembers,
    refreshAllRoles,
    clearRoleCache,
    getCacheStats
  };
};
