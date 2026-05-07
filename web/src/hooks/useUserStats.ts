/**
 * Hook for user statistics
 * @deprecated Use useSupplyChainService instead
 */
export function useUserStats() {
  return {
    totalUsers: 0,
    activeUsers: 0,
    loading: false,
  };
}
