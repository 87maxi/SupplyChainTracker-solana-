import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to validate Solana addresses (base58 format)
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // Solana addresses are base58 encoded and 32-44 characters long
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Helper function to validate and normalize Solana addresses
export function validateAndNormalizeAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }

  if (!isValidSolanaAddress(address)) {
    throw new Error(`Invalid Solana address: ${address}`);
  }
  
  return address;
}

// Helper function to truncate wallet addresses
export function truncateAddress(address: string): string {
  if (!address) return '';
  try {
    const normalizedAddress = validateAndNormalizeAddress(address);
    return `${normalizedAddress.slice(0, 4)}...${normalizedAddress.slice(-4)}`;
  } catch (error) {
    console.warn('Invalid address provided to truncateAddress:', address);
    return address; // Return original if invalid
  }
}

// Helper function to format large numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Helper function to format currency
export function formatCurrency(amount: number, decimals = 2): string {
  return amount.toFixed(decimals);
}

// Helper function to get Solana Explorer URL for a transaction hash
export function getExplorerUrl(hash: string, cluster: 'devnet' | 'mainnet' | 'testnet' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${hash}?cluster=${cluster}`;
}

// Helper function to get Solana Explorer URL for an address
export function getAddressExplorerUrl(address: string, cluster: 'devnet' | 'mainnet' | 'testnet' = 'devnet'): string {
  try {
    const normalizedAddress = validateAndNormalizeAddress(address);
    return `https://explorer.solana.com/address/${normalizedAddress}?cluster=${cluster}`;
  } catch (error) {
    console.warn('Invalid address provided to getAddressExplorerUrl:', address);
    return '';
  }
}

// Helper function to calculate transaction fee in SOL
export function calculateTransactionFee(lamports: number): number {
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

// Helper function to format relative time
export function formatRelativeTime(date: string | number | Date): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'hace un momento';
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays < 7) return `hace ${diffDays} días`;
  
  return formatDate(date);
}

// Helper function to safely parse JSON
export function safeJsonParse<T = any>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', json, error);
    return null;
  }
}

// Helper function to safely stringify JSON
export function safeJsonStringify(obj: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string {
  try {
    return JSON.stringify(obj, replacer, space);
  } catch (error) {
    console.warn('Failed to stringify JSON:', obj, error);
    return '{}';
  }
}

// Helper function to generate random ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper function to debounce
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
