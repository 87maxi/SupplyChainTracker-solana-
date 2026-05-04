'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { eventBus, EVENTS } from '@/lib/events';
import { useState } from 'react';
import { RoleRequestService } from '@/services/RoleRequestService';

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

export function useRoleRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch role requests from the blockchain
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.requests,
    queryFn: () => RoleRequestService.getRoleRequests(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Local state for processing requests (optimistic updates)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Add a new role request (now just a wrapper for the service)
  const addRequest = async (request: { userAddress: string; role: string; signature: string }) => {
    try {
      await RoleRequestService.createRequest(request);
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
        const result = await RoleRequestService.updateRoleRequestStatus(requestId, 'approved');

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
        await RoleRequestService.updateRoleRequestStatus(requestId, 'rejected');

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