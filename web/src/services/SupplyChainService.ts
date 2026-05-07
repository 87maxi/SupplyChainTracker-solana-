"use client";

// Legacy service - now migrated to UnifiedSupplyChainService
// This file is kept for backward compatibility but all operations go through UnifiedSupplyChainService

// Re-export unified service for convenience
export type { UnifiedSupplyChainService, TransactionResult, NetbookData, ConfigData, RoleRequestData, NetbookReport } from './UnifiedSupplyChainService';

// Legacy class stub for backward compatibility
export class SupplyChainService {
  static getInstance(): any {
    return import('./UnifiedSupplyChainService').then(m => m.UnifiedSupplyChainService.getInstance());
  }
}
