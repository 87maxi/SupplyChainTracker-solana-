"use client";

import { useWallet, useWalletSession, useWalletActions } from "@solana/react-hooks";
import { useMemo, useState, useEffect } from "react";

/**
 * Safe wallet hook that handles missing provider during SSR.
 *
 * Uses modern @solana/react-hooks API.
 *
 * Usage:
 *   const { wallet, connected, isWalletAvailable } = useSafeWallet();
 */
export function useSafeWallet() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const wallet = useWallet();
  const session = useWalletSession();
  const walletActions = useWalletActions();

  const isConnected = wallet.status === "connected";
  const isConnecting = wallet.status === "connecting";

  return useMemo(() => {
    if (!isClient) {
      return {
        wallet: null,
        connected: false,
        connecting: false,
        publicKey: null,
        signMessage: null,
        signTransaction: null,
        signAllTransactions: null,
        disconnect: async () => {},
        connect: async () => {},
        select: async () => {},
        isWalletAvailable: false,
        walletActions: null,
        session: null,
      };
    }

    return {
      wallet,
      connected: isConnected,
      connecting: isConnecting,
      publicKey: isConnected && session ? session.account.address : null,
      signMessage: session?.signMessage ?? null,
      signTransaction: session?.signTransaction ?? null,
      signAllTransactions: null,
      disconnect: walletActions?.disconnectWallet ?? (async () => {}),
      connect: async (connectorId?: string) => {
        if (walletActions?.connectWallet) {
          await walletActions.connectWallet(
            connectorId ?? "wallet-standard:phantom",
            { autoConnect: true }
          );
        }
      },
      select: async () => {},
      isWalletAvailable: true,
      walletActions,
      session,
    };
  }, [
    isClient,
    wallet,
    isConnected,
    isConnecting,
    session,
    walletActions,
  ]);
}
