// web/src/hooks/use-cached-data.ts

import { useState, useEffect, useCallback } from 'react';

export interface CacheOptions {
  ttl?: number; // Time to live en milisegundos
  staleWhileRevalidate?: boolean;
  maxSize?: number;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
const DEFAULT_MAX_SIZE = 100;

// Cache en memoria global (compartido entre componentes)
const globalCache = new Map<string, CacheItem<any>>();
// Cola para controlar revalidaciones y evitar múltiples llamadas simultáneas
const revalidationQueue = new Map<string, boolean>();

// Limpiar cache expirado periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of globalCache.entries()) {
    if (item.expiresAt <= now) {
      globalCache.delete(key);
    }
  }
}, 60 * 1000); // Cada minuto

export const useCachedData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) => {
  // Create a stable reference for fetcher
  const stableFetcher = useCallback(fetcher, []);
  // In a real implementation, we would get address from Web3Context
  // For now, we'll use a placeholder
  const address = '';
  const {
    ttl = DEFAULT_TTL,
    staleWhileRevalidate = true,
    maxSize = DEFAULT_MAX_SIZE
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  // Limitar tamaño del cache
  const enforceCacheSize = useCallback(() => {
    if (globalCache.size > maxSize) {
      // Eliminar los items más antiguos
      const entries = Array.from(globalCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, globalCache.size - maxSize);
      toRemove.forEach(([key]) => globalCache.delete(key));
    }
  }, [maxSize]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await stableFetcher();
      const now = Date.now();
      
      // Actualizar cache
      const cacheItem: CacheItem<T> = {
        data: result,
        timestamp: now,
        expiresAt: now + ttl
      };
      
      globalCache.set(key, cacheItem);
      enforceCacheSize();
      
      setData(result);
      setLastUpdated(now);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enforceCacheSize]);

  const getCachedData = useCallback((): T | null => {
    const cacheKey = `${key}_${address || ''}`;
    const cached = globalCache.get(cacheKey);
    const now = Date.now();

    if (!cached) {
      return null;
    }

    // Datos expirados
    if (cached.expiresAt <= now) {
      if (staleWhileRevalidate) {
        // Usar cola de revalidación para evitar múltiples llamadas simultáneas
        const cacheKey = `${key}_${address || ''}`;
        if (!revalidationQueue.has(cacheKey)) {
          revalidationQueue.set(cacheKey, true);
          fetchData().catch(console.error).finally(() => {
            revalidationQueue.delete(cacheKey);
          });
        }
        return cached.data;
      }
      return null;
    }

    return cached.data;
  }, [key, address, staleWhileRevalidate, fetchData]);

  const invalidate = useCallback(() => {
    const cacheKey = `${key}_${address || ''}`;
    globalCache.delete(cacheKey);
    setData(null);
    setLastUpdated(0);
  }, [key, address]);

  const refresh = useCallback(() => {
    invalidate();
    return fetchData();
  }, [invalidate, fetchData]);

  // Cargar datos iniciales
  useEffect(() => {
    const cachedData = getCachedData();
    const cacheKey = `${key}_${address || ''}`;
    
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      
      // Revalidar datos stale en background
      if (staleWhileRevalidate) {
        const cached = globalCache.get(cacheKey);
        if (cached && cached.expiresAt <= Date.now()) {
          if (!revalidationQueue.has(cacheKey)) {
            revalidationQueue.set(cacheKey, true);
            fetchData().catch(console.error).finally(() => {
              revalidationQueue.delete(cacheKey);
            });
          }
        }
      }
    } else {
      fetchData();
    }
  }, [key, address, getCachedData, fetchData, staleWhileRevalidate]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    invalidate,
    isStale: () => {
      const cacheKey = `${key}_${address || ''}`;
      const cached = globalCache.get(cacheKey);
      return cached ? cached.expiresAt <= Date.now() : false;
    }
  };
};

// Hook para datos que no cambian frecuentemente
export const useStaticData = <T>(
  key: string,
  fetcher: () => Promise<T>
) => {
  return useCachedData(key, fetcher, {
    ttl: 24 * 60 * 60 * 1000, // 24 horas
    staleWhileRevalidate: true
  });
};

// Hook para datos que cambian frecuentemente
export const useLiveData = <T>(
  key: string,
  fetcher: () => Promise<T>
) => {
  return useCachedData(key, fetcher, {
    ttl: 30 * 1000, // 30 segundos
    staleWhileRevalidate: false
  });
};

// Utilidad para limpiar cache completo
export const clearAllCache = () => {
  globalCache.clear();
};

// Utilidad para obtener stats del cache
export const getCacheStats = () => {
  const now = Date.now();
  const stats = {
    totalItems: globalCache.size,
    expiredItems: Array.from(globalCache.values()).filter(
      item => item.expiresAt <= now
    ).length,
    memoryUsage: JSON.stringify(Array.from(globalCache.values())).length
  };
  
  return stats;
};