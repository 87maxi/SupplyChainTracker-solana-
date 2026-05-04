// web/src/lib/blockchain/index.ts
// Exporta el cliente de blockchain para uso global

export { publicClient, getWalletClient, checkBlockchainConnection, getBalance } from './client';
export type { PublicClient, WalletClient } from 'viem';
