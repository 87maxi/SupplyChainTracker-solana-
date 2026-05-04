// web/src/services/RoleRequestService.ts
// Service implementation for role requests
// This file handles the complete flow of role requests from UI to blockchain
// Uses the SupplyChainService for direct contract interaction

import { SupplyChainService } from './SupplyChainService';
import { RoleService } from './contracts/role.service';
import { roleMapper, RoleName } from '@/lib/roleMapping';
import { Role } from './contracts/role.service';

// Import the contract constants and ABI
import { ROLE_HASHES } from '@/lib/constants/roles';
import SupplyChainTrackerABI from '@/lib/contracts/abi/SupplyChainTracker.json';

// Import config and env variables
import { config } from '@/lib/wagmi/config';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS, validateAddress } from '@/lib/env';
import { useAccount } from 'wagmi';

/**
 * Helper function to get the currently connected account from the wallet
 * @returns The connected account address or null if not connected
 */
async function getConnectedAccount(): Promise<`0x${string}` | null> {
  if (typeof window === 'undefined' || !window.ethereum) {
    console.error('[RoleRequestService] No ethereum provider found');
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    }) as string[];

    if (!accounts || accounts.length === 0) {
      console.error('[RoleRequestService] No accounts found');
      return null;
    }

    console.log('[RoleRequestService] Connected account:', accounts[0]);
    return accounts[0] as `0x${string}`;
  } catch (error) {
    console.error('[RoleRequestService] Error getting connected account:', error);
    return null;
  }
}

import { RoleRequest } from '@/types/role-request';

// ... imports ...

// Internal storage interface to match what's in localStorage
interface StoredRoleRequest {
  id: string;
  userAddress: string;
  role: string;
  signature: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  transactionHash?: string;
}

// Mock role requests for backward compatibility
// Use an in-memory store for requests
let roleRequests: StoredRoleRequest[] = [];

// ... RoleService creation ...

// Use the role mapper for consistent role name handling
// Use the singleton instance from roleMapping
const roleMapperInstance = roleMapper;

// Initialize with actual data from localStorage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('role_requests');
  if (stored) {
    roleRequests = JSON.parse(stored);
  }
}

// Use the actual SupplyChainService for contract interactions
const supplyChainService = SupplyChainService.getInstance();

export const RoleRequestService = {
  /**
   * Create a new role request on the blockchain
   * @param request Role request details
   * @returns Promise that resolves when the request is created
   */
  async createRequest(request: {
    userAddress: string;
    role: string;
    signature: string;
  }): Promise<void> {
    console.log('[RoleRequestService] Creating blockchain request for role:', request.role);

    // Normalize role name to get the hash
    const normalizedRoleName = roleMapper.normalizeRoleName(request.role);

    // Map normalized role name to the key used in ROLE_HASHES
    const roleKeyMap: Record<string, keyof typeof ROLE_HASHES> = {
      'FABRICANTE_ROLE': 'FABRICANTE',
      'AUDITOR_HW_ROLE': 'AUDITOR_HW',
      'TECNICO_SW_ROLE': 'TECNICO_SW',
      'ESCUELA_ROLE': 'ESCUELA',
      'DEFAULT_ADMIN_ROLE': 'ADMIN'
    };

    const roleKey = roleKeyMap[normalizedRoleName] || 'ADMIN';
    const roleHash = ROLE_HASHES[roleKey];

    const result = await supplyChainService.requestRole(roleHash, request.signature);

    if (!result.success) {
      throw new Error(result.error || 'Error al crear la solicitud en blockchain');
    }

    console.log('[RoleRequestService] Blockchain request created:', result.hash);
  },

  /**
   * Get all role requests from the blockchain
   * @returns All role requests mapped to the shared type
   */
  async getRoleRequests(): Promise<RoleRequest[]> {
    try {
      const count = await supplyChainService.getRoleRequestsCount();
      const requests: RoleRequest[] = [];

      for (let i = 0; i < count; i++) {
        const rawRequest = await supplyChainService.getRoleRequest(i);
        // rawRequest is [id, user, role, status, timestamp, signature]

        const statusMap: Record<number, 'pending' | 'approved' | 'rejected'> = {
          0: 'pending',
          1: 'approved',
          2: 'rejected'
        };

        // Find role name from hash
        const roleHash = rawRequest[2];
        let roleName = 'Unknown';
        for (const [name, hash] of Object.entries(ROLE_HASHES)) {
          if (hash.toLowerCase() === roleHash.toLowerCase()) {
            roleName = name + '_ROLE';
            break;
          }
        }

        requests.push({
          id: rawRequest[0].toString(),
          address: rawRequest[1],
          role: roleName,
          status: statusMap[rawRequest[3]] || 'pending',
          timestamp: new Date(Number(rawRequest[4]) * 1000),
          signature: rawRequest[5]
        });
      }

      return requests;
    } catch (error) {
      console.error('[RoleRequestService] Error fetching role requests:', error);
      return [];
    }
  },

  /**
   * Update status of a role request on the blockchain
   * @param id Request ID (index in the array)
   * @param status New status
   * @returns Promise that resolves when the status is updated
   */
  async updateRoleRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<RoleRequest> {
    const requestId = parseInt(id);
    let result;

    if (status === 'approved') {
      result = await supplyChainService.approveRoleRequest(requestId);
    } else {
      result = await supplyChainService.rejectRoleRequest(requestId);
    }

    if (!result.success) {
      throw new Error(result.error || `Error al ${status === 'approved' ? 'aprobar' : 'rechazar'} la solicitud`);
    }

    // Fetch the updated request to return it
    const rawRequest = await supplyChainService.getRoleRequest(requestId);

    const statusMap: Record<number, 'pending' | 'approved' | 'rejected'> = {
      0: 'pending',
      1: 'approved',
      2: 'rejected'
    };

    // Find role name from hash
    const roleHash = rawRequest[2];
    let roleName = 'Unknown';
    for (const [name, hash] of Object.entries(ROLE_HASHES)) {
      if (hash.toLowerCase() === roleHash.toLowerCase()) {
        roleName = name + '_ROLE';
        break;
      }
    }

    return {
      id: rawRequest[0].toString(),
      address: rawRequest[1],
      role: roleName,
      status: statusMap[rawRequest[3]] || 'pending',
      timestamp: new Date(Number(rawRequest[4]) * 1000),
      signature: rawRequest[5],
      transactionHash: result.hash
    };
  },

  /**
   * Delete a role request (Not supported on blockchain, so we just log it)
   * @param id Request ID
   */
  async deleteRoleRequest(id: string): Promise<void> {
    console.warn('[RoleRequestService] Delete request not supported on blockchain. Use reject instead.');
  }
};

// Export individual functions for backward compatibility
export const getRoleRequests = RoleRequestService.getRoleRequests;
export const updateRoleRequestStatus = RoleRequestService.updateRoleRequestStatus;
export const deleteRoleRequest = RoleRequestService.deleteRoleRequest;
