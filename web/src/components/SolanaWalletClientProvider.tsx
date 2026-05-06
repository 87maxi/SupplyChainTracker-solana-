// web/src/components/SolanaWalletClientProvider.tsx
"use client";

import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { useState, useEffect } from 'react';

export function SolanaWalletClientProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During SSR and initial hydration, render children without wallet context
    return <>{children}</>;
  }

  return (
    <SolanaWalletProvider>
      {children}
    </SolanaWalletProvider>
  );
}
