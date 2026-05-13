"use client";

import { autoDiscover, createClient } from "@solana/client";
import { SolanaProvider } from "@solana/react-hooks";
import { ReactNode, useMemo } from "react";

/**
 * Solana Wallet Provider (Modern API)
 *
 * Provides wallet connection context using @solana/react-hooks.
 * Replaces legacy @solana/wallet-adapter-* with the official Solana client.
 *
 * Features:
 * - Auto-discovers Wallet Standard wallets (Phantom, Solflare, Backpack, etc.)
 * - Uses @solana/client for RPC communication
 * - Provides hooks: useWallet, useConnectWallet, useDisconnectWallet
 */
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    `https://api.${process.env.NEXT_PUBLIC_CLUSTER || "devnet"}.solana.com`;

  const wsUrl =
    process.env.NEXT_PUBLIC_RPC_WS_URL ||
    `wss://api.${process.env.NEXT_PUBLIC_CLUSTER || "devnet"}.solana.com`;

  const client = useMemo(
    () =>
      createClient({
        endpoint: rpcUrl,
        websocketEndpoint: wsUrl,
        walletConnectors: autoDiscover(),
      }),
    [rpcUrl, wsUrl]
  );

  return <SolanaProvider client={client}>{children}</SolanaProvider>;
}
