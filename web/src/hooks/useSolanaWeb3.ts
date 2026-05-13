"use client";

import {
  useWallet,
  useWalletSession,
  useWalletActions,
  useWalletConnection,
  useDisconnectWallet,
  useSendTransaction,
} from "@solana/react-hooks";
import { PublicKey } from "@solana/web3.js";
import { useMemo } from "react";

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export function useSolanaWeb3() {
  const wallet = useWallet();
  const session = useWalletSession();
  const walletActions = useWalletActions();
  const { connectors, connect: connectWalletFn } = useWalletConnection();
  const disconnectWalletFn = useDisconnectWallet();
  const { send, isSending, signature: sendSignature, error: sendError } =
    useSendTransaction();

  const isConnected = wallet.status === "connected";
  const isConnecting = wallet.status === "connecting";

  const address = useMemo(() => {
    if (isConnected && session) {
      return session.account.address.toString();
    }
    return undefined;
  }, [isConnected, session]);

  const publicKey = useMemo(() => {
    if (isConnected && session) {
      return new PublicKey(session.account.address.toString());
    }
    return null;
  }, [isConnected, session]);

  const walletName = useMemo(() => {
    if (isConnected && session) {
      return session.connector.name;
    }
    return undefined;
  }, [isConnected, session]);

  const sendTransaction = async (
    _transaction: unknown
  ): Promise<TransactionResult> => {
    // Use useSendTransaction hook for modern API
    // For legacy Transaction objects, use walletActions directly
    if (!isConnected) {
      return {
        signature: "",
        success: false,
        error: "Wallet not connected",
      };
    }
    // Note: For Anchor program interactions, transactions are built and sent
    // through the program methods. This hook is for direct transaction sending.
    return {
      signature: sendSignature?.toString() ?? "",
      success: !sendError,
      error: sendError ? String(sendError) : undefined,
    };
  };

  const connectWallet = async (connectorId?: string) => {
    try {
      if (connectorId) {
        // Connect to specific wallet by connector ID
        await connectWalletFn(connectorId, { autoConnect: true });
      } else if (connectors.length > 0) {
        // Connect to first available wallet (Phantom, Solflare, etc.)
        await connectWalletFn(connectors[0].id, { autoConnect: true });
      } else {
        throw new Error("No wallet connectors discovered");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnectWalletFn();
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  };

  // Issue #40: Admin check should use on-chain role verification
  const isAdmin = false;

  return {
    address,
    isConnected,
    isConnecting,
    disconnect: disconnectWallet,
    connectWallet,
    sendTransaction,
    transactionLoading: isSending,
    lastSignature: sendSignature?.toString() ?? null,
    isAdmin,
    walletName,
    publicKey,
    // Expose modern API for direct usage
    walletActions,
    session,
    send,
  };
}
