// web/src/components/SolanaWalletClientProvider.tsx
"use client";

import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { useState, useEffect } from 'react';

// Initialize mounted directly to avoid set-state-in-effect warning
// See: https://react.dev/reference/react/useEffect
export function SolanaWalletClientProvider({ children }: { children: React.ReactNode }) {
  // Use lazy initialization to avoid useEffect for mount detection
  const [mounted] = useState(() => typeof window !== 'undefined');

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
