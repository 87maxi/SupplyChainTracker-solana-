import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAddress } from 'viem';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to validate and normalize Ethereum addresses
export function validateAndNormalizeAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }

  try {
    // Use viem's getAddress to validate and normalize the address
    // This will throw if the address is invalid and return the checksummed version
    return getAddress(address);
  } catch (error: any) {
    throw new Error(`Invalid Ethereum address: ${address}. ${error.message}`);
  }
}

// Helper function to truncate wallet addresses
export function truncateAddress(address: string): string {
  if (!address) return '';
  try {
    const normalizedAddress = validateAndNormalizeAddress(address);
    return `${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`;
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

// Helper function to get Etherscan URL for a transaction hash
export function getEtherscanUrl(hash: string, network: string = 'ethereum'): string {
  const baseUrl = network === 'ethereum' ? 'https://etherscan.io' :
    network === 'polygon' ? 'https://polygonscan.com' :
      network === 'sepolia' ? 'https://sepolianscan.io' : 'https://etherscan.io';
  return `${baseUrl}/tx/${hash}`;
}

// Helper function to get block explorer URL for an address
export function getAddressExplorerUrl(address: string, network: string = 'ethereum'): string {
  try {
    const normalizedAddress = validateAndNormalizeAddress(address);
    const baseUrl = network === 'ethereum' ? 'https://etherscan.io' :
      network === 'polygon' ? 'https://polygonscan.com' :
        network === 'sepolia' ? 'https://sepolianscan.io' : 'https://etherscan.io';
    return `${baseUrl}/address/${normalizedAddress}`;
  } catch (error) {
    console.warn('Invalid address provided to getAddressExplorerUrl:', address);
    return '';
  }
}

// Helper function to calculate gas cost in ETH
export function calculateGasCost(gasUsed: number, gasPrice: number): number {
  return (gasUsed * gasPrice) / 1e18; // Convert from wei to ETH
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