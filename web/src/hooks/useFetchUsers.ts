import { useState, useEffect } from 'react';

// Define user interface
export interface User {
  id: string;
  address: string;
  role: string;
  assignedAt: string;
  status: string;
  lastLogin: string;
  loginCount: number;
}

// Define pagination interface
export interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

// Define response interface
export interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: Pagination;
  error?: string;
}

// Custom hook to fetch users with pagination and filtering
export function useFetchUsers(params: { page?: number; limit?: number; role?: string; search?: string } = {}) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
  const { page = 1, limit = 10, role, search } = params;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', limit.toString());
      
      if (role) queryParams.append('role', role);
      if (search) queryParams.append('search', search);
      
      const response = await fetch(`/api/fetch-users?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: UsersResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setUsers([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsers, 30000);
    
    return () => clearInterval(interval);
  }, [params.page, params.limit, params.role, params.search]);
  
  return { users, pagination, isLoading, error, refetch: fetchUsers };
}