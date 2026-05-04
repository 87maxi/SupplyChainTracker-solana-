import { getAddress } from 'viem';

// Función auxiliar para validar y normalizar direcciones
const validateAndNormalizeAddress = (address: string | undefined): `0x${string}` | undefined => {
  if (!address) return undefined;
  try {
    return getAddress(address);
  } catch (error) {
    console.error(`Dirección inválida encontrada: ${address}`, error);
    return undefined;
  }
};

export const NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS = validateAndNormalizeAddress(process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS);
export const NEXT_PUBLIC_VERIFICATION_BLOCKSCOUT_URL = process.env.NEXT_PUBLIC_VERIFICATION_BLOCKSCOUT_URL;
export const NEXT_PUBLIC_ETHERSCAN_URL = process.env.NEXT_PUBLIC_ETHERSCAN_URL;
export const NEXT_PUBLIC_PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
export const NEXT_PUBLIC_PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

// Exportar la función de validación para uso en otros módulos
export const validateAddress = validateAndNormalizeAddress;