// web/src/hooks/useSupplyChainService.ts
import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Address, formatEther } from 'viem';
import { ContractRoles, ContractRoleName } from '@/types/contract';
import { AllRolesSummary } from '@/types/supply-chain-types';
import { roleMapper } from '@/lib/roleMapping';
import { SupplyChainService } from '@/services/SupplyChainService';
const supplyChainService = SupplyChainService.supplyChainService;


export const useSupplyChainService = () => {
  const { address } = useAccount();

  // Get all serial numbers
  const getAllSerialNumbers = useCallback(async () => {
    try {
      return await supplyChainService.read<string[]>('getAllSerialNumbers', []);
    } catch (error) {
      console.error('Error in getAllSerialNumbers:', error);
      return [];
    }
  }, []);

  // Role hash mapping utility - now uses centralized roleMapper
  // For backward compatibility, this function maintains the same interface
  // but delegates to the centralized roleMapper for consistency
  const getRoleHashForName = useCallback(async (role: ContractRoleName | ContractRoles): Promise<`0x${string}`> => {
    // Si es un ContractRoles completo (FABRICANTE_ROLE), extraer la parte base
    if (role.endsWith('_ROLE')) {
      const roleBase = role.replace('_ROLE', '') as ContractRoleName;
      return await roleMapper.getRoleHash(roleBase);
    }

    // Si es un nombre de rol básico (FABRICANTE)
    return await roleMapper.getRoleHash(role);
  }, []);



  // Read operations
  const hasRole = useCallback(async (role: ContractRoles | ContractRoleName, userAddress: Address): Promise<boolean> => {
    try {
      const roleHash = await getRoleHashForName(role);
      return await supplyChainService.hasRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error in hasRole:', error);
      return false;
    }
  }, [getRoleHashForName]);

  // New: Direct role check by hash
  const hasRoleByHash = useCallback(async (roleHash: `0x${string}`, userAddress: Address): Promise<boolean> => {
    try {
      return await supplyChainService.hasRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error in hasRoleByHash:', error);
      return false;
    }
  }, []);

  const getRoleCounts = useCallback(async () => {
    try {
      return await supplyChainService.getRoleCounts();
    } catch (error) {
      console.error('Error in getRoleCounts:', error);
      return {};
    }
  }, []);



  const getRoleMembers = useCallback(async (role: ContractRoleName | ContractRoles) => {
    try {
      const roleHash = await getRoleHashForName(role);
      const members = await supplyChainService.read<string[]>('getAllMembers', [roleHash]);
      const roleName = typeof role === 'string' && role.endsWith('_ROLE') ? role : `${role}_ROLE`;
      return {
        role: roleName as ContractRoles,
        members,
        count: members.length
      };
    } catch (error) {
      console.error('Error in getRoleMembers:', error);
      return { role: 'DEFAULT_ADMIN_ROLE', members: [], count: 0 };
    }
  }, [getRoleHashForName]);

  const getAllRolesSummary = useCallback(async (forceRefresh = false): Promise<AllRolesSummary | null> => {
    try {
      const CACHE_KEY = 'supply_chain_roles_summary';
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      // 1. Try to load from localStorage first
      if (typeof window !== 'undefined' && !forceRefresh) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
              return data as AllRolesSummary;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // 2. Fetch fresh data
      const roleHashes = await import('@/lib/roleUtils').then(({ getRoleHashes }) => getRoleHashes());

      // Map roleUtils keys (FABRICANTE) to ContractRoles (FABRICANTE_ROLE)
      const roleMapping: Record<keyof typeof roleHashes, ContractRoles> = {
        FABRICANTE: 'FABRICANTE_ROLE',
        AUDITOR_HW: 'AUDITOR_HW_ROLE',
        TECNICO_SW: 'TECNICO_SW_ROLE',
        ESCUELA: 'ESCUELA_ROLE',
        ADMIN: 'DEFAULT_ADMIN_ROLE'
      };

      const roleEntries = Object.entries(roleHashes) as [keyof typeof roleHashes, `0x${string}`][];

      // Fetch all role members concurrently
      const roleResults = await Promise.all(
        roleEntries.map(async ([key, hash]) => {
          try {
            // Usar el método correcto del contrato para obtener miembros
            const members = await supplyChainService.read<string[]>('getAllMembers', [hash]);
            // Convert member addresses to checksummed format
            const checksummedMembers = members.map(address => {
              try {
                return address.toLowerCase().replace('0x', '0x').trim();
              } catch (e) {
                console.warn('Invalid address format:', address);
                return address;
              }
            });
            const contractRoleName = roleMapping[key];

            return [
              contractRoleName,
              {
                count: checksummedMembers.length,
                members: checksummedMembers
              }
            ] as const;
          } catch (error) {
            console.error(`Error fetching members for role ${key}:`, error);
            const contractRoleName = roleMapping[key];
            return [
              contractRoleName,
              {
                count: 0,
                members: []
              }
            ] as const;
          }
        })
      );

      // Convert to object format
      const summary = Object.fromEntries(roleResults) as AllRolesSummary;

      // Cache the result
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            data: summary,
            timestamp: Date.now()
          })
        );
      }

      return summary;
    } catch (error) {
      console.error('Error in getAllRolesSummary:', error);
      return null;
    }
  }, [getRoleHashForName]);

  // Netbook operations
  const getNetbookState = useCallback(async (serial: string) => {
    try {
      return await supplyChainService.getNetbookState(serial);
    } catch (error) {
      console.error('Error in getNetbookState:', error);
      return 'FABRICADA';
    }
  }, []);

  const getNetbookReport = useCallback(async (serial: string) => {
    try {
      return await supplyChainService.getNetbookReport(serial);
    } catch (error) {
      console.error('Error in getNetbookReport:', error);
      return null;
    }
  }, []);

  // Write operations - these require wallet connection and return promise with transaction hash
  const grantRole = useCallback(async (roleName: ContractRoles | ContractRoleName, userAddress: Address) => {
    try {
      const roleHash = await getRoleHashForName(roleName);
      return await supplyChainService.grantRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error in grantRole:', error);
      throw error;
    }
  }, [getRoleHashForName]);

  // Grant role by hash directly
  const grantRoleByHash = useCallback(async (roleHash: `0x${string}`, userAddress: Address) => {
    try {
      return await supplyChainService.grantRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error in grantRoleByHash:', error);
      throw error;
    }
  }, []);

  const revokeRole = useCallback(async (roleHash: `0x${string}`, userAddress: Address) => {
    try {
      return await supplyChainService.revokeRole(roleHash, userAddress);
    } catch (error) {
      console.error('Error in revokeRole:', error);
      throw error;
    }
  }, []);

  // Netbook operations
  const auditHardware = useCallback(async (serial: string, passed: boolean, reportHash: string, metadata: string) => {
    try {
      const result = await supplyChainService.auditHardware(serial, passed, reportHash, metadata);
      return result;
    } catch (error) {
      console.error('Error in auditHardware:', error);
      return { success: false, error: (error as Error).message };
    }
  }, []);

  const registerNetbooks = useCallback(async (serials: string[], batches: string[], specs: string[], metadata: string[]) => {
    try {
      const result = await supplyChainService.registerNetbooks(serials, batches, specs, metadata);
      return result;
    } catch (error) {
      console.error('Error in registerNetbooks:', error);
      return { success: false, error: (error as Error).message };
    }
  }, []);

  // Netbook operations
  const validateSoftware = useCallback(async (serial: string, osVersion: string, passed: boolean, metadata: string) => {
    try {
      const result = await supplyChainService.validateSoftware(serial, osVersion, passed, metadata);
      return result;
    } catch (error) {
      console.error('Error in validateSoftware:', error);
      return { success: false, error: (error as Error).message };
    }
  }, []);

  // Netbook operations
  const assignToStudent = useCallback(async (serial: string, schoolHash: string, studentHash: string, metadata: string) => {
    try {
      const result = await supplyChainService.assignToStudent(serial, schoolHash, studentHash, metadata);
      return result;
    } catch (error) {
      console.error('Error in assignToStudent:', error);
      return { success: false, error: (error as Error).message };
    }
  }, []);

  // Balance operations
  const getAccountBalance = useCallback(async (userAddress: Address): Promise<string> => {
    try {
      // Use wagmi to get balance directly from blockchain
      const { publicClient } = await import('@/lib/blockchain/client');
      const balance = await publicClient.getBalance({ address: userAddress });
      return formatEther(balance);
    } catch (error) {
      console.error('Error in getAccountBalance:', error);
      return '0';
    }
  }, []);

  // Connection check
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await supplyChainService.checkConnection();
    } catch (error) {
      console.error('Error checking connection:', error);
      return false;
    }
  }, []);

  // Export all functions
  return {
    getRoleHashForName,
    hasRole,
    hasRoleByHash,
    getRoleCounts,
    getAccountBalance,
    getRoleMembers,
    getAllRolesSummary,
    getAllSerialNumbers,
    getNetbookState,
    getNetbookReport,
    grantRole,
    grantRoleByHash,
    revokeRole,
    auditHardware,
    registerNetbooks,
    validateSoftware,
    assignToStudent,
    checkConnection
  };
};