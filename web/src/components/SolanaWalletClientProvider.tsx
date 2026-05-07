// web/src/components/SolanaWalletClientProvider.tsx
"use client";

import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { WalletReadyGate } from '@/components/WalletReadyGate';

/**
 * SolanaWalletClientProvider - Provider principal de wallet para la aplicación.
 *
 * Siempre renderiza SolanaWalletProvider para evitar errores de WalletContext
 * durante SSR e hidratación. Los componentes que necesitan wallet deben usar
 * WalletReadyGate para protegerse hasta que el provider esté listo.
 *
 * Soluciona: "You have tried to read 'wallet' on a WalletContext without providing one"
 *
 * Estructura:
 *   SolanaWalletClientProvider
 *     └─ SolanaWalletProvider (siempre presente)
 *         └─ WalletReadyGate (protege children hasta hidratación)
 *             └─ children
 */
export function SolanaWalletClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      <WalletReadyGate>
        {children}
      </WalletReadyGate>
    </SolanaWalletProvider>
  );
}
