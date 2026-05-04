import { useState, useEffect } from 'react';

// Define the stats interface
export interface NetbookStats {
  total: number;
  production: number;
  distribution: number;
  retail: number;
  sold: number;
}

// Custom hook to fetch netbook statistics from MongoDB
export function useNetbookStats() {
  const [stats, setStats] = useState<NetbookStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // En la nueva arquitectura blockchain-native, no usamos MongoDB
        // Simulamos datos de estadísticas de netbooks
        const statusCounts = {
          total: 0,
          production: 0,
          distribution: 0,
          retail: 0,
          sold: 0
        };
        
        setStats(statusCounts as NetbookStats);
      } catch (err) {
        console.error('Error fetching netbook stats:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { stats, isLoading, error };
}