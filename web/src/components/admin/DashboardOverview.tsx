"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, RefreshCw, Settings2,
  Building,
  Shield,
  Users,
  HardDrive,
  Monitor,
  GraduationCap,
  Package,
  CheckCircle,
  Network,
  TrendingUp
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { RoleManager } from '@/components/contracts/RoleManager';
import { Button } from '@/components/ui/button';
import { NetbookStatusChart } from '@/components/charts/NetbookStatusChart';
import { UserRolesChart } from '@/components/charts/UserRolesChart';
import { AnalyticsChart } from '@/components/charts/AnalyticsChart';
import { useWeb3 } from '@/hooks/useWeb3';
import {
  getRoleMembers,
  getRoleMemberCount,
  getNetbooksByState,
  revalidateAll
} from '@/lib/api/serverRpc';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionConfirmation } from '@/components/contracts/TransactionConfirmation';
import { truncateAddress, cn } from '@/lib/utils';
import { getRoleHashes } from '@/lib/roleUtils';
import { getRoleRequests, updateRoleRequestStatus, deleteRoleRequest } from '@/services/RoleRequestService';
import { RoleRequest } from '@/types/role-request';
import * as SupplyChainContract from '@/lib/contracts/SupplyChainContract';

// Cache configuration
const CACHE_CONFIG = {
  DASHBOARD_DATA: 'dashboard-data',
  REFRESH_INTERVAL: 30000 // 30 seconds
};

// Dashboard data types
interface DashboardStats {
  fabricanteCount: number;
  auditorHwCount: number;
  tecnicoSwCount: number;
  escuelaCount: number;
  totalFabricadas: number;
  totalHwAprobadas: number;
  totalSwValidadas: number;
  totalDistribuidas: number;
}

interface UserRoleData {
  role: string;
  address: string;
  since: string;
  status: 'active' | 'inactive';
  id?: string;
}


// Summary Card Component
function SummaryCard({ title, count, description, icon: Icon, color }: { title: string, count: number, description: string, icon: any, color: string }) {
  return (
    <Card className="relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity", color)}>
        <Icon className="h-16 w-16" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold mb-1">{count}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

// State enum for better type safety
enum State {
  FABRICADA = 0,
  HW_APROBADO = 1,
  SW_VALIDADO = 2,
  DISTRIBUIDA = 3
}

