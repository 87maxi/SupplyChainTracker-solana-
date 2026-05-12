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
import { MockWalletAdapter } from './mock-wallet-adapter';

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
    // En modo test (localnet), usar devnet como fallback para evitar errores
    if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
      console.warn(
        '[Wallet Provider] NEXT_PUBLIC_CLUSTER no definido, usando devnet como fallback para modo test.'
      );
      return WalletAdapterNetwork.Devnet;
    }
    throw new Error(
      'NEXT_PUBLIC_CLUSTER no está definido. ' +
      'Agrega NEXT_PUBLIC_CLUSTER=devnet|mainnet|testnet a tu archivo .env.local.'
    );
  }
  // Aceptar 'localnet' como cluster válido para testing local
  if (cluster === 'localnet') {
    console.warn(
      '[Wallet Provider] Cluster localnet detectado. Usando NEXT_PUBLIC_RPC_URL para conexión.'
    );
    return WalletAdapterNetwork.Devnet; // Fallback para evitar errores de tipo
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

  // Detectar modo test para usar MockWalletAdapter
  const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

  const wallets = useMemo(
    () => {
      if (isTestMode) {
        // En modo test, usar MockWalletAdapter (siempre conectado, sin extensión)
        return [new MockWalletAdapter()];
      }
      // En producción/development, usar adapters reales
      return [
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
      ];
    },
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
