import { config } from '@/lib/wagmi/config';
import { readContract, writeContract } from '@wagmi/core';
import { formatEther } from 'viem';
import { RoleMap } from '@/lib/roleUtils';
import { validateAndNormalizeAddress } from '@/lib/env';

// Importar el ABi y la dirección del contrato
import SupplyChainTrackerABI from '@/lib/contracts/abi/SupplyChainTracker.json';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';

const contractAddress = NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`;

// Aseguramos que el ABI esté en formato de array
const abi = Array.isArray(SupplyChainTrackerABI) ? SupplyChainTrackerABI : Object.values(SupplyChainTrackerABI).flat();

// Función para obtener todos los números de serie
export async function getAllSerialNumbers(): Promise<string[]> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getAllSerialNumbers',
      args: []
    });
    return result as string[];
  } catch (error) {
    console.error('Error al obtener números de serie:', error);
    throw error;
  }
}

// Función para obtener el estado de una netbook
export async function getNetbookState(serial: string): Promise<number> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getNetbookState',
      args: [serial]
    });
    return result as number;
  } catch (error) {
    console.error('Error al obtener estado de netbook:', error);
    throw error;
  }
}

// Función para obtener el reporte de una netbook
import type { Netbook } from '@/types/supply-chain-types'; // Tipo para el reporte de netbook
import type { Address } from 'viem';

export async function getNetbookReport(serial: string): Promise<Netbook> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getNetbookReport',
      args: [serial]
    });
    return result;
  } catch (error) {
    console.error('Error al obtener reporte de netbook:', error);
    throw error;
  }
}

// Función para registrar netbooks
export async function registerNetbooks(
  serials: string[], 
  batches: string[], 
  specs: string[]
): Promise<string> {
  try {
    const result = await writeContract(config, {
      address: contractAddress,
      abi,
      functionName: 'registerNetbooks',
      args: [serials, batches, specs]
    });
    
    // Simular transacción exitosa
    return result as `0x${string}`;
  } catch (error) {
    console.error('Error al registrar netbooks:', error);
    throw error;
  }
}

// Función para auditar hardware
export async function auditHardware(
  serial: string, 
  passed: boolean, 
  reportHash: string
): Promise<string> {
  try {
    const result = await writeContract(config, {
      address: contractAddress,
      abi,
      functionName: 'auditHardware',
      args: [serial, passed, reportHash as `0x${string}`]
    });
    
    // Simular transacción exitosa
    return result as `0x${string}`;
  } catch (error) {
    console.error('Error al auditar hardware:', error);
    throw error;
  }
}

// Función para validar software
export async function validateSoftware(
  serial: string, 
  osVersion: string, 
  passed: boolean
): Promise<string> {
  try {
    const result = await writeContract(config, {
      address: contractAddress,
      abi,
      functionName: 'validateSoftware',
      args: [serial, osVersion, passed]
    });
    
    // Simular transacción exitosa
    return result as `0x${string}`;
  } catch (error) {
    console.error('Error al validar software:', error);
    throw error;
  }
}

// Función para asignar a estudiante
export async function assignToStudent(
  serial: string, 
  schoolHash: string, 
  studentHash: string
): Promise<string> {
  try {
    const result = await writeContract(config, {
      address: contractAddress,
      abi,
      functionName: 'assignToStudent',
      args: [serial, schoolHash as `0x${string}`, studentHash as `0x${string}`]
    });
    
    // Simular transacción exitosa
    return result as `0x${string}`;
  } catch (error) {
    console.error('Error al asignar a estudiante:', error);
    throw error;
  }
}

// Función para obtener netbooks en un estado específico
export async function getNetbooksByState(state: number): Promise<string[]> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getNetbooksByState',
      args: [state]
    });
    return result as string[];
  } catch (error) {
    console.error('Error al obtener netbooks en estado:', error);
    throw error;
  }
}

// Función para obtener miembros de un rol
export async function getAllMembers(roleHash: `0x${string}`): Promise<string[]> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getAllMembers',
      args: [roleHash]
    });
    return result as string[];
  } catch (error) {
    console.error('Error al obtener miembros del rol:', error);
    throw error;
  }
}

// Función para obtener conteo de miembros de un rol
export async function getRoleMemberCount(roleHash: `0x${string}`): Promise<number> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'getRoleMemberCount',
      args: [roleHash]
    });
    return result as number;
  } catch (error) {
    console.error('Error al obtener conteo de miembros del rol:', error);
    throw error;
  }
}

// Función para verificar si una cuenta tiene un rol
export async function hasRole(roleHash: `0x${string}`, address: Address): Promise<boolean> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi,
      functionName: 'hasRole',
      args: [roleHash, address]
    });
    return result as boolean;
  } catch (error) {
    console.error('Error al verificar rol:', error);
    return false;
  }
}

