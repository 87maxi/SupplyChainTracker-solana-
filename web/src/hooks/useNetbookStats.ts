/**
 * Hook for netbook statistics
 * @deprecated Use useSupplyChainService instead
 */
export function useNetbookStats() {
  return {
    totalNetbooks: 0,
    netbooksByState: {},
    loading: false,
  };
}
