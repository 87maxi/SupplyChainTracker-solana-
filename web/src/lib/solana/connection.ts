// web/src/lib/solana/connection.ts
// Solana connection client
// Issue #211: Currently uses @solana/web3.js v1 for Connection
// TODO: Migrate to @solana/kit v2 createSolanaRpc() when stable

import { Connection, clusterApiUrl, type ConnectionConfig } from '@solana/web3.js';

const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER || 'devnet') as 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * Get the Solana cluster API URL
 */
function getClusterUrl(): string {
  if (RPC_URL) return RPC_URL;
  if (CLUSTER === 'localnet') return 'http://localhost:8899';
  return clusterApiUrl(CLUSTER);
}

/**
 * Default connection config
 */
const connectionConfig: ConnectionConfig = {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
};

/**
 * Main Solana connection for read operations
 */
export const connection = new Connection(getClusterUrl(), connectionConfig);

/**
 * Check Solana connection
 * @returns True if connection is successful
 */
export const checkSolanaConnection = async (): Promise<boolean> => {
  try {
    await connection.getSlot();
    return true;
  } catch (error) {
    console.error('Solana connection error:', error);
    return false;
  }
};

/**
 * Get SOL balance for a public key
 * @param publicKey PublicKey or base58 string
 * @returns Balance in lamports as bigint
 */
export const getBalance = async (publicKey: string | import('@solana/web3.js').PublicKey): Promise<bigint> => {
  try {
    const { PublicKey } = await import('@solana/web3.js');
    const key = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    const balance = await connection.getBalance(key);
    return BigInt(balance);
  } catch (error) {
    console.error('Error getting balance:', error);
    return BigInt(0);
  }
};

/**
 * Airdrop SOL to a public key (localnet/devnet only)
 * @param publicKey PublicKey or base58 string
 * @param amount SOL amount (default 1 SOL = 1_000_000_000 lamports)
 */
export const requestAirdrop = async (
  publicKey: string | import('@solana/web3.js').PublicKey,
  amount: number = 1_000_000_000
): Promise<string> => {
  const { PublicKey } = await import('@solana/web3.js');
  const key = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
  const signature = await connection.requestAirdrop(key, amount);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
};
