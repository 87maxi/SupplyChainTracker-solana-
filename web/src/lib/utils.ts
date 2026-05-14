import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// Issue #211: Migrated from @solana/web3.js PublicKey to @solana/kit address()
import { address, type Address } from '@solana/kit';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to validate and normalize Solana addresses
export function validateAndNormalizeAddress(addressStr: string): Address {
  if (!addressStr) {
    throw new Error('Address is required');
  }

  try {
    // Validate using @solana/kit address() - throws on invalid base58
    return address(addressStr);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid Solana address: ${addressStr}. ${message}`);
  }
}

// Helper function to truncate wallet addresses (Solana base58)
export function truncateAddress(address: string): string {
  if (!address) return '';
  try {
    validateAndNormalizeAddress(address);
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  } catch (error) {
    console.warn('Invalid address provided to truncateAddress:', address);
    return address; // Return original if invalid
  }
}

// Helper function to format large numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Helper function to format currency (SOL instead of ETH)
export function formatCurrency(amount: number, decimals = 2): string {
  return amount.toFixed(decimals);
}

// Helper function to get Solana explorer URL for a transaction signature
export function getExplorerUrl(signature: string, cluster: string = 'devnet'): string {
  const baseUrl = cluster === 'mainnet-beta' ? 'https://explorer.solana.com' :
    cluster === 'testnet' ? 'https://explorer.solana.com?cluster=testnet' :
      'https://explorer.solana.com?cluster=devnet';
  return `${baseUrl}/tx/${signature}`;
}

// Helper function to get block explorer URL for a Solana public key
export function getAddressExplorerUrl(address: string, cluster: string = 'devnet'): string {
  try {
    validateAndNormalizeAddress(address);
    const baseUrl = cluster === 'mainnet-beta' ? 'https://explorer.solana.com' :
      cluster === 'testnet' ? 'https://explorer.solana.com?cluster=testnet' :
        'https://explorer.solana.com?cluster=devnet';
    return `${baseUrl}/address/${address}`;
  } catch (error) {
    console.warn('Invalid address provided to getAddressExplorerUrl:', address);
    return '';
  }
}

// Helper function to calculate transaction cost in SOL
export function calculateTransactionCost(lamports: number): number {
  return lamports / 1e9; // Convert from lamports to SOL
}

// Helper function to format date to local string
export function formatDate(date: string | number | Date): string {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Serialización segura para JSON que maneja BigInt
 * @param obj Objeto a serializar
 * @returns String JSON
 */
export function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

/**
 * Parsing safe for JSON that handles special cases
 * @param str String to parse
 * @returns Parsed object
 */
export function safeJsonParse<T = any>(str: string): T {
  if (!str) return undefined as T;
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to parse JSON:', str, error);
    return undefined as T;
  }
}