import { PublicKey } from '@solana/web3.js';

// Función auxiliar para validar y normalizar claves públicas de Solana
const validateAndNormalizePublicKey = (address: string | undefined): string | undefined => {
  if (!address) return undefined;
  try {
    // Validate base58 PublicKey format
    new PublicKey(address);
    return address;
  } catch (error) {
    console.error(`Clave pública inválida encontrada: ${address}`, error);
    return undefined;
  }
};

export const NEXT_PUBLIC_PROGRAM_ID = validateAndNormalizePublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID);
export const NEXT_PUBLIC_CLUSTER = process.env.NEXT_PUBLIC_CLUSTER || 'devnet';
export const NEXT_PUBLIC_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
export const NEXT_PUBLIC_PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
export const NEXT_PUBLIC_PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

// Exportar la función de validación para uso en otros módulos
export const validatePublicKey = validateAndNormalizePublicKey;