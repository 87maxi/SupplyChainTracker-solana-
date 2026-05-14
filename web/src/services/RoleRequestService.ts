// web/src/services/RoleRequestService.ts
// Service implementation for role requests - fully integrated with Solana blockchain

import { Address } from '@solana/kit';
import { UnifiedSupplyChainService } from './UnifiedSupplyChainService';

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

// In-memory role requests store (for backward compatibility with local fallback)
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

      console.log('[RoleRequestService] Request created on-chain:', signature);
      return signature;
    } catch (error) {
      console.error('[RoleRequestService] Error creating request:', error);
      throw error;
    }
  },

  /**
   * Get all role requests - fetches from Solana blockchain
   */
  getRoleRequests: async (): Promise<RoleRequest[]> => {
    try {
      const service = getService();
      if (!service) {
        console.warn('[RoleRequestService] Service not available, returning local state');
        return roleRequests;
      }

      // Fetch role requests from Solana blockchain
      const onChainRequests = await service.getRoleRequests();

      // Map on-chain data to UI format
      const mappedRequests: RoleRequest[] = onChainRequests.map((req: any, index: number) => {
        // Determine status from on-chain state
        let status: 'pending' | 'approved' | 'rejected' = 'pending';
        if (req.status === 'Approved' || req.status === 'approved') {
          status = 'approved';
        } else if (req.status === 'Rejected' || req.status === 'rejected') {
          status = 'rejected';
        }

        return {
          id: req.id?.toString() ?? `onchain-${index}`,
          address: req.user?.toString() ?? '',
          role: req.role ?? 'unknown',
          status,
          timestamp: req.createdAt ? new Date(Number(req.createdAt) * 1000) : new Date(),
          signature: req.signature ?? '',
          transactionHash: req.transactionHash,
        };
      });

      // Merge with local requests that aren't on-chain yet
      const onChainIds = new Set(mappedRequests.map((r: RoleRequest) => r.id));
      const localOnly = roleRequests.filter((r: RoleRequest) => !onChainIds.has(r.id));

      return [...mappedRequests, ...localOnly];
    } catch (error) {
      console.error('[RoleRequestService] Error fetching from Solana:', error);
      // Fallback to local state
      return roleRequests;
    }
  },

  /**
   * Approve a role request - calls Solana blockchain
   */
  approveRoleRequest: async (
    userAddress: string,
    role: string
  ): Promise<{ transactionHash: string }> => {
    console.log('[RoleRequestService] Approving role request for user:', userAddress, 'role:', role);

    try {
      const service = getService();
      if (!service) {
        throw new Error('Service not available for on-chain approval');
      }

      const txHash = await service.approveRoleRequest(role, userAddress as Address);

      // Update local state
      const index = roleRequests.findIndex(r => r.address === userAddress && r.role === role);
      if (index !== -1) {
        roleRequests[index] = {
          ...roleRequests[index],
          status: 'approved',
          transactionHash: txHash,
        };
        localStorage.setItem('role_requests', JSON.stringify(roleRequests));
      }

      console.log('[RoleRequestService] Role approved on-chain:', txHash);
      return { transactionHash: txHash };
    } catch (error) {
      console.error('[RoleRequestService] Error approving role request:', error);
      throw error;
    }
  },

  /**
   * Reject a role request - calls Solana blockchain
   */
  rejectRoleRequest: async (
    userAddress: string,
    role: string
  ): Promise<{ transactionHash: string }> => {
    console.log('[RoleRequestService] Rejecting role request for user:', userAddress, 'role:', role);

    try {
      const service = getService();
      if (!service) {
        throw new Error('Service not available for on-chain rejection');
      }

      const txHash = await service.rejectRoleRequest(role, userAddress as Address);

      // Update local state
      const index = roleRequests.findIndex(r => r.address === userAddress && r.role === role);
      if (index !== -1) {
        roleRequests[index] = {
          ...roleRequests[index],
          status: 'rejected',
          transactionHash: txHash,
        };
        localStorage.setItem('role_requests', JSON.stringify(roleRequests));
      }

      console.log('[RoleRequestService] Role rejected on-chain:', txHash);
      return { transactionHash: txHash };
    } catch (error) {
      console.error('[RoleRequestService] Error rejecting role request:', error);
      throw error;
    }
  },

  /**
   * Update role request status - delegates to approve/reject methods
   * Maintained for backward compatibility
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
      if (status === 'approved') {
        const result = await RoleRequestService.approveRoleRequest(request.address, request.role);
        roleRequests[index] = {
          ...request,
          status,
          transactionHash: result.transactionHash,
        };
      } else {
        const result = await RoleRequestService.rejectRoleRequest(request.address, request.role);
        roleRequests[index] = {
          ...request,
          status,
          transactionHash: result.transactionHash,
        };
      }

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
