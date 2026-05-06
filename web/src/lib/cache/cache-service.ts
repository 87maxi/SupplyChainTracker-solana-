/**
 * Advanced Cache Service with TTL, Tags, and Statistics
 *
 * Features:
 * - Time-To-Live (TTL) for automatic expiration
 * - Tag-based invalidation (invalidate all cache entries with a tag)
 * - Cache statistics (hits, misses, size)
 * - Automatic cleanup of expired entries
 * - Memory fallback with localStorage persistence
 *
 * Usage:
 *   import { cache, CACHE_TAGS } from '@/lib/cache/cache-service';
 *   cache.set('netbook:1', data, { ttl: CACHE_CONFIG.NETBOOK_DATA, tags: [CACHE_TAGS.NETBOOK] });
 *   cache.invalidateByTag(CACHE_TAGS.NETBOOK);
 */

import { safeJsonStringify, safeJsonParse } from '../utils';
import { CACHE_CONFIG } from '../env';

// ==================== Types ====================

interface CacheEntry<T> {
  data: T;
  expiry: number;
  tags?: string[];
  createdAt: number;
}

export interface CacheStats {
  totalEntries: number;
  memoryEntries: number;
  localStorageEntries: number;
  hits: number;
  misses: number;
  hitsRate: number;
  size: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  useMemory?: boolean;
}

// ==================== Tag Constants ====================

/** Common cache tags for invalidation */
export const CACHE_TAGS = {
  NETBOOK: 'netbook',
  NETBOOKS_LIST: 'netbooks:list',
  USER: 'user',
  USERS_LIST: 'users:list',
  CONFIG: 'config',
  STATS: 'stats',
  ROLE: 'role',
  ROLES_LIST: 'roles:list',
  ROLE_REQUESTS: 'role-requests',
  EVENTS: 'events',
  ANALYTICS: 'analytics',
  ALL: '__all__',
} as const;

// ==================== Cache Service Class ====================

export class CacheService {
  private static readonly DEFAULT_TTL = CACHE_CONFIG.DEFAULT;
  private static readonly PREFIX = 'supplychain-cache:';
  
  /** In-memory cache for faster access (cleared on page refresh) */
  private static memoryCache = new Map<string, CacheEntry<unknown>>();
  
  /** Cache statistics */
  private static stats = {
    hits: 0,
    misses: 0,
  };

  /** Maximum number of entries in memory cache */
  private static readonly MAX_MEMORY_ENTRIES = 100;

  /** Automatic cleanup interval (5 minutes) */
  private static cleanupInterval: NodeJS.Timeout | null = null;

  // ==================== Initialization ====================

