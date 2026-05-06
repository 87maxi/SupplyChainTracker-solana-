import { useState, useEffect } from 'react';
import { useSupplyChainService } from './useSupplyChainService';

// Interfaces para los datos de analytics
export interface AnalyticsData {
  date: string;
  fabricadas: number;
  distribuidas: number;
}

export interface AnalyticsStats {
  totalUsers: number;
  totalNetbooks: number;
  usersByRole: {
    [key: string]: number;
  };
  netbooksByStatus: {
    [key: string]: number;
  };
}

// Custom hook para obtener datos de analytics desde Solana Blockchain
export function useAnalyticsData() {
  const { getAllRolesSummary, getAllSerialNumbers, getNetbook } = useSupplyChainService();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get all serial numbers from blockchain
        const serials = await getAllSerialNumbers();
        
        // Query netbooks
        const netbooks: any[] = [];
        for (const serial of serials) {
          try {
            const netbook = await getNetbook(serial);
            if (netbook) {
              netbooks.push({ serialNumber: serial, currentState: (netbook as any).currentState, auditTimestamp: (netbook as any).auditTimestamp, distributionTimestamp: (netbook as any).distributionTimestamp });
            }
          } catch {
            // Skip netbooks that can't be loaded
          }
        }

        // Get role summary
        const roleSummary = await getAllRolesSummary();
        
        // Count users by role
        const users: any[] = [];
        const usersByRole: Record<string, number> = {};
        Object.entries(roleSummary).forEach(([roleName, data]) => {
          const members = (data as any).members || [];
          usersByRole[roleName.replace('_ROLE', '')] = members.length;
          members.forEach((addr: string) => {
            users.push({ role: roleName, address: addr });
          });
        });

        // Count netbooks by status
        const netbooksByStatus: Record<string, number> = {};
        netbooks.forEach((netbook) => {
          const status = netbook.currentState || 'UNKNOWN';
          netbooksByStatus[status] = (netbooksByStatus[status] || 0) + 1;
        });

        const analyticsStats: AnalyticsStats = {
          totalUsers: users.length,
          totalNetbooks: netbooks.length,
          usersByRole,
          netbooksByStatus,
        };

        // Create chart data (grouped by month)
        const monthlyData: { [key: string]: { fabricadas: number, distribuidas: number } } = {};
        
        netbooks.forEach((netbook) => {
          const timestamp = netbook.distributionTimestamp || netbook.auditTimestamp || Date.now();
          const date = new Date(Number(timestamp) * 1000);
          const monthYear = date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { fabricadas: 0, distribuidas: 0 };
          }
          
          if (netbook.currentState === 'FABRICADA') {
            monthlyData[monthYear].fabricadas++;
          } else if (netbook.currentState === 'DISTRIBUIDA') {
            monthlyData[monthYear].distribuidas++;
          }
        });

        // Sort by date
        const chartData = Object.entries(monthlyData)
          .map(([date, counts]) => ({ date, fabricadas: counts.fabricadas, distribuidas: counts.distribuidas }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setData(chartData);
        setStats(analyticsStats);
      } catch (err) {
        console.error('Error processing analytics data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setData([]);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    processData();
  }, [getAllRolesSummary, getAllSerialNumbers, getNetbook]);

  return { data, stats, isLoading, error };
}
