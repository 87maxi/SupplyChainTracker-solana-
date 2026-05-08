'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';

/**
 * WalletReadyGate - Componente Gateway que protege children hasta que el WalletProvider esté listo.
 *
 * Durante SSR e hidratación inicial, SolanaWalletClientProvider renderiza los children
 * SIN envolverlos en WalletProvider. Este componente actúa como puerta de enlace que
 * retrasa la renderización de componentes que dependen de useWallet() hasta que el
 * provider esté disponible.
 *
 * Soluciona: "You have tried to read 'wallet' on a WalletContext without providing one"
 *
 * Uso:
 *   <WalletReadyGate>
 *     <ComponenteQueNecesitaWallet />
 *   </WalletReadyGate>
 *
 * Con fallback:
 *   <WalletReadyGate fallback={<LoadingSpinner />}>
 *     <ComponenteQueNecesitaWallet />
 *   </WalletReadyGate>
 */
export function WalletReadyGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    // After first render on client, mark as ready
    // This ensures WalletProvider has been mounted by SolanaWalletClientProvider
    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
  }, []);

  if (!isReady) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

/**
 * Hook para verificar si el WalletProvider está disponible.
 * Útil para componentes que necesitan saber si pueden usar useWallet().
 */
export function useWalletReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);
  }, []);

  return isReady;
}