  /** Start automatic cleanup of expired entries */
  static startAutoCleanup(intervalMs: number = 5 * 60 * 1000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, intervalMs);
  }

  /** Stop automatic cleanup */
  static stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ==================== Core Operations ====================

  /**
   * Stores a value in cache with optional TTL and tags
   * @param key Unique key for the cache entry
   * @param data Data to store
   * @param options Cache options (TTL, tags, memory preference)
   */
  static set<T>(key: string, data: T, options?: CacheOptions): void {
    const now = Date.now();
    const ttl = options?.ttl ?? this.DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data,
      expiry: now + ttl,
      tags: options?.tags,
      createdAt: now,
    };

    // Store in localStorage (persistent)
    this.saveToLocalStorage(key, entry);

    // Store in memory if enabled
    if (options?.useMemory !== false) {
      this.saveToMemory(key, entry);
    }
  }

  /**
   * Retrieves a value from cache
   * @param key Unique key for the cache entry
   * @returns The stored data or null if not found/expired
   */
  static get<T>(key: string): T | null {
    let entry: CacheEntry<T> | null = null;

    // Try memory cache first
    entry = this.getFromMemory(key);
    
    // Fall back to localStorage
    if (!entry) {
      entry = this.getFromLocalStorage(key);
      // Refresh memory cache
      if (entry) {
        this.saveToMemory(key, entry);
      }
    }

    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiry) {
      this.remove(key);
      this.recordMiss();
      return null;
    }

    this.recordHit();
    return entry.data;
  }

  /**
   * Removes a specific cache entry
   * @param key Unique key for the cache entry
   */
  static remove(key: string): void {
    this.removeFromMemory(key);
    this.removeFromLocalStorage(key);
  }

  /**
   * Clears all cache entries
   */
  static clear(): void {
    this.clearMemory();
    this.clearLocalStorage();
    this.resetStats();
  }

  // ==================== Tag-based Invalidation ====================

  /**
   * Invalidates all cache entries with specific tags
   * @param tags Tags to invalidate
   */
  static invalidateByTag(...tags: string[]): void {
    const keysToRemove: string[] = [];

    // Check memory cache
    for (const [key, entry] of this.memoryCache) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        keysToRemove.push(key);
      }
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const prefix = this.PREFIX;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const cacheKey = key.slice(prefix.length);
          if (!keysToRemove.includes(cacheKey)) {
            const entry = this.getFromLocalStorage<unknown>(cacheKey);
            if (entry?.tags && entry.tags.some(tag => tags.includes(tag))) {
              keysToRemove.push(cacheKey);
            }
          }
        }
      }
    }

    // Remove all matching entries
    for (const key of keysToRemove) {
      this.remove(key);
    }
  }

  /**
   * Invalidates all cache entries matching a prefix
   * @param prefix Key prefix to match
   */
  static invalidateByPrefix(prefix: string): void {
    const keysToRemove: string[] = [];

    // Check memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
      const fullPrefix = this.PREFIX + prefix;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          const cacheKey = key.slice(this.PREFIX.length);
          if (!keysToRemove.includes(cacheKey)) {
            keysToRemove.push(cacheKey);
          }
        }
      }
    }

    // Remove all matching entries
    for (const key of keysToRemove) {
      this.remove(key);
    }
  }

  // ==================== Statistics ====================

  /**
   * Gets cache statistics
   */
  static getStats(): CacheStats {
    const memoryEntries = this.memoryCache.size;
    const localStorageEntries = this.getLocalStorageEntryCount();
    const totalEntries = memoryEntries + localStorageEntries;
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitsRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalEntries,
      memoryEntries,
      localStorageEntries,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitsRate: Math.round(hitsRate * 100) / 100,
      size: totalEntries,
    };
  }

  /**
   * Resets cache statistics
   */
  static resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  // ==================== Utility Methods ====================

  /**
   * Checks if a key exists and is not expired
   * @param key Unique key for the cache entry
   */
  static has(key: string): boolean {
    const entry = this.getFromMemory(key) ?? this.getFromLocalStorage(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.remove(key);
      return false;
    }
    return true;
  }

  /**
   * Checks if a cache entry is stale (expired or about to expire)
   * @param key Unique key for the cache entry
   * @param warningThreshold Time before expiry to consider as stale (default: 0)
   */
  static isStale(key: string, warningThreshold: number = 0): boolean {
    const entry = this.getFromMemory(key) ?? this.getFromLocalStorage(key);
    if (!entry) return true;
    return Date.now() + warningThreshold > entry.expiry;
  }

  /**
   * Gets the remaining TTL for a cache entry in milliseconds
   * @param key Unique key for the cache entry
   * @returns Remaining TTL or 0 if not found/expired
   */
  static getTtl(key: string): number {
    const entry = this.getFromMemory(key) ?? this.getFromLocalStorage(key);
    if (!entry) return 0;
    const remaining = entry.expiry - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Cleans up all expired entries
   */
  static cleanupExpired(): void {
    const now = Date.now();
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expiry) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    if (typeof window !== 'undefined') {
      const prefix = this.PREFIX;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            try {
              const item = JSON.parse(itemStr);
              if (now > item.expiry) {
                localStorage.removeItem(key);
              }
            } catch {
              localStorage.removeItem(key);
            }
          }
        }
      }
    }
  }

  // ==================== Backward Compatibility Methods ====================

  /** Alias for get() */
  static getCache<T>(key: string): T | null {
    return this.get<T>(key);
  }

  /** Alias for set() */
  static setCache<T>(key: string, data: T, ttl?: number): void {
    this.set(key, data, { ttl });
  }

  /** Alias for isStale() */
  static isCacheStale(key: string): boolean {
    return this.isStale(key);
  }

  // Revalidation tracking (legacy)
  private static revalidatingKeys = new Set<string>();

  static isRevalidating(key: string): boolean {
    return this.revalidatingKeys.has(key);
  }

  static startRevalidation(key: string): void {
    this.revalidatingKeys.add(key);
  }

  static completeRevalidation(key: string): void {
    this.revalidatingKeys.delete(key);
  }

  // ==================== Private Methods ====================

  private static saveToLocalStorage<T>(key: string, entry: CacheEntry<T>): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.PREFIX + key, safeJsonStringify(entry));
    } catch (error) {
      console.warn('Cache localStorage save failed:', error);
    }
  }

  private static getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const itemStr = localStorage.getItem(this.PREFIX + key);
      if (!itemStr) return null;
      return JSON.parse(itemStr) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  private static removeFromLocalStorage(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.warn('Cache localStorage remove failed:', error);
    }
  }

  private static clearLocalStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const prefix = this.PREFIX;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Cache localStorage clear failed:', error);
    }
  }

  private static saveToMemory<T>(key: string, entry: CacheEntry<T>): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      // Evict oldest entry
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      
      for (const [k, e] of this.memoryCache) {
        if (e.createdAt < oldestTime) {
          oldestTime = e.createdAt;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
    
    this.memoryCache.set(key, entry);
  }

  private static getFromMemory<T>(key: string): CacheEntry<T> | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return entry as CacheEntry<T>;
  }

  private static removeFromMemory(key: string): void {
    this.memoryCache.delete(key);
  }

  private static clearMemory(): void {
    this.memoryCache.clear();
  }

  private static getLocalStorageEntryCount(): number {
    if (typeof window === 'undefined') return 0;
    
    let count = 0;
    const prefix = this.PREFIX;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(prefix)) {
        count++;
      }
    }
    return count;
  }

  private static recordHit(): void {
    this.stats.hits++;
  }

  private static recordMiss(): void {
    this.stats.misses++;
  }
}

// ==================== Auto-initialization ====================

// Start automatic cleanup when module loads
if (typeof window !== 'undefined') {
  CacheService.startAutoCleanup();
}

// ==================== Default Export ====================

export const cache = CacheService;
