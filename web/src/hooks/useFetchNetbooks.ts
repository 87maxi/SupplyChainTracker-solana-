import { useState, useEffect } from 'react';

// Define netbook interface
export interface Netbook {
  id: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  productionDate: string;
  status: string;
  ownerAddress: string;
  processor: string;
  ram: string;
  storage: string;
  display: string;
}

// Define pagination interface
export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

// Define response interface
export interface NetbooksResponse {
  success: boolean;
  data: Netbook[];
  pagination: Pagination;
  error?: string;
}

// Custom hook to fetch netbooks with pagination and filtering
export function useFetchNetbooks(params: { page?: number; limit?: number; status?: string; manufacturer?: string; search?: string } = {}) {
  const [netbooks, setNetbooks] = useState<Netbook[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNetbooks = async () => {
  const { page = 1, limit = 10, status, manufacturer, search } = params;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      if (status) queryParams.append('status', status);
      if (manufacturer) queryParams.append('manufacturer', manufacturer);
      if (search) queryParams.append('search', search);
      
      const response = await fetch(`/api/fetch-netbooks?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: NetbooksResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch netbooks');
      }
      
      setNetbooks(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching netbooks:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setNetbooks([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNetbooks();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNetbooks, 30000);
    
    return () => clearInterval(interval);
  }, [params.page, params.limit, params.status, params.manufacturer, params.search]);
  
  return { netbooks, pagination, isLoading, error, refetch: fetchNetbooks };
}