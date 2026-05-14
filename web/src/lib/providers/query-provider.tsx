/**
 * React Query Provider for Next.js App Router
 *
 * Issue #211: Frontend Evolution - React Query Integration
 *
 * Sets up QueryClient with proper SSR support and staleTime configuration.
 * Uses the pattern recommended by TanStack Query for Next.js:
 * - Server: always creates a new QueryClient
 * - Browser: reuses a single QueryClient instance
 */

'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, set staleTime above 0 to avoid immediate refetching
        staleTime: 60 * 1000,
        // Retry failed queries once
        retry: 1,
        // Cache data for 5 minutes
        gcTime: 5 * 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

/**
 * Get the current QueryClient instance (for use outside React tree)
 */
export function getCurrentQueryClient(): QueryClient {
  return getQueryClient();
}

export default function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
