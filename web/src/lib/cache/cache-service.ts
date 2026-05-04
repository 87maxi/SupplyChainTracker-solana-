import { safeJsonStringify } from '../utils';

/**
 * Servicio de Caché para almacenamiento en memoria y localStorage
 * Implementa un mecanismo TTL (Time To Live) para invalidación automática
 */
export class CacheService {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private static readonly PREFIX = 'supplychain-cache:';

  /**
   * Almacena un valor en caché con un tiempo de vida específico
   * @param key Clave única para el valor
   * @param data Datos a almacenar
   * @param ttl Tiempo de vida en milisegundos (opcional)
   */
  static set<T>(key: string, data: T, ttl?: number): void {
    if (typeof window === 'undefined') return; // SSR safety

    try {
      const item = {
        data,
        expiry: Date.now() + (ttl || this.DEFAULT_TTL)
      };
      localStorage.setItem(this.PREFIX + key, safeJsonStringify(item));
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  // Alias methods for backward compatibility with imported function names
  static getCache<T>(key: string): T | null {
    return this.get<T>(key);
  }

  static setCache<T>(key: string, data: T, ttl?: number): void {
    this.set<T>(key, data, ttl);
  }

  static isCacheStale(key: string): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const itemStr = localStorage.getItem(this.PREFIX + key);
      if (!itemStr) return true;
      const item = JSON.parse(itemStr);
      return Date.now() > item.expiry;
    } catch (error) {
      console.warn('Cache staleness check failed:', error);
      return true;
    }
  }

  // Revalidation tracking using a simple Set for in-memory tracking
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

  /**
   * Recupera un valor de la caché si aún es válido
   * @param key Clave del valor a recuperar
   * @returns El valor almacenado o null si no existe o ha expirado
   */
  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const itemStr = localStorage.getItem(this.PREFIX + key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);

      if (Date.now() > item.expiry) {
        localStorage.removeItem(this.PREFIX + key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Cache get failed:', error);
      return null;
    }
  }

  /**
   * Elimina un valor específico de la caché
   * @param key Clave del valor a eliminar
   */
  static remove(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.warn('Cache remove failed:', error);
    }
  }

  /**
   * Limpia todos los datos de la caché
   */
  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(this.PREFIX))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }
}