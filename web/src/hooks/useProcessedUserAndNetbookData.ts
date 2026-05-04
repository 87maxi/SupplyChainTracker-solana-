import { useState, useEffect, useCallback } from 'react';
import { Netbook } from '@/types/supply-chain-types';
import { SupplyChainService } from '@/services/SupplyChainService';

interface ProcessedData {
  users: Array<{
    _id: string;
    address: string;
    role: string;
    status: string;
    approvedAt?: string;
    requestedOn: string;
    eventName?: string;
    timestamp?: string;
  }>;
  netbooks: Netbook[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para obtener y procesar datos combinados de usuarios y netbooks desde la Blockchain
 */
export const useProcessedUserAndNetbookData = (): ProcessedData => {
  const [users, setUsers] = useState<ProcessedData['users']>([]);
  const [netbooks, setNetbooks] = useState<Netbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const service = SupplyChainService.getInstance();

      // 1. Obtener todos los números de serie
      const serials = await service.getAllSerialNumbers();

      // 2. Obtener detalles de cada netbook
      const netbookPromises = serials.map(async (serial) => {
        try {
          // Obtenemos el reporte crudo del contrato
          const report: any = await service.getNetbookReport(serial);

          // Mapeo de estados (enum a string)
          const states = ['FABRICADA', 'HW_APROBADO', 'SW_VALIDADO', 'DISTRIBUIDA'];

          // Robust mapping: handle both array (positional) and object (named) returns
          const getVal = (obj: any, key: string, index: number) => {
            if (Array.isArray(obj)) return obj[index];
            return obj[key];
          };

          const currentStateNum = Number(getVal(report, 'currentState', 12));
          const currentStateStr = states[currentStateNum] || 'UNKNOWN';

          // Mapeo al tipo Netbook de la UI
          return {
            serialNumber: getVal(report, 'serialNumber', 0),
            batchId: getVal(report, 'batchId', 1),
            initialModelSpecs: getVal(report, 'initialModelSpecs', 2),
            hwAuditor: getVal(report, 'hwAuditor', 3),
            hwIntegrityPassed: getVal(report, 'hwIntegrityPassed', 4),
            hwReportHash: getVal(report, 'hwReportHash', 5),
            swTechnician: getVal(report, 'swTechnician', 6),
            osVersion: getVal(report, 'osVersion', 7),
            swValidationPassed: getVal(report, 'swValidationPassed', 8),
            destinationSchoolHash: getVal(report, 'destinationSchoolHash', 9),
            studentIdHash: getVal(report, 'studentIdHash', 10),
            distributionTimestamp: getVal(report, 'distributionTimestamp', 11).toString(),
            currentState: currentStateStr
          } as Netbook;
        } catch (e) {
          console.error(`Error fetching report for ${serial}:`, e);
          return null;
        }
      });

      const fetchedNetbooks = (await Promise.all(netbookPromises)).filter((n): n is Netbook => n !== null);

      // Ordenar por timestamp descendente (más recientes primero)
      fetchedNetbooks.sort((a, b) => {
        const timeA = Number(a.distributionTimestamp);
        const timeB = Number(b.distributionTimestamp);
        return timeB - timeA;
      });

      setNetbooks(fetchedNetbooks);

      // 3. Obtener todos los usuarios por rol
      const roleNames = ['ADMIN', 'FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'];
      const userMap = new Map<string, any>();

      await Promise.all(roleNames.map(async (roleName) => {
        try {
          const roleHash = await service.getRoleByName(roleName);
          const members = await service.getAllMembers(roleHash);

          members.forEach(address => {
            const existing = userMap.get(address);
            const roleLabel = roleName.replace('_ROLE', '');

            if (existing) {
              if (!existing.role.includes(roleLabel)) {
                existing.role = `${existing.role}, ${roleLabel}`;
              }
            } else {
              userMap.set(address, {
                _id: address,
                address: address,
                role: roleLabel,
                status: 'active',
                requestedOn: new Date().toISOString(), // Fallback ya que no tenemos el evento exacto aquí
              });
            }
          });
        } catch (e) {
          console.error(`Error fetching members for role ${roleName}:`, e);
        }
      }));

      setUsers(Array.from(userMap.values()));

    } catch (err) {
      console.error('Error fetching blockchain data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    users,
    netbooks,
    isLoading,
    error,
    refetch: fetchData
  };
};