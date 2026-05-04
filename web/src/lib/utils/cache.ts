// web/src/lib/utils/cache.ts
// Global cache utilities for the application

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

// Global cache storage
const globalCache = new Map<string, CacheItem<unknown>>();
// Store to control revalidation and prevent multiple calls
const revalidationQueue = new Map<string, boolean>();

// Cache configuration
const CACHE_CONFIG = {
  TTL: {
    USER_ROLES: 30 * 1000, // 30 seconds
    STATIC_DATA: 5 * 60 * 1000, // 5 minutes
    ROLE_MEMBERS: 2 * 60 * 1000, // 2 minutes
    NETBOOK_INFO: 15 * 1000 // 15 seconds
  },
  STALE_WHILE_REVALIDATE: {
    USER_ROLES: true,
    STATIC_DATA: true,
    ROLE_MEMBERS: false,
    NETBOOK_INFO: true
  }
};

/**
 * Gets an item from the cache
 * @param key Cache key
 * @returns Cached data or null if not found or expired
 */
export const getCache = <T>(key: string): T | null => {
  const item = globalCache.get(key);
  if (!item) return null;

  const now = Date.now();
  
  // If expired, remove and return null
  if (item.expiresAt <= now) {
    globalCache.delete(key);
    return null;
  }
  
  return item.data;
};

/**
 * Sets an item in the cache
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time to live in milliseconds
 * @param staleWhileRevalidate Whether to allow stale data while revalidating
 */
export const setCache = <T>(key: string, data: T, ttl: number, staleWhileRevalidate: boolean = false): void => {
  const now = Date.now();
  const expiresAt = now + ttl;
  const staleAt = staleWhileRevalidate ? now + (ttl / 2) : expiresAt;
  
  globalCache.set(key, {
    data,
    timestamp: now,
    expiresAt,
    staleAt
  });
};

/**
 * Checks if cache item is stale (needs revalidation)
 * @param key Cache key
 * @returns Boolean indicating if item is stale
 */
export const isCacheStale = (key: string): boolean => {
  const item = globalCache.get(key);
  if (!item) return true;
  
  return Date.now() >= item.staleAt;
};

/**
 * Checks if a revalidation is in progress
 * @param key Cache key
 * @returns Boolean indicating if revalidation is in progress
 */
export const isRevalidating = (key: string): boolean => {
  return revalidationQueue.has(key);
};

/**
 * Marks a revalidation as started
 * @param key Cache key
 */
export const startRevalidation = (key: string): void => {
  revalidationQueue.set(key, true);
};

/**
 * Marks a revalidation as completed
 * @param key Cache key
 */
export const completeRevalidation = (key: string): void => {
  revalidationQueue.delete(key);
};

/**
 * Clears a specific cache item
 * @param key Cache key
 */
export const clearCache = (key: string): void => {
  globalCache.delete(key);
  revalidationQueue.delete(key);
};

/**
 * Clears all cache
 */
export const clearAllCache = (): void => {
  globalCache.clear();
  revalidationQueue.clear();
};

/**
 * Gets cache stats
 * @returns Object with cache statistics
 */
export const getCacheStats = () => {
  const now = Date.now();
  const stats = {
    totalItems: globalCache.size,
    expiredItems: Array.from(globalCache.values()).filter(
      item => item.expiresAt <= now
    ).length,
    staleItems: Array.from(globalCache.values()).filter(
      item => item.staleAt <= now
    ).length,
    memoryUsage: JSON.stringify(Array.from(globalCache.values())).length,
    cacheKeys: Array.from(globalCache.keys())
  };
  
  return stats;
};

// Cleanup expired items periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of globalCache.entries()) {
    if (item.expiresAt <= now) {
      globalCache.delete(key);
    }
  }
}, 60 * 1000); // Every minute
