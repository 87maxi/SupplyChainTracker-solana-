/**
 * Wrapper para operaciones del programa SupplyChain en Solana
 * Este módulo proporciona funciones de conveniencia para interactuar
 * con el programa Anchor desde los componentes del frontend
 * 
 * Migrado de Ethereum/Viem a Solana/Anchor
 */

import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { getProgram, getProvider, PROGRAM_ID } from '@/lib/contracts/solana-program';
import { connection } from '@/lib/solana/connection';

// ==================== Utilidades ====================

/**
 * Obtener provider desde wallet y connection
 */
export function createProvider(wallet: any, conn?: Connection): AnchorProvider | null {
  const connectionToUse = conn || connection;
  if (!wallet) return null;
  
  return new AnchorProvider(
    connectionToUse,
    wallet as any,
    { commitment: 'confirmed' }
  );
}

/**
 * Obtener instancia del programa
 */
export function getSupplyChainProgram(provider: AnchorProvider): Program<any> {
  return getProgram(provider);
}

// ==================== Funciones de Consulta ====================

/**
 * Obtener todos los serial numbers registrados
 */
export async function getAllSerialNumbers(): Promise<string[]> {
  try {
    // Buscar todas las cuentas de Netbook
    // Esto es una implementación simplificada
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtener el estado actual de una netbook
 */
export async function getNetbookState(serial: string): Promise<number> {
  try {
    // En producción, buscar por serial number
    return 0; // Estado por defecto: FABRICADA
  } catch {
    return 0;
  }
}

/**
 * Obtener netbooks por estado
 */
export async function getNetbooksByState(state: number): Promise<string[]> {
  try {
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtener reporte detallado de una netbook
 */
export async function getNetbookReport(serial: string): Promise<any> {
  try {
    return null;
  } catch {
    return null;
  }
}

// ==================== Funciones de Roles ====================

/**
 * Obtener todos los miembros de un rol
 */
export async function getAllMembers(roleHash: string): Promise<string[]> {
  try {
    const configPda = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    )[0];

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return [];

    // Parsear datos del account (simplificado)
    return [];
  } catch {
    return [];
  }
}

/**
 * Obtener conteo de miembros de un rol
 */
export async function getRoleMemberCount(roleHash: string): Promise<number> {
  try {
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Verificar si una dirección tiene un rol específico
 */
export async function hasRole(roleHash: string, address: string): Promise<boolean> {
  try {
    if (!address) return false;
    
    const configPda = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      PROGRAM_ID
    )[0];

    const accountInfo = await connection.getAccountInfo(configPda);
    if (!accountInfo) return false;

    const userPubkey = new PublicKey(address);
    const userBuffer = userPubkey.toBuffer();
    const data = accountInfo.data;

    // Verificar contra cada rol registrado
    if (data.length >= 128) {
      const roles = [
        data.slice(0, 32),      // Fabricante
        data.slice(32, 64),     // Auditor HW
        data.slice(64, 96),     // Tecnico SW
        data.slice(96, 128),    // Escuela
      ];

      return roles.some(role => role.every((byte, i) => byte === userBuffer[i]));
    }

    return false;
  } catch {
    return false;
  }
}

// ==================== Operaciones de Transacción ====================

/**
 * Registrar netbooks en batch
 */
export async function registerNetbooks(
  serials: string[],
  batches: string[],
  specs: string[]
): Promise<string> {
  throw new Error('registerNetbooks requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Auditar hardware
 */
export async function auditHardware(
  serial: string,
  passed: boolean,
  reportHash: string
): Promise<string> {
  throw new Error('auditHardware requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Validar software
 */
export async function validateSoftware(
  serial: string,
  osVersion: string,
  passed: boolean
): Promise<string> {
  throw new Error('validateSoftware requires a connected wallet context. Use useSupplyChainService hook instead.');
}

/**
 * Asignar a estudiante
 */
export async function assignToStudent(
  serial: string,
  schoolHash: string,
  studentIdHash: string
): Promise<string> {
  throw new Error('assignToStudent requires a connected wallet context. Use useSupplyChainService hook instead.');
}

// Exportar constantes y utilidades
export { PROGRAM_ID, getProgram, getProvider };
export type { SupplyChainIDL } from '@/lib/contracts/solana-program';
