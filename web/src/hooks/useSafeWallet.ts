"use client";

import { useWallet, useWalletSession, useWalletActions, useWalletConnection } from "@solana/react-hooks";
import { useCallback, useMemo, useState } from "react";

/**
 * Safe wallet hook that handles missing provider during SSR.
 *
 * Uses modern @solana/react-hooks API.
 *
 * Usage:
 *   const { wallet, connected, isWalletAvailable } = useSafeWallet();
 */
export function useSafeWallet() {
  const [isHydrated] = useState(() => typeof document !== "undefined");

  const wallet = useWallet();
  const session = useWalletSession();
  const walletActions = useWalletActions();
  const { connectors, connect: connectWalletFn } = useWalletConnection();

  const isConnected = wallet.status === "connected";
  const isConnecting = wallet.status === "connecting";

  // Stable connect function using useCallback
  const connect = useCallback(
    async (connectorId?: string) => {
      if (connectorId) {
        // Connect to specific wallet by connector ID
        await connectWalletFn(connectorId, { autoConnect: true });
      } else if (connectors.length > 0) {
        // Connect to first available wallet (Phantom, Solflare, etc.)
        await connectWalletFn(connectors[0].id, { autoConnect: true });
      }
    },
    [connectWalletFn, connectors],
  );

  return useMemo(() => {
    if (!isHydrated) {
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
      connect,
      select: async () => {},
      isWalletAvailable: true,
      walletActions,
      session,
    };
  }, [
    isHydrated,
    wallet,
    isConnected,
    isConnecting,
    session,
    walletActions,
    connect,
  ]);
}
