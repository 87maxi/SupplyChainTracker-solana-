'use client';

import { useSolanaWeb3 } from './useSolanaWeb3';

/**
 * @deprecated Use `useSolanaWeb3` directly instead.
 * This hook is a thin wrapper around useSolanaWeb3 and will be removed in a future version.
 * Migration: Replace `import { useWeb3 } from '@/hooks/useWeb3'` with
 * `import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3'`
 *
 * @issue #211 - Frontend Evolution: Hook Consolidation
 */
export const useWeb3 = () => {
  const solana = useSolanaWeb3();

  const connectWallet = async () => {
    await solana.connectWallet();
  };

  return {
    address: solana.address,
    isConnected: solana.isConnected,
    isConnecting: solana.isConnecting,
    disconnect: solana.disconnect,
    connectWallet,
    defaultAdminAddress: solana.defaultAdminAddress,
    walletName: solana.walletName,
    isAdmin: solana.isAdmin,
    publicKey: solana.publicKey,
  };
};
