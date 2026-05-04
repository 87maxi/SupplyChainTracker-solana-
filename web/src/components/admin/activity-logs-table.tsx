// web/src/components/admin/activity-logs-table.tsx

'use client';

import React from 'react';
import { 
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Gavel
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ActivityLog } from '@/lib/activity-logger';

interface ActivityLogsTableProps {
  logs: ActivityLog[];
}

// Icons por tipo de log
const typeIcons = {
  role_change: UserPlus,
  token_created: TrendingUp,
  transfer: ShieldCheck,
  approval: CheckCircle,
  system: Gavel,
  error: AlertCircle
};

// Colores por tipo
const typeColors = {
  role_change: 'bg-blue-100 text-blue-800 border-blue-200',
  token_created: 'bg-green-100 text-green-800 border-green-200',
  transfer: 'bg-purple-100 text-purple-800 border-purple-200',
  approval: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  system: 'bg-gray-100 text-gray-800 border-gray-200',
  error: 'bg-red-100 text-red-800 border-red-200'
};

// Colores por estado
const statusColors = {
  success: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  failed: 'bg-red-100 text-red-800 border-red-200'
};

export const ActivityLogsTable: React.FC<ActivityLogsTableProps> = ({ logs }) => {
  // Obtener icono por tipo
  const getIcon = (type: string) => {
    const Icon = typeIcons[type as keyof typeof typeIcons] || Clock;
    return <Icon className="h-4 w-4" />;
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No se encontraron registros de actividad</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b text-left text-sm font-medium text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-12"></th>
            <th className="px-4 py-3">Acción</th>
            <th className="px-4 py-3">Descripción</th>
            <th className="px-4 py-3">Dirección</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 text-primary">
                {getIcon(log.type)}
              </td>
              <td className="px-4 py-3 font-medium">
                <Badge variant="outline" className={typeColors[log.type] || ''}>
                  {log.action}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">
                {log.description}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[150px] truncate">
                {log.address}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={statusColors[log.status] || ''}>
                  {log.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};