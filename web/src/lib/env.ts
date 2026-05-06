/**
 * Environment Configuration Module
 *
 * Centralized environment variable validation and configuration.
 * All environment variables are validated at startup to prevent runtime errors.
 *
 * Usage:
 *   import { env, CACHE_CONFIG } from '@/lib/env';
 *   console.log(env.PROGRAM_ID);
 *   const ttl = CACHE_CONFIG.NETBOOK_DATA; // 2 minutes
 */

import { PublicKey } from '@solana/web3.js';

// ==================== Utility Functions ====================

/**
 * Validates and normalizes a Solana public key (base58 format)
 * Returns undefined if the key is invalid or empty
 */
const validateAndNormalizePublicKey = (address: string | undefined): string | undefined => {
  if (!address || address.trim() === '') return undefined;
  
  try {
    new PublicKey(address.trim());
    return address.trim();
  } catch (error) {
    console.error(`[env] Invalid Solana public key: ${address}`, error);
    return undefined;
  }
};

/**
 * Parses an integer environment variable with a default value
 */
const parseEnvInt = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    console.warn(`[env] Invalid integer for ${key}: "${value}", using default: ${defaultValue}`);
    return defaultValue;
  }
  
  return parsed;
};

/**
 * Parses a boolean environment variable
 */
const parseEnvBool = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// ==================== Environment Variables ====================

// Program ID (required)
const rawProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
const programId = validateAndNormalizePublicKey(rawProgramId);

if (!programId) {
  console.error('[env] NEXT_PUBLIC_PROGRAM_ID is required and must be a valid Solana public key');
  console.error('[env] Please copy .env.example to .env.local and set the correct value');
}

// Cluster configuration
const rawCluster = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
const validClusters = ['devnet', 'mainnet', 'mainnet-beta', 'testnet', 'localnet'];
const cluster = validClusters.includes(rawCluster) ? rawCluster : 'devnet';

// RPC URL (optional, overrides cluster default)
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

// Pinata IPFS configuration (optional)
const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

// Feature flags
const debugMode = parseEnvBool('NEXT_PUBLIC_DEBUG_MODE', false);
const enableAnalytics = parseEnvBool('NEXT_PUBLIC_ENABLE_ANALYTICS', false);

// ==================== Cache Configuration ====================

/**
 * Cache Time-To-Live (TTL) configuration
 *
 * These values determine how long data is considered fresh before refetching.
 * Adjust based on your application's data freshness requirements.
 */
export const CACHE_CONFIG = {
  /** Default TTL for all cache entries: 5 minutes */
  DEFAULT: 5 * 60 * 1000,
  
  /** Netbook data: 2 minutes (frequently updated) */
  NETBOOK_DATA: 2 * 60 * 1000,
  
  /** User/role data: 5 minutes (changes infrequently) */
  USER_DATA: 5 * 60 * 1000,
  
  /** Config data: 10 minutes (rarely changes) */
  CONFIG_DATA: 10 * 60 * 1000,
  
  /** Stats data: 1 minute (real-time dashboard) */
  STATS_DATA: 1 * 60 * 1000,
  
  /** Event data: 30 seconds (real-time updates) */
  EVENT_DATA: 30 * 1000,
  
  /** Role requests: 2 minutes */
  ROLE_REQUESTS: 2 * 60 * 1000,
} as const;

// ==================== React Query Configuration ====================

/**
 * React Query default configuration
 */
export const QUERY_CONFIG = {
  /** Time before data is considered stale: 30 seconds */
  staleTime: parseEnvInt('NEXT_PUBLIC_STALE_TIME_MS', 30 * 1000),
  
  /** Maximum time to consider cached data fresh: 10 minutes */
  maxCacheTime: 10 * 60 * 1000,
  
  /** Retry count for failed queries */
  retry: 3,
  
  /** Retry delay in milliseconds */
  retryDelay: 1000,
  
  /** Refetch interval for active queries (0 = disabled) */
  refetchInterval: parseEnvInt('NEXT_PUBLIC_REFETCH_INTERVAL_MS', 0),
  
  /** Refetch on window focus */
  refetchOnWindowFocus: true,
  
  /** Refetch on reconnect */
  refetchOnReconnect: true,
} as const;

// ==================== Solana RPC Configuration ====================

/**
 * Solana RPC connection configuration
 */
export const RPC_CONFIG = {
  /** Commitment level: 'processed', 'confirmed', or 'finalized' */
  commitment: 'confirmed' as const,
  
  /** WebSocket enabled for real-time updates */
  wsEnabled: true,
  
  /** RPC request timeout in milliseconds */
  timeout: 30000,
  
  /** Maximum number of retries for failed requests */
  maxRetries: 3,
} as const;

/**
 * Returns the appropriate RPC URL based on cluster configuration
 */
export const getRpcUrl = (): string => {
  if (rpcUrl) return rpcUrl;
  
  if (cluster === 'mainnet' || cluster === 'mainnet-beta') {
    return 'https://api.mainnet-beta.solana.com';
  }
  
  switch (cluster) {
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'localnet':
      return 'http://localhost:8899';
    default:
      return 'https://api.devnet.solana.com';
  }
};

// ==================== Exported Configuration Object ====================

/**
 * Centralized configuration object for the entire application.
 * All modules should import from this object instead of accessing process.env directly.
 */
export const env = {
  // Program configuration
  PROGRAM_ID: programId,
  CLUSTER: cluster,
  RPC_URL: getRpcUrl(),
  
  // Optional services
  PINATA_API_KEY: pinataApiKey,
  PINATA_SECRET_API_KEY: pinataSecretApiKey,
  
  // Feature flags
  DEBUG_MODE: debugMode,
  ENABLE_ANALYTICS: enableAnalytics,
  
  // Validation
  isConfigured: !!programId,
  
  // Helper methods
  /** Returns true if running in development mode */
  isDev: process.env.NODE_ENV === 'development',
  
  /** Returns true if running in production mode */
  isProd: process.env.NODE_ENV === 'production',
} as const;

// ==================== Validation on Import ====================

/**
 * Validates the environment configuration at startup.
 * Call this function during application initialization to ensure all required
 * environment variables are properly configured.
 */
export const validateEnv = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!env.PROGRAM_ID) {
    errors.push('NEXT_PUBLIC_PROGRAM_ID is missing or invalid');
  }
  
  if (!validClusters.includes(env.CLUSTER)) {
    errors.push(`Invalid cluster: ${env.CLUSTER}. Must be one of: ${validClusters.join(', ')}`);
  }
  
  if (env.PINATA_API_KEY && !env.PINATA_SECRET_API_KEY) {
    errors.push('NEXT_PUBLIC_PINATA_SECRET_API_KEY is required when NEXT_PUBLIC_PINATA_API_KEY is set');
  }
  
  if (env.PINATA_SECRET_API_KEY && !env.PINATA_API_KEY) {
    errors.push('NEXT_PUBLIC_PINATA_API_KEY is required when NEXT_PUBLIC_PINATA_SECRET_API_KEY is set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// ==================== Re-exports for backward compatibility ====================

export const NEXT_PUBLIC_PROGRAM_ID = env.PROGRAM_ID;
export const NEXT_PUBLIC_CLUSTER = env.CLUSTER;
export const NEXT_PUBLIC_RPC_URL = env.RPC_URL;
export const NEXT_PUBLIC_PINATA_API_KEY = env.PINATA_API_KEY;
export const NEXT_PUBLIC_PINATA_SECRET_API_KEY = env.PINATA_SECRET_API_KEY;
export const validatePublicKey = validateAndNormalizePublicKey;
