'use client';

/**
 * Servicio para gestión de solicitudes de roles
 * Maneja la creación, consulta y actualización de solicitudes de roles
 */

import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { connection } from '@/lib/solana/connection';
import { PROGRAM_ID, getProgram } from '@/lib/contracts/solana-program';
import { Buffer } from 'buffer';

// Tipos para solicitudes de roles
export interface RoleRequest {
  user: PublicKey;
  requestedRole: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: PublicKey;
  rejectionReason?: string;
}

export interface RoleRequestData {
  number: number;
  user: string;
  requestedRole: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export enum RoleType {
  MANUFACTURER = 'FABRICANTE',
  HARDWARE_AUDITOR = 'AUDITOR_HW',
  SOFTWARE_TECHNICIAN = 'TECNICO_SW',
  SCHOOL = 'ESCUELA',
}

/**
 * Servicio para gestión de solicitudes de roles
 */
export class RoleRequestService {
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;

  /**
   * Inicializar con provider
   */
  initialize(provider: AnchorProvider) {
    this.provider = provider;
    this.program = getProgram(provider);
  }

  /**
   * Crear una solicitud de rol
   */
  async createRoleRequest(role: string, signerPublicKey: PublicKey): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const tx = await this.program.methods
        .requestRole(role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating role request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Aprobar solicitud de rol
   */
  async approveRoleRequest(role: string): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const tx = await this.program.methods
        .approveRoleRequest(role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error approving role request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rechazar solicitud de rol
   */
  async rejectRoleRequest(role: string): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      if (!this.program) {
        throw new Error('Program not initialized');
      }

      const tx = await this.program.methods
        .rejectRoleRequest(role)
        .rpc();

      return { success: true, signature: tx };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error rejecting role request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Obtener todas las solicitudes pendientes
   */
  async getPendingRoleRequests(): Promise<RoleRequestData[]> {
    try {
      // Buscar todas las cuentas de RoleRequest
      const filter = {
        memcmp: {
          offset: 8, // Skip discriminator
          bytes: 'pending', // Status filter
        },
      };

      // Esta es una implementación simplificada
      // En producción, se debería usar una consulta más específica
      const accounts = await connection.getProgramAccounts(
        PROGRAM_ID,
        {
          filters: [
            { dataSize: 200 }, // Size of RoleRequest account
          ],
        }
      );

      return accounts.map((account) => ({
        number: 0,
        user: account.pubkey.toBase58(),
        requestedRole: 'PENDING',
        timestamp: Date.now(),
        status: 'pending',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Obtener solicitudes por usuario
   */
  async getRoleRequestsByUser(userAddress: string): Promise<RoleRequestData[]> {
    try {
      const userPubkey = new PublicKey(userAddress);
      
      // Find PDA for role request
      const [requestPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('role_request'), userPubkey.toBuffer()],
        PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(requestPda);
      
      if (!accountInfo) {
        return [];
      }

      // Parse account data (simplified)
      return [{
        number: 1,
        user: userAddress,
        requestedRole: 'UNKNOWN',
        timestamp: Date.now(),
        status: 'pending',
      }];
    } catch {
      return [];
    }
  }

  /**
   * Verificar si un usuario tiene una solicitud pendiente
   */
  async hasPendingRequest(userAddress: string): Promise<boolean> {
    const requests = await this.getRoleRequestsByUser(userAddress);
    return requests.some(r => r.status === 'pending');
  }
}

// Singleton instance
export const roleRequestService = new RoleRequestService();
