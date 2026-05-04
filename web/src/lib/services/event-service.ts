import { AuditLog } from '@/types/audit';
import { publicClient } from '@/lib/blockchain/client';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';
import { SupplyChainTrackerABI } from '@/lib/contracts/abi';

// Servicio para gestionar eventos y logs de auditoría desde la blockchain
export const getEventService = async () => {
  return {
    getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        // Filter only events from the ABI
        // Convert the JSON ABI to array format if it's an object
        const abiArray = Array.isArray(SupplyChainTrackerABI) ? SupplyChainTrackerABI : Object.values(SupplyChainTrackerABI).flat();
        const eventAbis = abiArray.filter((item: any) => item.type === 'event');
        
        // Fetch events from the blockchain
        const logs = await publicClient.getLogs({
          address: NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`,
          event: {
            name: 'RoleGranted',
            type: 'event',
            inputs: [
              { name: 'role', type: 'bytes32', indexed: true },
              { name: 'account', type: 'address', indexed: true },
              { name: 'sender', type: 'address', indexed: true }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        });
        
        // Also fetch RoleRevoked events
        const revokedLogs = await publicClient.getLogs({
          address: NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`,
          event: {
            name: 'RoleRevoked',
            type: 'event',
            inputs: [
              { name: 'role', type: 'bytes32', indexed: true },
              { name: 'account', type: 'address', indexed: true },
              { name: 'sender', type: 'address', indexed: true }
            ]
          },
          fromBlock: 0n,
          toBlock: 'latest'
        });
        
        // Combine all logs
        const allLogs = [...logs, ...revokedLogs];
        
        // Transform blockchain logs to AuditLog format
        const auditLogs: AuditLog[] = await Promise.all(allLogs.map(async (log: any) => {
          // Get block timestamp
          let timestamp = new Date().toISOString();
          try {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            timestamp = new Date(Number(block.timestamp) * 1000).toISOString();
          } catch (error) {
            console.warn('Could not fetch block timestamp:', error);
          }
          
          return {
            id: `${log.blockNumber}-${log.logIndex}`,
            transactionHash: log.transactionHash,
            action: log.eventName || 'UNKNOWN_EVENT',
            actor: log.args?.account || log.args?.sender || '0x0000000000000000000000000000000000000000',
            timestamp,
            details: JSON.stringify(log.args || {})
          };
        }));
        
        // Sort by timestamp descending (newest first)
        return auditLogs.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      } catch (error) {
        console.error('Error fetching audit logs from blockchain:', error);
        return [];
      }
    }
  };
};