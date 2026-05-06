'use client';

/**
 * Wrapper de useSolanaWeb3 para compatibilidad
 * Este hook re-exporta useSolanaWeb3 con el nombre useWeb3
 * para mantener compatibilidad con el código existente
 */

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';

/**
 * Hook unificado para operaciones Web3 (Solana)
 */
export function useWeb3() {
  const solana = useSolanaWeb3();

  return {
    // Exponer todas las propiedades de Solana con nombres compatibles
    address: solana.address,
    connected: solana.isConnected,
    connecting: solana.isConnecting,
    transactionLoading: solana.transactionLoading,
    lastSignature: solana.lastSignature,
    walletName: solana.walletName,
    publicKey: solana.publicKey,

    // Funciones de wallet
    connectWallet: solana.connectWallet,
    disconnect: solana.disconnect,
    sendTransaction: solana.sendTransaction,

    // Utilidades
    isAdmin: solana.isAdmin,
  };
}
