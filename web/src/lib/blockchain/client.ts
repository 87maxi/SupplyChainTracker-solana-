// web/src/lib/blockchain/client.ts
// Cliente unificado para conexiones blockchain usando Viem

import { createPublicClient, createWalletClient, http, custom, type PublicClient, type WalletClient, getAddress } from 'viem';
import { anvil } from 'viem/chains';
import { walletActions } from 'viem';

// Configuración para desarrollo local con Anvil
const ANVIL_RPC_URL = process.env.NEXT_PUBLIC_ANVIL_RPC_URL || 'http://localhost:8545';

/**
 * Cliente público para operaciones de lectura
 * No requiere conexión de wallet
 */
export const publicClient: PublicClient = createPublicClient({
  chain: anvil,
  transport: http(ANVIL_RPC_URL, {
    timeout: 30000, // 30 segundos timeout para desarrollo
    retryCount: 3,  // Reintentos automáticos
  }),
  batch: {
    multicall: true, // Habilitar multicall para optimización
  }
});

/**
 * Cliente de wallet para operaciones de escritura
 * Requiere conexión de wallet
 */
export const getWalletClient = async (account?: `0x${string}`): Promise<WalletClient> => {
  // En el navegador, preferimos usar window.ethereum si está disponible
  const isBrowser = typeof window !== 'undefined' && !!window.ethereum;
  const transport = isBrowser ? custom(window.ethereum) : http(ANVIL_RPC_URL);

  if (account) {
    try {
      const normalizedAccount = getAddress(account);

      const client = createWalletClient({
        chain: anvil,
        transport,
        account: normalizedAccount
      }).extend(walletActions);

      return client;
    } catch (error) {
      console.error('Error al crear cliente de wallet con cuenta:', error);
      return createWalletClient({
        chain: anvil,
        transport
      }).extend(walletActions);
    }
  }

  return createWalletClient({
    chain: anvil,
    transport
  }).extend(walletActions);
};

/**
 * Verifica la conexión con la blockchain
 * @returns True si la conexión es exitosa
 */
export const checkBlockchainConnection = async (): Promise<boolean> => {
  try {
    await publicClient.getBlockNumber();
    return true;
  } catch (error) {
    console.error('Error de conexión con la blockchain:', error);
    return false;
  }
};

/**
 * Obtiene el balance de una cuenta
 * @param address Dirección de la cuenta
 * @returns Balance en wei como string
 */
export const getBalance = async (address: `0x${string}`): Promise<string> => {
  try {
    const balance = await publicClient.getBalance({ address });
    return balance.toString();
  } catch (error) {
    console.error('Error obteniendo balance:', error);
    return '0';
  }
};

// Re-exportar tipos y utilidades comunes
export { http, type PublicClient, type WalletClient };