"use client";

// Legacy Ethereum-based SupplyChainService - now migrated to Solana
// This file is kept for backward compatibility but all operations go through SolanaSupplyChainService

// Re-export Solana service for convenience
export type { SolanaSupplyChainService, TransactionResult, NetbookInfo } from './SolanaSupplyChainService';

// Legacy class stub for backward compatibility
export class SupplyChainService {
  static getInstance(): any {
    return import('./SolanaSupplyChainService').then(m => m.SolanaSupplyChainService.getInstance());
  }
}
