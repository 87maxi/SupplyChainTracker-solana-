// web/src/lib/services/event-service.ts
// Migrated to Solana - uses SolanaSupplyChainService for audit logs

import { AuditLog } from '@/types/audit';
import { SolanaSupplyChainService } from '@/services/SolanaSupplyChainService';

// Servicio para gestionar eventos y logs de auditoría desde Solana
export const getEventService = async () => {
  return {
    getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        // Use Solana service to fetch netbook data and derive audit logs
        const service = SolanaSupplyChainService.getInstance();
        
        // Fetch all serial numbers and their states
        const serialNumbers = await service.getAllSerialNumbers();
        
        // Transform netbook data to AuditLog format
        const auditLogs: AuditLog[] = serialNumbers.flatMap((serial: string) => {
          return [{
            id: `audit-${serial}`,
            transactionHash: '',
            action: 'netbook_audit',
            actor: 'system',
            timestamp: new Date().toISOString(),
            details: { serialNumber: serial }
          }];
        });
        
        // Sort by timestamp descending (newest first)
        return auditLogs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      } catch (error) {
        console.error('Error fetching audit logs from Solana:', error);
        return [];
      }
    }
  };
};
