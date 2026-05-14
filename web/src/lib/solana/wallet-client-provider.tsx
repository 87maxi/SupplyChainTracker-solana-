/**
 * SolanaWalletClientProvider
 *
 * Modern wallet provider using @solana/react-hooks and @solana/client.
 * Coexists with legacy SolanaWalletProvider during migration period.
 *
 * @see Issue #204 - Wallet Migration (Legacy → @solana/react-hooks)
 */
'use client';

import { type ReactNode, useMemo } from 'react';
import { SolanaProvider } from '@solana/react-hooks';
import {
  type CreateDefaultClientOptions,
  autoDiscover,
} from '@solana/client';

interface SolanaWalletClientProviderProps {
  children: ReactNode;
}

export function SolanaWalletClientProvider({ children }: SolanaWalletClientProviderProps) {
  const rpcEndpoint = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

  const clientConfig: CreateDefaultClientOptions = useMemo(
    () => ({
      endpoint: rpcEndpoint,
      // Use 'default' to auto-discover installed wallets (Phantom, Solflare, etc.)
      walletConnectors: 'default',
    }),
    [rpcEndpoint]
  );

  return (
    <SolanaProvider config={clientConfig}>
      {children}
    </SolanaProvider>
  );
}
