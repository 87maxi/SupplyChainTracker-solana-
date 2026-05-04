"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';

interface Web3ProvidersProps {
  children: React.ReactNode;
}

export function Web3Providers({ children }: Web3ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        {children}
      </SolanaWalletProvider>
    </QueryClientProvider>
  );
}