export function DashboardOverview({ stats: initialStats }: { stats: DashboardStats }) {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  // In a real app, this would be fetched from the contract
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RoleRequest[]>([]);

  const fetchRoleRequests = async () => {
    try {
      const requests = await getRoleRequests();
      setPendingRequests(requests.filter(req => req.status === 'pending'));
    } catch (error) {
      console.error('Error fetching role requests:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const roleHashes = await getRoleHashes();

      const [adminMembers, fabricanteMembers, auditorHwMembers, tecnicoSwMembers, escuelaMembers] =
        await Promise.all([
          getRoleMembers(roleHashes.ADMIN).catch(() => []),
          getRoleMembers(roleHashes.FABRICANTE).catch(() => []),
          getRoleMembers(roleHashes.AUDITOR_HW).catch(() => []),
          getRoleMembers(roleHashes.TECNICO_SW).catch(() => []),
          getRoleMembers(roleHashes.ESCUELA).catch(() => [])
        ]);

      const allUserRoles: UserRoleData[] = [];

      adminMembers.forEach((address: string, index: number) => {
        allUserRoles.push({
          id: `admin-${index}`,
          address,
          role: 'admin',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      fabricanteMembers.forEach((address: string, index: number) => {
        allUserRoles.push({
          id: `fabricante-${index}`,
          address,
          role: 'fabricante',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      auditorHwMembers.forEach((address: string, index: number) => {
        allUserRoles.push({
          id: `auditor_hw-${index}`,
          address,
          role: 'auditor_hw',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      tecnicoSwMembers.forEach((address: string, index: number) => {
        allUserRoles.push({
          id: `tecnico_sw-${index}`,
          address,
          role: 'tecnico_sw',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      escuelaMembers.forEach((address: string, index: number) => {
        allUserRoles.push({
          id: `escuela-${index}`,
          address,
          role: 'escuela',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      setUserRoles(allUserRoles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchDashboardData = async (silent = false) => {
    if (!isConnected || !address) return;

    try {
      // Get role hashes from the contract
      const roleHashes = await getRoleHashes();

      const [
        fabricanteCount, auditorHwCount, tecnicoSwCount, escuelaCount,
        fabricadas, hwAprobadas, swValidadas, distribuidas
      ] = await Promise.all([
        getRoleMemberCount(roleHashes.FABRICANTE).catch(() => 0),
        getRoleMemberCount(roleHashes.AUDITOR_HW).catch(() => 0),
        getRoleMemberCount(roleHashes.TECNICO_SW).catch(() => 0),
        getRoleMemberCount(roleHashes.ESCUELA).catch(() => 0),
        getNetbooksByState(State.FABRICADA).catch(() => []),
        getNetbooksByState(State.HW_APROBADO).catch(() => []),
        getNetbooksByState(State.SW_VALIDADO).catch(() => []),
        getNetbooksByState(State.DISTRIBUIDA).catch(() => [])
      ]);

      setStats({
        fabricanteCount,
        auditorHwCount,
        tecnicoSwCount,
        escuelaCount,
        totalFabricadas: fabricadas.length,
        totalHwAprobadas: hwAprobadas.length,
        totalSwValidadas: swValidadas.length,
        totalDistribuidas: distribuidas.length
      });

      if (!silent) {
        toast({
          title: "Datos actualizados",
          description: "El panel de administración se ha actualizado correctamente.",
        });
      }

      revalidateAll();
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del panel.",
          variant: "destructive"
        });
      }
    }
  };

  const refreshAllData = async (silent = false) => {
    if (!isConnected || !address) return;

    if (!silent) setIsLoading(true);

    await Promise.all([
      fetchDashboardData(silent),
      fetchUserRoles(),
      fetchRoleRequests()
    ]);

    setIsLoading(false);
  };
  const [error, setError] = useState<string | null>(null);

  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    description: '',
    warning: '',
    onConfirm: () => Promise.resolve()
  });

  // Handle role manager completion
  const handleRoleManagerComplete = () => {
    refreshAllData();
    toast({
      title: "Roles actualizados",
      description: "Los roles del sistema se han actualizado correctamente.",
      variant: "default"
    });
  };

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApproveRequest = async (request: RoleRequest) => {
    try {
      setProcessingId(request.id);
      if (!address) {
        throw new Error("No hay una billetera conectada");
      }

      // Call the service to update status AND grant role on-chain
      await updateRoleRequestStatus(request.id, 'approved');

      // Optimistic update: Remove request from list immediately
      setPendingRequests(prev => prev.filter(req => req.id !== request.id));

      // Refresh stats and roles
      fetchDashboardData(true);
      fetchUserRoles();

      toast({
        title: "Solicitud aprobada",
        description: `El rol ${request.role} ha sido asignado a ${truncateAddress(request.address)}`,
      });
    } catch (error: any) {
      console.error('Error approving request:', error);

      let errorMessage = error.message || "No se pudo aprobar la solicitud";
      if (error.message?.includes("AccessControl")) {
        errorMessage = "No tienes permisos de administrador para realizar esta acción.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      setProcessingId(id);
      await updateRoleRequestStatus(id, 'rejected');

      // Optimistic update
      setPendingRequests(prev => prev.filter(req => req.id !== id));

      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada correctamente.",
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle confirmation dialog
  const confirmAction = (title: string, description: string, warning: string, onConfirm: () => Promise<void>) => {
    setConfirmationDialog({
      open: true,
      title,
      description,
      warning,
      onConfirm
    });
  };

  // Refresh data when component mounts or connection changes
  useEffect(() => {
    refreshAllData();

    // Set up periodic refresh
    const interval = setInterval(() => {
      refreshAllData(true);
    }, CACHE_CONFIG.REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [isConnected, address]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-2"><Skeleton className="h-8 w-64" /></h2>
            <p className="text-muted-foreground text-lg"><Skeleton className="h-4 w-96" /></p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" variant="outline" className="h-12 px-6">
              <Skeleton className="h-5 w-20" />
            </Button>
            <Button size="lg" variant="gradient" className="h-12 px-8 shadow-lg">
              <Skeleton className="h-5 w-24" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-bold tracking-tight"><Skeleton className="h-6 w-48" /></h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-bold tracking-tight"><Skeleton className="h-6 w-40" /></h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight">Panel de Administración</h2>
          <Button onClick={() => fetchDashboardData()}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  // Main dashboard content
  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-bold tracking-tight mb-2">Panel de Administración</h2>
          <p className="text-muted-foreground text-lg">Gestión global de la red de suministro y permisos de usuario.</p>
        </div>
        <div className="flex gap-4">
          <Button
            size="lg"
            variant="outline"
            onClick={() => refreshAllData()}
            className="h-12 px-6"
            disabled={isLoading}
          >
            <RefreshCw className={`mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
          <Button size="lg" variant="gradient" onClick={() => setShowRoleManager(true)} className="h-12 px-8 shadow-lg">
            <Settings2 className="mr-2 h-5 w-5" />
            Gestión de Roles
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold tracking-tight">Estado de las Netbooks</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Fabricadas"
            count={stats.totalFabricadas}
            description="Netbooks en estado inicial."
            icon={HardDrive}
            color="text-blue-400"
          />
          <SummaryCard
            title="HW Aprobado"
            count={stats.totalHwAprobadas}
            description="Hardware auditado correctamente."
            icon={CheckCircle}
            color="text-emerald-400"
          />
          <SummaryCard
            title="SW Validado"
            count={stats.totalSwValidadas}
            description="Software certificado e instalado."
            icon={Monitor}
            color="text-purple-400"
          />
          <SummaryCard
            title="Distribuidas"
            count={stats.totalDistribuidas}
            description="Entregadas a su destino final."
            icon={Package}
            color="text-amber-400"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="text-2xl font-bold tracking-tight">Roles de los Usuarios</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Fabricantes"
            count={stats.fabricanteCount}
            description="Entidades de producción."
            icon={Building}
            color="text-blue-400"
          />
          <SummaryCard
            title="Auditores HW"
            count={stats.auditorHwCount}
            description="Verificadores de hardware."
            icon={Shield}
            color="text-rose-400"
          />
          <SummaryCard
            title="Técnicos SW"
            count={stats.tecnicoSwCount}
            description="Especialistas en software."
            icon={Monitor}
            color="text-indigo-400"
          />
          <SummaryCard
            title="Escuelas"
            count={stats.escuelaCount}
            description="Instituciones educativas."
            icon={GraduationCap}
            color="text-emerald-400"
          />
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h3 className="text-2xl font-bold tracking-tight">Solicitudes de Rol Pendientes</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Usuario</th>
                      <th className="px-6 py-4 font-medium">Rol Solicitado</th>
                      <th className="px-6 py-4 font-medium">Fecha</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">
                          {truncateAddress(request.address)}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {request.role.replace('_', ' ')}
                          </Badge>
                          {request.signature && (
                            <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Firmada
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(request.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => handleApproveRequest(request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Aprobar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingId === request.id}
                          >
                            Rechazar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <NetbookStatusChart data={[
          { status: 'Fabricadas', count: stats.totalFabricadas, fill: 'hsl(var(--chart-1))' },
          { status: 'HW Aprobado', count: stats.totalHwAprobadas, fill: 'hsl(var(--chart-2))' },
          { status: 'SW Validado', count: stats.totalSwValidadas, fill: 'hsl(var(--chart-3))' },
          { status: 'Distribuidas', count: stats.totalDistribuidas, fill: 'hsl(var(--chart-4))' },
        ]} />
        <UserRolesChart data={[
          { role: 'Fabricantes', count: stats.fabricanteCount, fill: 'hsl(var(--chart-1))' },
          { role: 'Auditores HW', count: stats.auditorHwCount, fill: 'hsl(var(--chart-2))' },
          { role: 'Técnicos SW', count: stats.tecnicoSwCount, fill: 'hsl(var(--chart-3))' },
          { role: 'Escuelas', count: stats.escuelaCount, fill: 'hsl(var(--chart-4))' },
        ]} />
      </div>

      {/* Analytics chart hidden as we don't have historical data yet */}
      {/* <AnalyticsChart data={[]} /> */}

      {/* 
        <RoleManager
          isOpen={showRoleManager}
          onOpenChange={(open) => setShowRoleManager(open)}
          onComplete={() => {
            setShowRoleManager(false);
            fetchDashboardData();
          }}
        />
      */}

      <TransactionConfirmation
        open={confirmationDialog.open}
        onOpenChange={(open) => setConfirmationDialog(prev => ({ ...prev, open }))}
        title={confirmationDialog.title}
        description={confirmationDialog.description}
        warning={confirmationDialog.warning}
        onConfirm={async () => {
          await confirmationDialog.onConfirm();
          setConfirmationDialog(prev => ({ ...prev, open: false }));
        }}
      />
    </div>
  );
}