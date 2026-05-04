// web/src/components/admin/dashboard-metrics.tsx

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Factory, 
  Monitor, 
  GraduationCap, 
  Gavel, 
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { AllRolesSummary } from '@/types/supply-chain-types';
import { cn } from '@/lib/utils';

interface DashboardMetricsProps {
  rolesSummary: AllRolesSummary | null;
  pendingRequestsCount: number;
  recentActivity?: {
    tokensCreated: number;
    transfersCompleted: number;
    approvalsPending: number;
  };
  loading?: boolean;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  rolesSummary,
  pendingRequestsCount,
  recentActivity = { tokensCreated: 0, transfersCompleted: 0, approvalsPending: 0 },
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Solicitudes Pendientes',
      value: pendingRequestsCount,
      icon: Clock,
      color: 'text-amber-500',
      trend: pendingRequestsCount > 0 ? 'warning' : 'positive',
      description: 'Esperando aprobación'
    },
    {
      title: 'Tokens Creados',
      value: recentActivity.tokensCreated,
      icon: TrendingUp,
      color: 'text-blue-500',
      trend: 'positive',
      description: 'Últimas 24h'
    },
    {
      title: 'Transferencias',
      value: recentActivity.transfersCompleted,
      icon: CheckCircle,
      color: 'text-green-500',
      trend: 'positive',
      description: 'Completadas hoy'
    },
    {
      title: 'Pendientes Aprobación',
      value: recentActivity.approvalsPending,
      icon: AlertTriangle,
      color: 'text-red-500',
      trend: 'warning',
      description: 'Esperando acción'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={cn("h-4 w-4", metric.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
              {metric.trend === 'warning' && metric.value > 0 && (
                <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Necesita atención
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumen de Roles */}
      {rolesSummary && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <RoleMetricCard
            title="Administradores"
            count={rolesSummary.DEFAULT_ADMIN_ROLE?.count || 0}
            icon={Gavel}
            color="text-red-400"
          />
          <RoleMetricCard
            title="Fabricantes"
            count={rolesSummary.FABRICANTE_ROLE?.count || 0}
            icon={Factory}
            color="text-blue-400"
          />
          <RoleMetricCard
            title="Auditores HW"
            count={rolesSummary.AUDITOR_HW_ROLE?.count || 0}
            icon={ShieldCheck}
            color="text-emerald-400"
          />
          <RoleMetricCard
            title="Técnicos SW"
            count={rolesSummary.TECNICO_SW_ROLE?.count || 0}
            icon={Monitor}
            color="text-purple-400"
          />
          <RoleMetricCard
            title="Escuelas"
            count={rolesSummary.ESCUELA_ROLE?.count || 0}
            icon={GraduationCap}
            color="text-amber-400"
          />
        </div>
      )}
    </div>
  );
};

const RoleMetricCard: React.FC<{
  title: string;
  count: number;
  icon: React.ComponentType<any>;
  color: string;
}> = ({ title, count, icon: Icon, color }) => (
  <Card className="text-center hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <Icon className={cn("h-8 w-8 mx-auto mb-2", color)} />
      <div className="text-2xl font-bold">{count}</div>
      <p className="text-sm text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);