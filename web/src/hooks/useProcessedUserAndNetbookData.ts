/**
 * Hook for processed user and netbook data
 * @deprecated Use useSupplyChainService instead
 */
export function useProcessedUserAndNetbookData() {
  return {
    processedData: [],
    loading: false,
    error: null,
  };
}
