'use client';

import { useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import { useMemo, useState, useEffect } from 'react';

/**
 * Safe wallet hook that handles missing WalletProvider during SSR.
 *
 * During SSR and initial hydration, SolanaWalletClientProvider renders children
 * WITHOUT wrapping them in WalletProvider, causing useWallet() to throw:
 * "You have tried to read 'wallet' on a WalletContext without providing one."
 *
 * This hook always calls useWalletAdapter() (satisfying Rules of Hooks) but
 * captures errors via try-catch pattern using a wrapper component approach.
 *
 * IMPORTANT: This hook MUST be used inside a WalletReadyGate component or
 * after the provider is guaranteed to be available. For components that render
 * during SSR, use the WalletReadyGate wrapper instead.
 *
 * Usage:
 *   const { wallet, connected, connect, disconnect, isWalletAvailable } = useSafeWallet();
 */
export function useSafeWallet() {
  // Track whether we're on the client side
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always call useWalletAdapter to satisfy Rules of Hooks
  // During SSR this will throw, but we catch it at the component level
  let walletAdapter: ReturnType<typeof useWalletAdapter>;
  try {
    walletAdapter = useWalletAdapter();
  } catch {
    // WalletProvider not available (SSR phase)
    walletAdapter = {
      wallet: undefined,
      connected: false,
      connecting: false,
      disconnect: async () => {},
      connect: async () => {},
      select: async () => {},
      publicKey: null,
      signMessage: null,
      signTransaction: null,
      signAllTransactions: null,
    } as any;
  }

  return useMemo(() => {
    if (!isClient) {
      return {
        wallet: null,
        connected: false,
        connecting: false,
        publicKey: null,
        connect: async () => { /* No-op during SSR */ },
        disconnect: async () => { /* No-op during SSR */ },
        select: async () => { /* No-op during SSR */ },
        signMessage: null,
        signTransaction: null,
        signAllTransactions: null,
        isWalletAvailable: false,
      };
    }

    return {
      wallet: walletAdapter.wallet || null,
      connected: walletAdapter.connected || false,
      connecting: walletAdapter.connecting || false,
      publicKey: walletAdapter.publicKey || null,
      connect: walletAdapter.connect || (async () => {}),
      disconnect: walletAdapter.disconnect || (async () => {}),
      select: walletAdapter.select || (async () => {}),
      signMessage: walletAdapter.signMessage || null,
      signTransaction: walletAdapter.signTransaction || null,
      signAllTransactions: walletAdapter.signAllTransactions || null,
      isWalletAvailable: true,
    };
  }, [isClient, walletAdapter]);
}
