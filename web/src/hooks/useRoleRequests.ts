'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { eventBus, EVENTS } from '@/lib/events';
import { useState } from 'react';
import { Address } from '@solana/kit';
import { UnifiedSupplyChainService, type RoleRequestData } from '@/services/UnifiedSupplyChainService';

// Types for role requests
export interface RoleRequest {
  id: string;
  address: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  timestamp: Date;
  signature?: string;
  transactionHash?: string;
}

// Keys for React Query
const QUERY_KEYS = {
  requests: ['roleRequests'],
};

// ==================== Inline RoleRequestService logic ====================

/**
 * Get the unified service instance.
 */
const getService = (): UnifiedSupplyChainService | null => {
  try {
    return UnifiedSupplyChainService.getInstance();
  } catch {
    return null;
  }
};

/**
 * Fetch all role requests from the blockchain and map to UI format.
 */
const fetchRoleRequests = async (): Promise<RoleRequest[]> => {
  try {
    const service = getService();
    if (!service) {
      console.warn('[useRoleRequests] Service not available');
      return [];
    }

    const onChainRequests = await service.getRoleRequests();

    return onChainRequests.map((req: RoleRequestData, index: number) => {
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
  } catch (error) {
    console.error('[useRoleRequests] Error fetching from Solana:', error);
    return [];
  }
};

/**
 * Create a new role request on Solana.
 */
const createRoleRequest = async (request: {
  userAddress: string;
  role: string;
  signature: string;
}): Promise<string | null> => {
  const service = getService();
  if (!service) {
    throw new Error('UnifiedSupplyChainService not available');
  }

  const signature = await service.requestRole(request.role);
  return signature;
};

/**
 * Approve a role request on Solana.
 */
const approveRoleRequest = async (
  userAddress: string,
  role: string
): Promise<{ transactionHash: string }> => {
  const service = getService();
  if (!service) {
    throw new Error('Service not available for on-chain approval');
  }

  const txHash = await service.approveRoleRequest(role, userAddress as Address);
  return { transactionHash: txHash };
};

/**
 * Reject a role request on Solana.
 */
const rejectRoleRequest = async (
  userAddress: string,
  role: string
): Promise<{ transactionHash: string }> => {
  const service = getService();
  if (!service) {
    throw new Error('Service not available for on-chain rejection');
  }

  const txHash = await service.rejectRoleRequest(role, userAddress as Address);
  return { transactionHash: txHash };
};

/**
 * Update role request status by id — finds the request, then approves/rejects.
 */
const updateRoleRequestStatus = async (
  id: string,
  status: 'approved' | 'rejected'
): Promise<RoleRequest> => {
  const requests = await fetchRoleRequests();
  const request = requests.find(r => r.id === id);

  if (!request) {
    throw new Error('Request not found');
  }

  if (status === 'approved') {
    const result = await approveRoleRequest(request.address, request.role);
    return {
      ...request,
      status,
      transactionHash: result.transactionHash,
    };
  } else {
    const result = await rejectRoleRequest(request.address, request.role);
    return {
      ...request,
      status,
      transactionHash: result.transactionHash,
    };
  }
};

// ==================== Hook ====================

export function useRoleRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch role requests from the blockchain
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.requests,
    queryFn: () => fetchRoleRequests(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Local state for processing requests (optimistic updates)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Add a new role request
  const addRequest = async (request: { userAddress: string; role: string; signature: string }) => {
    try {
      await createRoleRequest(request);
      refetch();
      toast({
        title: "Solicitud enviada",
        description: `Tu solicitud para el rol ${request.role} ha sido registrada en la blockchain.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    }
  };

  // Approve a role request
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, role, userAddress }: { requestId: string, role: string, userAddress: string }) => {
      console.log(`[useRoleRequests] Approving request ${requestId}...`);

      setProcessingIds(prev => new Set(prev).add(requestId));

      try {
        const result = await updateRoleRequestStatus(requestId, 'approved');

        toast({
          title: 'Confirmado en Blockchain',
          description: `La asignación de rol ha sido confirmada. Tx: ${result.transactionHash?.slice(0, 10)}...`,
        });

        // Invalidate cached role data
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['userRoles'] });
        queryClient.invalidateQueries({ queryKey: ['roleMembers'] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests });

        // Emit event
        eventBus.emit(EVENTS.ROLE_UPDATED, { address: userAddress, role });

        return result;
      } catch (error: any) {
        console.error('[useRoleRequests] Failed to approve role request:', error);
        throw error;
      } finally {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Error al aprobar',
        description: err.message || 'La operación falló.',
        variant: 'destructive',
      });
    },
  });

  // Reject a role request
  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      setProcessingIds(prev => new Set(prev).add(requestId));

      try {
        await updateRoleRequestStatus(requestId, 'rejected');

        toast({
          title: 'Solicitud rechazada',
          description: 'La solicitud ha sido rechazada en la blockchain.',
        });

        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests });
      } catch (error: any) {
        console.error('[useRoleRequests] Failed to reject role request:', error);
        throw error;
      } finally {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: 'Error al rechazar',
        description: err.message || 'No se pudo rechazar la solicitud.',
        variant: 'destructive',
      });
    },
  });

  // Delete a role request (Reject on blockchain)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return rejectMutation.mutateAsync(id);
    }
  });

  return {
    requests,
    isLoading,
    processingIds,
    addRequest,
    approveMutation,
    rejectMutation,
    deleteMutation,
    refetch
  };
}

// Re-export types
export type { RoleRequest as RoleRequestType };

// Export helper functions for DashboardOverview (Phase 3b compatibility)
export { fetchRoleRequests, updateRoleRequestStatus };
