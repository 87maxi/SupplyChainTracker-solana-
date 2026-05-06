'use client';

/**
 * Hook para gestión de roles de usuario
 * Obtiene los roles del usuario desde la cuenta de configuración de Solana
 */

import { useState, useEffect, useCallback } from 'react';
import { connection } from '@/lib/solana/connection';
import { PROGRAM_ID } from '@/lib/contracts/solana-program';
import { PublicKey } from '@solana/web3.js';

// Tipos de roles del programa
export enum UserRole {
  ADMIN = 'ADMIN',
  MANUFACTURER = 'FABRICANTE',
  HARDWARE_AUDITOR = 'AUDITOR_HW',
  SOFTWARE_TECHNICIAN = 'TECNICO_SW',
  SCHOOL = 'ESCUELA',
}

export interface UserRoles {
  isAdmin: boolean;
  isManufacturer: boolean;
  isHardwareAuditor: boolean;
  isSoftwareTechnician: boolean;
  isSchool: boolean;
  address: string | null;
  connected: boolean;
}

const DEFAULT_ROLES: Omit<UserRoles, 'address' | 'connected'> = {
  isAdmin: false,
  isManufacturer: false,
  isHardwareAuditor: false,
  isSoftwareTechnician: false,
  isSchool: false,
};

/**
 * Hook para obtener los roles del usuario conectado
 */
export function useUserRoles() {
  const [roles, setRoles] = useState<UserRoles>({
    ...DEFAULT_ROLES,
    address: null,
    connected: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener roles del usuario desde la cuenta de configuración
   */
  const fetchRoles = useCallback(async (userAddress: string) => {
    if (!userAddress) {
      setRoles({
        ...DEFAULT_ROLES,
        address: null,
        connected: false,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPubkey = new PublicKey(userAddress);
      
      // Buscar la cuenta de SupplyChainConfig
      const configPda = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        PROGRAM_ID
      )[0];

      // Obtener datos de la cuenta
      const accountInfo = await connection.getAccountInfo(configPda);
      
      if (!accountInfo) {
        setRoles({
          ...DEFAULT_ROLES,
          address: userAddress,
          connected: true,
        });
        setIsLoading(false);
        return;
      }

      // Parsear los datos del config account
      // Los roles se almacenan como PublicKey de 32 bytes cada uno
      const data = accountInfo.data;
      
      let isManufacturer = false;
      let isHardwareAuditor = false;
      let isSoftwareTechnician = false;
      let isSchool = false;

      // Verificar si el usuario coincide con algún rol registrado
      // Estructura del config: manufacturer(32) + auditor_hw(32) + tecnico_sw(32) + school(32)
      if (data.length >= 128) {
        const userBuffer = userPubkey.toBuffer();
        
        // Comparar bytes para cada rol
        isManufacturer = data.slice(0, 32).every((byte, i) => byte === userBuffer[i]);
        isHardwareAuditor = data.slice(32, 64).every((byte, i) => byte === userBuffer[i]);
        isSoftwareTechnician = data.slice(64, 96).every((byte, i) => byte === userBuffer[i]);
        isSchool = data.slice(96, 128).every((byte, i) => byte === userBuffer[i]);
      }

      const isAdmin = isManufacturer || isHardwareAuditor || isSoftwareTechnician || isSchool;

      setRoles({
        isAdmin,
        isManufacturer,
        isHardwareAuditor,
        isSoftwareTechnician,
        isSchool,
        address: userAddress,
        connected: true,
      });
    } catch {
      // Error fetching roles - fallback to default
      setRoles({
        ...DEFAULT_ROLES,
        address: userAddress,
        connected: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sincronizar con el estado de conexión
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const identity = await connection.getAccountInfo(
          // This would require wallet integration - simplified for now
        );
      } catch {
        // Ignore
      }
    };
    checkConnection();
  }, []);

  return {
    roles,
    isLoading,
    error,
    refresh: () => roles.address && fetchRoles(roles.address),
    fetchRoles,
  };
}

// Re-exportar UserRole enum
export { UserRole };
