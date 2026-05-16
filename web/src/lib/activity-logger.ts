// web/src/lib/activity-logger.ts
/**
 * Activity Logger v2 — In-memory activity log system
 *
 * Issue #211: Migrated from localStorage to in-memory state.
 * Provides real-time activity tracking without localStorage overhead.
 * Integrates with React Query for proper caching and invalidation.
 */

export interface ActivityLog {
  id: string;
  type: 'role_change' | 'token_created' | 'transfer' | 'approval' | 'system' | 'error';
  action: string;
  description: string;
  address: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  status: 'success' | 'pending' | 'failed';
}

const MAX_LOGS = 100; // In-memory cap for performance

// In-memory log store — no localStorage dependency
const inMemoryLogs: ActivityLog[] = [];

/**
 * Get all activity logs from in-memory store.
 * Returns logs sorted by timestamp (newest first).
 */
export const getActivityLogs = (): ActivityLog[] => {
  return [...inMemoryLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

/**
 * Add a new activity log entry.
 * Maintains bounded size (MAX_LOGS) for memory efficiency.
 */
export const logActivity = (log: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
  const newLog: ActivityLog = {
    ...log,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };

  inMemoryLogs.unshift(newLog);

  // Trim to MAX_LOGS
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.length = MAX_LOGS;
  }
};

/**
 * Clear all activity logs.
 * Useful for testing or manual reset.
 */
export const clearActivityLogs = (): void => {
  inMemoryLogs.length = 0;
};

/**
 * Get logs filtered by type.
 */
export const getActivityLogsByType = (type: ActivityLog['type']): ActivityLog[] => {
  return getActivityLogs().filter(log => log.type === type);
};

/**
 * Get logs filtered by status.
 */
export const getActivityLogsByStatus = (status: ActivityLog['status']): ActivityLog[] => {
  return getActivityLogs().filter(log => log.status === status);
};

// Helper functions para tipos específicos de logs
export const ActivityLogger = {
  roleChange: (address: string, action: string, role: string, status: 'success' | 'failed') => {
    logActivity({
      type: 'role_change',
      action,
      description: `${action} rol ${role}`,
      address,
      status,
      metadata: { role }
    });
  },

  tokenCreated: (address: string, tokenId: string, status: 'success' | 'failed') => {
    logActivity({
      type: 'token_created',
      action: 'create_token',
      description: `Token creado: ${tokenId}`,
      address,
      status,
      metadata: { tokenId }
    });
  },

  transfer: (address: string, from: string, to: string, tokenId: string, status: 'success' | 'failed') => {
    logActivity({
      type: 'transfer',
      action: 'transfer_token',
      description: `Transferencia de ${from} a ${to}`,
      address,
      status,
      metadata: { from, to, tokenId }
    });
  },

  approval: (address: string, action: string, requestId: string, status: 'success' | 'failed') => {
    logActivity({
      type: 'approval',
      action,
      description: `${action} solicitud ${requestId}`,
      address,
      status,
      metadata: { requestId }
    });
  },

  system: (action: string, description: string, metadata?: Record<string, unknown>) => {
    logActivity({
      type: 'system',
      action,
      description,
      address: 'system',
      status: 'success',
      metadata
    });
  },

  error: (address: string, action: string, error: string, metadata?: Record<string, unknown>) => {
    logActivity({
      type: 'error',
      action,
      description: `Error: ${error}`,
      address,
      status: 'failed',
      metadata: { error, ...metadata }
    });
  }
};

// Filtrar logs
export const filterLogs = (
  logs: ActivityLog[],
  filters: {
    type?: string;
    address?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  }
): ActivityLog[] => {
  return logs.filter(log => {
    if (filters.type && log.type !== filters.type) return false;
    if (filters.address && log.address !== filters.address) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const matches = 
        log.action.toLowerCase().includes(searchTerm) ||
        log.description.toLowerCase().includes(searchTerm) ||
        log.address.toLowerCase().includes(searchTerm);
      
      if (!matches) return false;
    }

    return true;
  });
};

// Obtener estadísticas de logs
export const getLogStats = (logs: ActivityLog[]) => {
  const stats = {
    total: logs.length,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    byAddress: {} as Record<string, number>,
    recent24h: logs.filter(log => 
      Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000
    ).length
  };

  logs.forEach(log => {
    stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
    stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
    stats.byAddress[log.address] = (stats.byAddress[log.address] || 0) + 1;
  });

  return stats;
};

// Limpiar logs antiguos (más de 30 días)
export const cleanupOldLogs = (): number => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const originalLength = inMemoryLogs.length;
  
  // Filter in-place for memory efficiency
  for (let i = inMemoryLogs.length - 1; i >= 0; i--) {
    if (inMemoryLogs[i].timestamp < thirtyDaysAgo) {
      inMemoryLogs.splice(i, 1);
    }
  }
  
  return originalLength - inMemoryLogs.length;
};