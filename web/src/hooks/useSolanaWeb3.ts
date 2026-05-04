'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useCallback, useState } from 'react';

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export function useSolanaWeb3() {
  const { connection } = useConnection();
  const {
    publicKey,
    signTransaction,
    signAllTransactions,
    connect,
    disconnect,
    connected,
    connecting,
    wallet,
  } = useWallet();

  const [transactionLoading, setTransactionLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  const address = publicKey?.toBase58();

  const sendTransaction = useCallback(async (
    transaction: Transaction
  ): Promise<TransactionResult> => {
    if (!signTransaction || !publicKey) {
      return {
        signature: '',
        success: false,
        error: 'Wallet not connected or signTransaction not available',
      };
    }

    setTransactionLoading(true);
    try {
      const signedTransaction = await signTransaction(transaction);
      const versioned = VersionedTransaction.deserialize(signedTransaction.serialize());
      const signature = await connection.sendTransaction(versioned, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
      });

      setLastSignature(signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(
        signature,
        'confirmed'
      );

      return {
        signature,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        signature: '',
        success: false,
        error: errorMessage,
      };
    } finally {
      setTransactionLoading(false);
    }
  }, [connection, signTransaction, publicKey]);

  const connectWallet = useCallback(async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }, [connect]);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setLastSignature(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }, [disconnect]);

  // Check if address matches admin
  const adminAddress = process.env.NEXT_PUBLIC_PROGRAM_ID;
  const isAdmin = address === adminAddress;

  return {
    address,
    isConnected: connected,
    isConnecting: connecting,
    disconnect: disconnectWallet,
    connectWallet,
    sendTransaction,
    transactionLoading,
    lastSignature,
    isAdmin,
    walletName: wallet?.adapter.name,
    publicKey,
  };
}
