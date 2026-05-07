"use client";

import {
  WalletAdapterNetwork,
  type Adapter,
  type WalletError,
} from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
  TrustWalletAdapter,
  TorusWalletAdapter,
  CloverWalletAdapter,
  SafePalWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { ReactNode, useCallback, useMemo } from 'react';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Solana Wallet Provider
 *
 * Provides wallet connection context for the entire application.
 * Supports both explicitly configured wallets and auto-detected Wallet Standard wallets.
 *
 * Auto-detected wallets (Wallet Standard):
 * - Backpack, NeonLink, and any wallet implementing the Wallet Standard
 *
 * Explicitly configured wallets:
 * - Phantom, Solflare, Ledger, Trust, Torus, Clover, SafePal
 */
/**
 * Mapeo seguro de cluster a WalletAdapterNetwork.
 * Si NEXT_PUBLIC_CLUSTER no está definido, lanza error en lugar de usar fallback hardcoded.
 */
function getClusterNetwork(): WalletAdapterNetwork {
  const cluster = process.env.NEXT_PUBLIC_CLUSTER;
  if (!cluster) {
    throw new Error(
      'NEXT_PUBLIC_CLUSTER no está definido. ' +
      'Agrega NEXT_PUBLIC_CLUSTER=devnet|mainnet|testnet a tu archivo .env.local.'
    );
  }
  if (cluster !== 'devnet' && cluster !== 'mainnet' && cluster !== 'testnet') {
    console.warn(
      `[Wallet Provider] Cluster '${cluster}' no es un valor estándar (devnet/mainnet/testnet). ` +
      'Se usará como cluster personalizado con NEXT_PUBLIC_RPC_URL.'
    );
  }
  return cluster as WalletAdapterNetwork;
}

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const network = getClusterNetwork();
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network);

  // Error handler for wallet connection issues
  const onError = useCallback((error: WalletError, adapter?: Adapter) => {
    const message = error.message ? `${error.name}: ${error.message}` : error.name;
    console.error(`[Wallet Error] ${message}`, adapter);
  }, []);

  const wallets = useMemo(
    () => [
      // Explicitly configured wallets
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new LedgerWalletAdapter(),
      new TrustWalletAdapter(),
      new TorusWalletAdapter(),
      new CloverWalletAdapter(),
      new SafePalWalletAdapter(),
      // Note: Backpack and other Wallet Standard wallets are auto-detected
      // by the wallet adapter without needing explicit configuration
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]
  );

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export { WalletMultiButton as WalletMultiButton } from '@solana/wallet-adapter-react-ui';
