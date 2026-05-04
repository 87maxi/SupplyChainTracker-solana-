import { useState, useEffect } from 'react';
import { useProcessedUserAndNetbookData } from './useProcessedUserAndNetbookData';

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

// Custom hook para obtener datos de analytics desde MongoDB
export function useAnalyticsData() {
  const { users, netbooks, isLoading: dataLoading } = useProcessedUserAndNetbookData();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processData = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Procesar estadísticas
        const analyticsStats: AnalyticsStats = {
          totalUsers: users.length,
          totalNetbooks: netbooks.length,
          usersByRole: {},
          netbooksByStatus: {}
        };

        // Contar usuarios por rol
        users.forEach((user) => {
          const role = user.role.replace('_ROLE', '');
          analyticsStats.usersByRole[role] = (analyticsStats.usersByRole[role] || 0) + 1;
        });

        // Contar netbooks por estado
        netbooks.forEach((netbook) => {
          analyticsStats.netbooksByStatus[netbook.currentState] = 
            (analyticsStats.netbooksByStatus[netbook.currentState] || 0) + 1;
        });

        // Crear datos para gráfico (agrupados por mes)
        const monthlyData: { [key: string]: { fabricadas: number, distribuidas: number } } = {};
        
        // Combinar datos de usuarios y netbooks para el análisis de crecimiento
        [...users, ...netbooks].forEach((item) => {
          const timestamp = item.distributionTimestamp ? 
            item.distributionTimestamp : Date.now();
          const date = new Date(Number(timestamp) * 1000);
          const monthYear = date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { fabricadas: 0, distribuidas: 0 };
          }
          
          // Clasificar según tipo de registro
          if ('serialNumber' in item) {
            // Es una netbook
            if (item.currentState === 'FABRICADA') {
              monthlyData[monthYear].fabricadas++;
            }
          } else if (['FABRICANTE_ROLE', 'AUDITOR_HW_ROLE', 'TECNICO_SW_ROLE', 'ESCUELA_ROLE'].includes(item.role)) {
            // Es un usuario con rol específico en el sistema
            monthlyData[monthYear].distribuidas++;
          }
        });

        // Convertir a array ordenada por fecha
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

    if (!dataLoading) {
      processData();
    }
  }, [users, netbooks, dataLoading]);

  return { data, stats, isLoading, error };
}