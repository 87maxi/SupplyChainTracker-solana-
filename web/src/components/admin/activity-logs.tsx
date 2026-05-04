// web/src/components/admin/activity-logs.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  History,
  Search,
  Filter,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ActivityLog,
  filterLogs,
  getLogStats
} from '@/lib/activity-logger';
import { format } from 'date-fns';

interface ActivityLogsProps {
  logs?: ActivityLog[];
}

import { ActivityLogsTable } from './activity-logs-table';

export const ActivityLogs: React.FC<ActivityLogsProps> = ({
  logs: externalLogs
}) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [addressFilter, setAddressFilter] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  // Cargar logs del localStorage si no se proporcionaron externamente
  useEffect(() => {
    const localLogs = externalLogs || getActivityLogs();
    setLogs(localLogs);
    setFilteredLogs(localLogs);
    setStats(getLogStats(localLogs));
  }, [externalLogs]);

  // Filtrar logs cuando cambian los filtros
  useEffect(() => {
    const filters = {
      type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      address: addressFilter || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: searchTerm || undefined
    };

    const filtered = filterLogs(logs, filters);
    setFilteredLogs(filtered);
    setStats(getLogStats(filtered));
  }, [logs, searchTerm, typeFilter, statusFilter, addressFilter, startDate, endDate]);

  // Obtener logs del localStorage (si no se proporcionan externamente)
  const getActivityLogs = (): ActivityLog[] => {
    if (externalLogs) return externalLogs;

    try {
      if (typeof window === 'undefined') return [];

      const stored = localStorage.getItem('supply-chain-activity-logs');
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return parsed.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Error reading activity logs:', error);
      return [];
    }
  };

  // Exportar logs a CSV
  const exportLogs = () => {
    const headers = ['ID', 'Tipo', 'Acción', 'Descripción', 'Dirección', 'Estado', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log =>
        `${log.id},${log.type},${log.action},${log.description.replace(/,/g, ';')},${log.address},${log.status},${format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-xl">Actividad del Sistema</CardTitle>
              <CardDescription>Registro completo de acciones y eventos</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.recent24h}</div>
              <div className="text-sm text-muted-foreground">Últimas 24h</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.byStatus.success || 0}</div>
              <div className="text-sm text-muted-foreground">Éxitos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed || 0}</div>
              <div className="text-sm text-muted-foreground">Errores</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="p-4 border-b grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="role_change">Cambios de Rol</SelectItem>
              <SelectItem value="token_created">Tokens Creados</SelectItem>
              <SelectItem value="transfer">Transferencias</SelectItem>
              <SelectItem value="approval">Aprobaciones</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="error">Errores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="success">Éxito</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="failed">Fallido</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Dirección..."
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Tabla de Logs */}
        <ActivityLogsTable logs={filteredLogs} />
      </CardContent>
    </Card>
  );
}
