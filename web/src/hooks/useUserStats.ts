import { useState, useEffect } from 'react';

// Define the stats interface
export interface UserStats {
  total: number;
  admin: number;
  manufacturer: number;
  distributor: number;
  retailer: number;
  consumer: number;
  logistics: number;
  qualityControl: number;
  regulatoryCompliance: number;
}

// Custom hook to fetch user statistics from MongoDB
export function useUserStats() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // En la nueva arquitectura blockchain-native, no usamos MongoDB
        // Simulamos datos de estadísticas de usuarios
        const roleCounts: UserStats = {
          total: 0,
          admin: 0,
          manufacturer: 0,
          distributor: 0,
          retailer: 0,
          consumer: 0,
          logistics: 0,
          qualityControl: 0,
          regulatoryCompliance: 0
        };
        
        setStats(roleCounts);
      } catch (err) {
        console.error('Error fetching user stats:', err);
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