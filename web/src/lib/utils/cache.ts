// web/src/lib/utils/cache.ts
// Global cache utilities for the application

import { log } from '@/lib/logger';

/** Cache item with metadata */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

/** Cache statistics */
export interface CacheStats {
  totalItems: number;
  expiredItems: number;
  staleItems: number;
  memoryUsage: number;
  cacheKeys: string[];
}

/** Global cache storage */
const globalCache = new Map<string, CacheItem<unknown>>();

/** Revalidation queue to prevent duplicate calls */
const revalidationQueue = new Map<string, boolean>();

/** Cache TTL configuration (milliseconds) */
export const CACHE_CONFIG = {
  TTL: {
    USER_ROLES: 30_000,
    STATIC_DATA: 300_000,
    ROLE_MEMBERS: 120_000,
    NETBOOK_INFO: 15_000,
  } as const,
  STALE_WHILE_REVALIDATE: {
    USER_ROLES: true,
    STATIC_DATA: true,
    ROLE_MEMBERS: false,
    NETBOOK_INFO: true,
  } as const,
};

/**
 * Gets an item from the cache.
 * @returns Cached data or null if not found or expired.
 */
export const getCache = <T>(key: string): T | null => {
  const item = globalCache.get(key);
  if (!item) return null;

  const now = Date.now();

  if (item.expiresAt <= now) {
    globalCache.delete(key);
    return null;
  }

  return item.data as T;
};

/**
 * Sets an item in the cache.
 */
export const setCache = <T>(
  key: string,
  data: T,
  ttl: number,
  staleWhileRevalidate = false
): void => {
  const now = Date.now();
  const expiresAt = now + ttl;
  const staleAt = staleWhileRevalidate ? now + (ttl / 2) : expiresAt;

  globalCache.set(key, {
    data,
    timestamp: now,
    expiresAt,
    staleAt,
  });
};

/**
 * Checks if cache item is stale (needs revalidation).
 */
export const isCacheStale = (key: string): boolean => {
  const item = globalCache.get(key);
  if (!item) return true;

  return Date.now() >= item.staleAt;
};

/**
 * Checks if a revalidation is in progress.
 */
export const isRevalidating = (key: string): boolean => {
  return revalidationQueue.has(key);
};

/**
 * Marks a revalidation as started.
 */
export const startRevalidation = (key: string): void => {
  revalidationQueue.set(key, true);
};

/**
 * Marks a revalidation as completed.
 */
export const completeRevalidation = (key: string): void => {
  revalidationQueue.delete(key);
};

/**
 * Clears a specific cache item.
 */
export const clearCache = (key: string): void => {
  globalCache.delete(key);
  revalidationQueue.delete(key);
};

/**
 * Clears all cache.
 */
export const clearAllCache = (): void => {
  globalCache.clear();
  revalidationQueue.clear();
  log.debug('Cache cleared');
};

/**
 * Gets cache statistics.
 */
export const getCacheStats = (): CacheStats => {
  const now = Date.now();
  const values = Array.from(globalCache.values());

  return {
    totalItems: globalCache.size,
    expiredItems: values.filter(item => item.expiresAt <= now).length,
    staleItems: values.filter(item => item.staleAt <= now).length,
    memoryUsage: JSON.stringify(values).length,
    cacheKeys: Array.from(globalCache.keys()),
  };
};

/** Cleanup expired items every minute */
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, item] of globalCache.entries()) {
    if (item.expiresAt <= now) {
      globalCache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.debug(`Cache cleanup: removed ${cleaned} expired items`);
  }
}, 60_000);
