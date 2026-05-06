/**
 * Servicio para gestionar eventos y logs de auditoría desde Solana
 * Migrado de Ethereum/Viem a Solana/Anchor
 */

import { AuditLog } from '@/types/audit';
import { connection } from '@/lib/solana/connection';
import { PROGRAM_ID } from '@/lib/contracts/solana-program';

/**
 * Obtener eventos del programa SupplyChain
 */
export const getEventService = async () => {
  return {
    /**
     * Obtener logs de auditoría desde eventos de Solana
     */
    getAuditLogs: async (): Promise<AuditLog[]> => {
      try {
        // Buscar transactions del programa en los últimos bloques
        const programSignatures = await connection.getSignaturesForAddress(
          PROGRAM_ID,
          { limit: 100 },
          'confirmed'
        );

        // Transformar signatures a AuditLog format
        const auditLogs: AuditLog[] = programSignatures
          .map((sigInfo, index) => ({
            id: `${sigInfo.signature}-${index}`,
            transactionHash: sigInfo.signature,
            action: sigInfo.err ? 'ERROR' : 'TRANSACTION',
            actor: sigInfo.memo || 'UNKNOWN',
            timestamp: new Date(sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now()).toISOString(),
            details: {
              slot: sigInfo.slot,
              err: sigInfo.err,
              confirmationStatus: sigInfo.confirmationStatus,
            }
          }))
          .sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

        return auditLogs;
      } catch {
        return [];
      }
    },

    /**
     * Obtener eventos específicos del programa
     */
    getProgramEvents: async () => {
      try {
        // Obtener account changes para el programa
        const signatures = await connection.getSignaturesForAddress(
          PROGRAM_ID,
          { limit: 50 },
          'confirmed'
        );

        return signatures.map((sig) => ({
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime,
          err: sig.err,
        }));
      } catch {
        return [];
      }
    },
  };
};
