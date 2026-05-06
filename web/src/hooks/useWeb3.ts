'use client';

import { useSolanaWeb3 } from './useSolanaWeb3';

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
    defaultAdminAddress: process.env.NEXT_PUBLIC_DEFAULT_ADMIN_ADDRESS,
    walletName: solana.walletName,
    isAdmin: solana.isAdmin,
    publicKey: solana.publicKey,
  };
};
