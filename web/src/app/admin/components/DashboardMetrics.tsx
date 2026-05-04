// web/src/app/admin/components/DashboardMetrics.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Factory, Monitor, GraduationCap, Gavel, ShieldCheck, Clock, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { AllRolesSummary } from '@/types/supply-chain-types';
import { cn } from '@/lib/utils';

interface DashboardMetricsProps {
  rolesSummary: AllRolesSummary | null;
  pendingRequestsCount: number;
  logs?: any[];
  loading?: boolean;
}

// Componente para el resumen de roles
function RoleMetricCard({
  title,
  count,
  icon: Icon,
  color
}: {
  title: string;
  count: number;
  icon: React.ComponentType<any>;
  color: string;
}) {
  return (
    <Card className="text-center hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <Icon className={cn("h-8 w-8 mx-auto mb-2", color)} />
        <div className="text-2xl font-bold mb-1">{count}</div>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
      </CardContent>
    </Card>
  );
}

export const DashboardMetrics = ({
  rolesSummary,
  pendingRequestsCount,
  logs = [],
  loading = false
}: DashboardMetricsProps) => {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-3 bg-muted rounded w-1/3 mb-3"></div>
              <div className="h-5 bg-muted rounded w-1/2"></div>
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
      title: 'Usuarios Totales',
      value: rolesSummary ? Object.values(rolesSummary).reduce((acc, curr) => acc + curr.count, 0) : 0,
      icon: Users,
      color: 'text-blue-500',
      trend: 'positive',
      description: 'Registrados en el sistema'
    },
    {
      title: 'Roles Activos',
      value: rolesSummary ? Object.values(rolesSummary).filter(r => r.count > 0).length : 0,
      icon: ShieldCheck,
      color: 'text-green-500',
      trend: 'positive',
      description: 'Con miembros asignados'
    },
    {
      title: 'Alertas de Sistema',
      value: logs.filter(l => l.type === 'error').length,
      icon: AlertTriangle,
      color: 'text-red-500',
      trend: logs.filter(l => l.type === 'error').length > 0 ? 'warning' : 'positive',
      description: logs.filter(l => l.type === 'error').length > 0 ? 'Requiere revisión' : 'Sin incidencias'
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
              {/* Asumiendo que los íconos están disponibles en un componente de íconos o similar */}
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