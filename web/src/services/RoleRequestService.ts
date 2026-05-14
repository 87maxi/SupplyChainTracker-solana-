// web/src/services/RoleRequestService.ts
// Service implementation for role requests - fully integrated with Solana blockchain
//
// Issue #211: Removed localStorage persistence.
// All role request data is now fetched directly from the Solana blockchain.
// This eliminates stale data risk and ensures a single source of truth.

import { Address } from '@solana/kit';
import { UnifiedSupplyChainService, type RoleRequestData } from './UnifiedSupplyChainService';

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
        throw new Error('UnifiedSupplyChainService not available');
      }

      const signature = await service.requestRole(request.role);

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
        console.warn('[RoleRequestService] Service not available');
        return [];
      }

      // Fetch role requests from Solana blockchain
      const onChainRequests = await service.getRoleRequests();

      // Map on-chain data to UI format
      const mappedRequests: RoleRequest[] = onChainRequests.map((req: RoleRequestData, index: number) => {
        // Determine status from on-chain state (0 = Pending, 1 = Approved, 2 = Rejected)
        let status: 'pending' | 'approved' | 'rejected' = 'pending';
        if (req.status === 1) {
          status = 'approved';
        } else if (req.status === 2) {
          status = 'rejected';
        }

        return {
          id: req.id.toString() ?? `onchain-${index}`,
          address: req.user ?? '',
          role: req.role ?? 'unknown',
          status,
          timestamp: req.timestamp ? new Date(Number(req.timestamp) * 1000) : new Date(),
          signature: '',
          transactionHash: undefined,
        };
      });

      return mappedRequests;
    } catch (error) {
      console.error('[RoleRequestService] Error fetching from Solana:', error);
      return [];
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
    // Fetch current requests to find the one matching the id
    const requests = await RoleRequestService.getRoleRequests();
    const request = requests.find(r => r.id === id);

    if (!request) {
      throw new Error('Request not found');
    }

    try {
      if (status === 'approved') {
        const result = await RoleRequestService.approveRoleRequest(request.address, request.role);
        return {
          ...request,
          status,
          transactionHash: result.transactionHash,
        };
      } else {
        const result = await RoleRequestService.rejectRoleRequest(request.address, request.role);
        return {
          ...request,
          status,
          transactionHash: result.transactionHash,
        };
      }
    } catch (error) {
      console.error('[RoleRequestService] Error updating request:', error);
      throw error;
    }
  },

  /**
   * Delete a role request - not supported on Solana blockchain
   * On-chain data is immutable; use reset_role_request instruction instead
   */
  deleteRoleRequest: async (id: string): Promise<void> => {
    console.warn('[RoleRequestService] Delete not supported on Solana. On-chain data is immutable.');
    // Use reset_role_request if you need to clear the request state
    void id;
  }
};

// Export individual functions for backward compatibility
export const getRoleRequests = RoleRequestService.getRoleRequests;
export const updateRoleRequestStatus = RoleRequestService.updateRoleRequestStatus;
export const deleteRoleRequest = RoleRequestService.deleteRoleRequest;
