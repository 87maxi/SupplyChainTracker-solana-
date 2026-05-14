// web/src/lib/solana/connection.ts
// Issue #211: Migrated to @solana/kit v2 API
// Uses createSolanaRpc() for read operations and createSolanaRpcSubscriptions() for WebSocket

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  type Address,
} from '@solana/kit';
import { Connection } from '@solana/web3.js';

const CLUSTER = (process.env.NEXT_PUBLIC_CLUSTER || 'devnet') as string;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * Get the Solana cluster API URL
 */
function getClusterUrl(): string {
  if (RPC_URL) return RPC_URL;
  if (CLUSTER === 'localnet') return 'http://localhost:8899';
  // Fallback cluster URLs
  const clusterUrls: Record<string, string> = {
    'devnet': 'https://api.devnet.solana.com',
    'testnet': 'https://api.testnet.solana.com',
    'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  };
  return clusterUrls[CLUSTER] || 'https://api.devnet.solana.com';
}

/**
 * Get WebSocket URL from HTTP URL
 */
function getWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

const httpUrl = getClusterUrl();
const wsUrl = getWsUrl(httpUrl);

/**
 * Main Solana RPC client for read operations (v2 API)
 */
export const rpc = createSolanaRpc(httpUrl);

/**
 * @deprecated Use `rpc` (v2 API) instead.
 * Backward-compatible Connection export for code still using web3.js v1.
 */
export const connection = new Connection(httpUrl);

/**
 * WebSocket subscription client for real-time events (v2 API)
 */
export const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

/**
 * Check Solana connection
 * @returns True if connection is successful
 */
export const checkSolanaConnection = async (): Promise<boolean> => {
  try {
    await rpc.getSlot().send();
    return true;
  } catch (error) {
    console.error('Solana connection error:', error);
    return false;
  }
};

/**
 * Get SOL balance for an address
 * @param addr Address string (base58)
 * @returns Balance in lamports as bigint
 */
export const getBalance = async (addr: string): Promise<bigint> => {
  try {
    const publicKey = address(addr);
    const result = await rpc.getBalance(publicKey).send();
    // Lamports in @solana/kit is a value object - extract bigint
    return BigInt(result.value.toString());
  } catch (error) {
    console.error('Error getting balance:', error);
    return BigInt(0);
  }
};

/**
 * Airdrop SOL to an address (localnet/devnet only)
 * Note: airdrop is only available on devnet/localnet RPCs.
 * @param addr Address string (base58)
 * @param amount Lamports (default 1 SOL = 1_000_000_000 lamports)
 * @returns Transaction signature
 */
export const requestAirdrop = async (
  addr: string,
  amount: number = 1_000_000_000
): Promise<string> => {
  // For airdrop, we still need web3.js Connection since @solana/kit
  // does not expose airdrop in the stable API surface
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const conn = new Connection(httpUrl);
  const publicKey = new PublicKey(addr);
  const signature = await conn.requestAirdrop(publicKey, amount);
  await conn.confirmTransaction(signature, 'confirmed');
  return signature;
};
