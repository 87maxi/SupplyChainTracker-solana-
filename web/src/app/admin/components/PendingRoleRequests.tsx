// web/src/app/admin/components/PendingRoleRequests.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  RefreshCw, 
  Settings2,
  Network,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { AnalyticsChart } from '@/components/charts/AnalyticsChart';
import { getRoleRequests } from '@/services/RoleRequestService';
import { roleMapper } from '@/lib/roleMapping';
import { getRoleHashes } from '@/lib/roleUtils';
import { eventBus, EVENTS } from '@/lib/events';
import { useToast } from '@/hooks/use-toast';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useWeb3 } from '@/hooks/useWeb3';
import { RoleRequest } from '@/hooks/useRoleRequests';
import { UserRoleData } from '@/hooks/useRoleRequests';
import { RoleMap } from '@/lib/roleUtils';

// Definición de tipos
type RoleMember = {
  publicKey: string;
  role: string;
  timestamp: number;
};

type RoleRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const CACHE_CONFIG = {
  ttl: 5 * 60 * 1000, // 5 minutos
  maxAge: 10 * 60 * 1000 // 10 minutos
};

// Enumeración de estados de netbook
enum NetbookStatus {
  FABRICADA = 0,
  HW_APROBADO = 1,
  SW_VALIDADO = 2,
  DISTRIBUIDA = 3
}

