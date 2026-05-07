// web/src/services/RoleRequestService.ts
// Service implementation for role requests (migrated to Solana)

import { UnifiedSupplyChainService } from './UnifiedSupplyChainService';
import { PublicKey } from '@solana/web3.js';

// Role request interface for UI
export interface RoleRequest {
  id: string;
  address: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
  signature: string;
  transactionHash?: string;
}

// In-memory role requests store (for backward compatibility)
let roleRequests: RoleRequest[] = [];

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('role_requests');
  if (stored) {
    try {
      roleRequests = JSON.parse(stored);
    } catch (e) {
      console.error('[RoleRequestService] Error parsing stored requests:', e);
    }
  }
}

// Get singleton unified service
const getService = (): UnifiedSupplyChainService | null => {
  try {
    return UnifiedSupplyChainService.getInstance();
  } catch {
    return null;
  }
};

export const RoleRequestService = {
  /**
   * Create a new role request on Solana
   */
  createRequest: async (request: {
    userAddress: string;
    role: string;
    signature: string;
  }): Promise<string | null> => {
    console.log('[RoleRequestService] Creating request for role:', request.role);
    
    try {
      const service = getService();
      if (!service) {
        // Store locally if service not available
        const newRequest: RoleRequest = {
          id: Date.now().toString(),
          address: request.userAddress,
          role: request.role,
          status: 'pending',
          timestamp: new Date(),
          signature: request.signature,
        };
        roleRequests.push(newRequest);
        localStorage.setItem('role_requests', JSON.stringify(roleRequests));
        return newRequest.id;
      }
      
      const signature = await service.requestRole(request.role);
      
      // Store in local state for UI
      const newRequest: RoleRequest = {
        id: Date.now().toString(),
        address: request.userAddress,
        role: request.role,
        status: 'pending',
        timestamp: new Date(),
        signature: request.signature,
        transactionHash: signature,
      };
      
      roleRequests.push(newRequest);
      localStorage.setItem('role_requests', JSON.stringify(roleRequests));
      
      console.log('[RoleRequestService] Request created:', signature);
      return signature;
    } catch (error) {
      console.error('[RoleRequestService] Error creating request:', error);
      throw error;
    }
  },

  /**
   * Get all role requests
   */
  getRoleRequests: async (): Promise<RoleRequest[]> => {
    // In a real implementation, you'd fetch from Solana program accounts
    // For now, return local state
    return roleRequests;
  },

  /**
   * Approve a role request
   */
  updateRoleRequestStatus: async (
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<RoleRequest> => {
    const index = roleRequests.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('Request not found');
    }

    const request = roleRequests[index];
    
    try {
      if (status === 'rejected') {
        // For Solana, we might not have a reject function
        // Just update local state
        roleRequests[index] = {
          ...request,
          status,
        };
        localStorage.setItem('role_requests', JSON.stringify(roleRequests));
        return roleRequests[index];
      }
      
      // For approval, you'd need the service to call approveRoleRequest
      // This requires additional implementation based on your program
      roleRequests[index] = {
        ...request,
        status,
      };
      localStorage.setItem('role_requests', JSON.stringify(roleRequests));
      
      return roleRequests[index];
    } catch (error) {
      console.error('[RoleRequestService] Error updating request:', error);
      throw error;
    }
  },

  /**
   * Delete a role request (not supported on Solana, just remove from local state)
   */
  deleteRoleRequest: async (id: string): Promise<void> => {
    console.warn('[RoleRequestService] Delete not supported on Solana. Removing from local state only.');
    roleRequests = roleRequests.filter(r => r.id !== id);
    localStorage.setItem('role_requests', JSON.stringify(roleRequests));
  }
};

// Export individual functions for backward compatibility
export const getRoleRequests = RoleRequestService.getRoleRequests;
export const updateRoleRequestStatus = RoleRequestService.updateRoleRequestStatus;
export const deleteRoleRequest = RoleRequestService.deleteRoleRequest;
