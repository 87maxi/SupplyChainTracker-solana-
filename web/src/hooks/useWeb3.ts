'use client';

import { useSolanaWeb3 } from './useSolanaWeb3';

/**
 * Issue #211: useWeb3 now re-exports useSolanaWeb3 directly.
 *
 * @deprecated Import `useSolanaWeb3` directly from '@/hooks/useSolanaWeb3'
 * This wrapper is kept for backward compatibility but delegates 1:1.
 */
export const useWeb3 = useSolanaWeb3;

// Re-export for convenience
export { useSolanaWeb3 };