// Componente de tarjeta de resumen
function SummaryCard({ title, count, description, icon: Icon, color }: { 
  title: string, 
  count: number, 
  description: string, 
  icon: any, 
  color: string 
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function PendingRoleRequests() {
  const { toast } = useToast();
  const { isConnected } = useWeb3();
  const { activeRoleNames } = useUserRoles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [roleMembers, setRoleMembers] = useState<Record<string, RoleMember[]>>({});
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [cache, setCache] = useState<Record<string, { data: any; timestamp: number }>>({});

  // Función para obtener datos con cache
  const getCachedData = async <T,>(key: string, fetcher: () => Promise<T>): Promise<T> => {
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttl) {
      return cached.data;
    }

    try {
      const data = await fetcher();
      setCache(prev => ({
        ...prev,
        [key]: { data, timestamp: Date.now() }
      }));
      return data;
    } catch (err) {
      setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      throw err;
    }
  };

  // Función para obtener miembros de roles
  const getRoleMembersCached = async (roleHash: string) => {
    return getCachedData(`roleMembers_${roleHash}`, () => getRoleMembers(roleHash));
  };

  // Función para obtener conteo de miembros
  const getRoleMemberCountCached = async (roleHash: string) => {
    return getCachedData(`roleMemberCount_${roleHash}`, () => getRoleMemberCount(roleHash));
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (!isConnected) return;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const roleHashes = await getRoleHashes();
        
        // Obtener miembros de roles
        const [adminMembers, fabricanteMembers, auditorHwMembers, tecnicoSwMembers, escuelaMembers] =
          await Promise.all([
            getRoleMembersCached(roleHashes.ADMIN_ROLE).catch(() => []),
            getRoleMembersCached(roleHashes.FABRICANTE_ROLE).catch(() => []),
            getRoleMembersCached(roleHashes.AUDITOR_HW_ROLE).catch(() => []),
            getRoleMembersCached(roleHashes.TECNICO_SW_ROLE).catch(() => []),
            getRoleMembersCached(roleHashes.ESCUELA_ROLE).catch(() => [])
          ]);

        setRoleMembers({
          ADMIN_ROLE: adminMembers,
          FABRICANTE_ROLE: fabricanteMembers,
          AUDITOR_HW_ROLE: auditorHwMembers,
          TECNICO_SW_ROLE: tecnicoSwMembers,
          ESCUELA_ROLE: escuelaMembers
        });

        // Obtener solicitudes de rol
        // const requests = await getRoleRequests();
        // setRoleRequests(requests);

        setLoading(false);
      } catch (err) {
        setError(`Error al cargar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isConnected]);

  // Manejar actualizaciones de eventos
  useEffect(() => {
    const handleRoleUpdate = () => {
      // Refrescar datos cuando hay actualizaciones de roles
      const loadUpdatedData = async () => {
        try {
          const roleHashes = await getRoleHashes();
          const [adminMembers, fabricanteMembers, auditorHwMembers, tecnicoSwMembers, escuelaMembers] =
            await Promise.all([
              getRoleMembersCached(roleHashes.ADMIN_ROLE).catch(() => []),
              getRoleMembersCached(roleHashes.FABRICANTE_ROLE).catch(() => []),
              getRoleMembersCached(roleHashes.AUDITOR_HW_ROLE).catch(() => []),
              getRoleMembersCached(roleHashes.TECNICO_SW_ROLE).catch(() => []),
              getRoleMembersCached(roleHashes.ESCUELA_ROLE).catch(() => [])
            ]);

          setRoleMembers({
            ADMIN_ROLE: adminMembers,
            FABRICANTE_ROLE: fabricanteMembers,
            AUDITOR_HW_ROLE: auditorHwMembers,
            TECNICO_SW_ROLE: tecnicoSwMembers,
            ESCUELA_ROLE: escuelaMembers
          });
        } catch (err) {
          setError(`Error al actualizar datos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      };

      loadUpdatedData();
    };

    eventBus.on(EVENTS.ROLE_UPDATED, handleRoleUpdate);
    return () => {
      eventBus.off(EVENTS.ROLE_UPDATED, handleRoleUpdate);
    };
  }, []);

  // Función para aprobar solicitud de rol
  const handleApproveRequest = async (requestId: string) => {
    try {
      // await updateRoleRequestStatus(requestId, 'APPROVED');
      toast({
        title: 'Solicitud aprobada',
        description: 'La solicitud de rol ha sido aprobada exitosamente.',
        variant: 'default'
      });
      // Refrescar datos
      eventBus.emit(EVENTS.ROLE_UPDATED);
    } catch (err) {
      toast({
        title: 'Error al aprobar solicitud',
        description: err instanceof Error ? err.message : 'Error al aprobar la solicitud',
        variant: 'destructive'
      });
    }
  };

  // Función para rechazar solicitud de rol
  const handleRejectRequest = async (requestId: string) => {
    try {
      // await updateRoleRequestStatus(requestId, 'REJECTED');
      toast({
        title: 'Solicitud rechazada',
        description: 'La solicitud de rol ha sido rechazada exitosamente.',
        variant: 'default'
      });
      // Refrescar datos
      eventBus.emit(EVENTS.ROLE_UPDATED);
    } catch (err) {
      toast({
        title: 'Error al rechazar solicitud',
        description: err instanceof Error ? err.message : 'Error al rechazar la solicitud',
        variant: 'destructive'
      });
    }
  };

  // Función para eliminar solicitud de rol
  const handleDeleteRequest = async (requestId: string) => {
    try {
      // await deleteRoleRequest(requestId);
      toast({
        title: 'Solicitud eliminada',
        description: 'La solicitud de rol ha sido eliminada exitosamente.',
        variant: 'default'
      });
      // Refrescar datos
      eventBus.emit(EVENTS.ROLE_UPDATED);
    } catch (err) {
      toast({
        title: 'Error al eliminar solicitud',
        description: err instanceof Error ? err.message : 'Error al eliminar la solicitud',
        variant: 'destructive'
      });
    }
  };

  // Función para refrescar datos
  const handleRefresh = () => {
    eventBus.emit(EVENTS.ROLE_UPDATED);
  };

  // Función para manejar completado del administrador de roles
  const handleRoleManagerComplete = () => {
    setShowRoleManager(false);
    eventBus.emit(EVENTS.ROLE_UPDATED);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calcular estadísticas
  const adminCount = roleMembers.ADMIN_ROLE?.length || 0;
  const fabricanteCount = roleMembers.FABRICANTE_ROLE?.length || 0;
  const auditorHwCount = roleMembers.AUDITOR_HW_ROLE?.length || 0;
  const tecnicoSwCount = roleMembers.TECNICO_SW_ROLE?.length || 0;
  const escuelaCount = roleMembers.ESCUELA_ROLE?.length || 0;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Solicitudes de Rol</h2>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de roles pendientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
          <Button 
            onClick={() => setShowRoleManager(true)}
            size="sm"
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Administrar Roles
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard 
          title="Administradores" 
          count={adminCount} 
          description="Total de administradores" 
          icon={ShieldCheck} 
          color="blue" 
        />
        <SummaryCard 
          title="Fabricantes" 
          count={fabricanteCount} 
          description="Total de fabricantes" 
          icon={Network} 
          color="green" 
        />
        <SummaryCard 
          title="Auditores HW" 
          count={auditorHwCount} 
          description="Total de auditores hardware" 
          icon={CheckCircle} 
          color="purple" 
        />
        <SummaryCard 
          title="Técnicos SW" 
          count={tecnicoSwCount} 
          description="Total de técnicos software" 
          icon={TrendingUp} 
          color="orange" 
        />
        <SummaryCard 
          title="Escuelas" 
          count={escuelaCount} 
          description="Total de escuelas" 
          icon={Clock} 
          color="red" 
        />
      </div>

      {/* Gráfico de análisis */}
      <AnalyticsChart />

      {/* Tabla de solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Usuario</th>
                  <th className="text-left p-4">Rol Solicitado</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Aquí irían las filas de solicitudes */}
                <tr className="border-b">
                  <td className="p-4">Usuario de prueba</td>
                  <td className="p-4">
                    <Badge variant="secondary">FABRICANTE_ROLE</Badge>
                  </td>
                  <td className="p-4">2026-05-12</td>
                  <td className="p-4">
                    <Badge variant="warning">Pendiente</Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleApproveRequest('1')}
                      >
                        Aprobar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRejectRequest('1')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}