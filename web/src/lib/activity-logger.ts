// web/src/lib/activity-logger.ts

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

const ACTIVITY_LOG_KEY = 'supply-chain-activity-logs';
const MAX_LOGS = 1000; // Máximo número de logs a mantener

// Obtener logs del localStorage
export const getActivityLogs = (): ActivityLog[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
    if (!stored) return [];
    
    const logs = JSON.parse(stored);
    return logs.map((log: Record<string, unknown>) => ({
      ...log,
      timestamp: new Date(log.timestamp)
    }));
  } catch (error) {
    console.error('Error reading activity logs:', error);
    return [];
  }
};

// Guardar nuevo log
export const logActivity = (log: Omit<ActivityLog, 'id' | 'timestamp'>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const logs = getActivityLogs();
    const newLog: ActivityLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };

    // Mantener solo los logs más recientes
    const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS);
    
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error('Error saving activity log:', error);
  }
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
  const logs = getActivityLogs();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const filteredLogs = logs.filter(log => log.timestamp > thirtyDaysAgo);
  
  if (filteredLogs.length !== logs.length) {
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(filteredLogs));
    return logs.length - filteredLogs.length;
  }
  
  return 0;
};