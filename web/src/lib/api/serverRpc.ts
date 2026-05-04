'use server';

import { revalidateTag } from 'next/cache';
import * as SupplyChainContract from '@/lib/contracts/SupplyChainContract';

// Use local storage or cache for server-side data
const cache = new Map();

const CACHE_KEY = 'supply-chain-data';
const ROLE_CACHE_KEY = 'role-members';

/**
 * Server-only RPC functions for interacting with the SupplyChain smart contract.
 * These functions run on the server side and use caching for performance.
 */

/**
 * Get all serial numbers from the contract
 * @returns Array of serial numbers
 */
export async function getAllSerialNumbers() {
  // Use cache for performance
  if (cache.has(CACHE_KEY)) {
    console.log('Cache hit for getAllSerialNumbers');
    return cache.get(CACHE_KEY);
  }

  console.log('Cache miss for getAllSerialNumbers');

  try {
    // Fetch from contract
    const serialNumbers = await SupplyChainContract.getAllSerialNumbers();
    cache.set(CACHE_KEY, serialNumbers);
    return serialNumbers;
  } catch (error) {
    console.error('Error getting serial numbers:', error);
    throw error;
  }
}

/**
 * Get detailed netbook report by serial number
 * @param serial - The netbook serial number
 * @returns Netbook report with all details
 */
export async function getNetbookReport(serial: string) {
  try {
    return await SupplyChainContract.getNetbookReport(serial);
  } catch (error) {
    console.error(`Error getting netbook report for ${serial}:`, error);
    throw error;
  }
}

/**
 * Get the current state of a netbook
 * @param serial - The netbook serial number
 * @returns Current state (0=FABRICADA, 1=HW_APROBADO, 2=SW_VALIDADO, 3=DISTRIBUIDA)
 */
export async function getNetbookState(serial: string) {
  console.log(`Getting state for serial: ${serial}`);

  try {
    return await SupplyChainContract.getNetbookState(serial);
  } catch (error) {
    console.error(`Error getting state for ${serial}:`, error);
    throw error;
  }
}

/**
 * Get all netbooks in a specific state
 * @param state - State number (0=FABRICADA, 1=HW_APROBADO, 2=SW_VALIDADO, 3=DISTRIBUIDA)
 * @returns Array of serial numbers in that state
 */
export async function getNetbooksByState(state: number): Promise<string[]> {
  try {
    return await SupplyChainContract.getNetbooksByState(state);
  } catch (error) {
    console.error(`Error getting netbooks for state ${state}:`, error);
    throw error;
  }
}

/**
 * Get all members of a specific role
 * @param roleHash - The keccak256 hash of the role name
 * @returns Array of addresses with that role
 */
export async function getRoleMembers(roleHash: string): Promise<string[]> {
  try {
    return await SupplyChainContract.getAllMembers(roleHash);
  } catch (error) {
    console.error(`Error getting members for role ${roleHash}:`, error);
    throw error;
  }
}

/**
 * Get the count of members in a specific role
 * @param roleHash - The keccak256 hash of the role name
 * @returns Number of members with that role
 */
export async function getRoleMemberCount(roleHash: string): Promise<number> {
  try {
    const count = await SupplyChainContract.getRoleMemberCount(roleHash);
    return Number(count);
  } catch (error) {
    console.error(`Error getting member count for role ${roleHash}:`, error);
    throw error;
  }
}

/**
 * Check if an address has a specific role
 * @param roleHash - The keccak256 hash of the role name
 * @param address - The address to check
 * @returns True if the address has the role, false otherwise
 */
export async function hasRole(roleHash: string, address: string): Promise<boolean> {
  console.log('Server RPC: hasRole', { roleHash, address });
  try {
    return await SupplyChainContract.hasRole(roleHash, address);
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
}

/**
 * Revalidate all cached data and Next.js cache tags
 * Call this after making changes to the contract state
 * 
 * Uses 'max' profile for stale-while-revalidate (SWR) semantics:
 * - Users get stale content immediately
 * - Fresh data is fetched in the background
 * - New data is served on subsequent requests
 */
export async function revalidateAll() {
  cache.clear();
  revalidateTag('dashboard-data', 'max');
  revalidateTag('netbook-state', 'max');
  revalidateTag('serial-numbers', 'max');
  revalidateTag('role-members', 'max');
  console.log('All cache tags revalidated');
}

// serverRpc object export removed to comply with Next.js Server Actions rules
// Use named exports instead