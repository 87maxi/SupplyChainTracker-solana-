// web/src/app/dashboard/page.tsx
"use client";

// Importaciones actualizadas para Solana/Anchor
import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { Netbook, NetbookState } from '@/types/supply-chain-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState, useCallback } from 'react';
import { RoleActions } from './components/RoleActions';
import { PendingRoleApprovals } from './components/role-approval/PendingRoleApprovals';

import {
  Package,
  ShieldCheck,
  Monitor,
  Truck,
  Search,
  LayoutDashboard,
  Loader2,
  Users,
  Shield,
  Building2,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { useUserRoles } from '@/hooks/useUserRoles';
import { HardwareAuditForm } from '@/components/contracts/HardwareAuditForm';
import { SoftwareValidationForm } from '@/components/contracts/SoftwareValidationForm';
import { StudentAssignmentForm } from '@/components/contracts/StudentAssignmentForm';

// Importar componentes de estadísticas y tablas
import { UserDataTable } from '@/app/dashboard/components/UserDataTable';
import { NetbookDataTable } from '@/app/dashboard/components/NetbookDataTable';

// Importar Solana service directamente
import { SolanaSupplyChainService } from '@/services/SolanaSupplyChainService';
import { PublicKey } from '@solana/web3.js';

import { TrackingCard } from './components/TrackingCard';

// Interface for complete config data with role counts
interface ExtendedConfigData {
  admin: PublicKey;
  fabricante: PublicKey;
  auditorHw: PublicKey;
  tecnicoSw: PublicKey;
  escuela: PublicKey;
  adminBump: number;
  nextTokenId: any;
  totalNetbooks: any;
  roleRequestsCount: any;
  fabricanteCount: number;
  auditorHwCount: number;
  tecnicoSwCount: number;
  escuelaCount: number;
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

// Stat Card for role holders
function RoleHolderCard({ title, count, description, icon: Icon, color }: { title: string, count: number, description: string, icon: any, color: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className={cn("rounded-full p-2", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Temporary Dashboard for non-connected state
function TempDashboard({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary animate-pulse">
          <LayoutDashboard className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Panel de Control</h1>
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <p className="text-xl text-muted-foreground text-center max-w-md">
              Conecta tu wallet para acceder al sistema de trazabilidad y gestionar tus netbooks.
            </p>
            <Button size="lg" variant="gradient" onClick={onConnect} className="h-12 px-8">
              Conectar Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Network Status Badge
function NetworkStatusBadge({ isConnected, isSyncing }: { isConnected: boolean, isSyncing: boolean }) {
  return (
    <div className="flex items-center gap-3 bg-gradient-subtle p-2 rounded-xl border border-white/10 shadow-lg">
      <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500")}>
      </div>
      <span className="text-sm font-medium">
        {isSyncing ? "Sincronizando..." : isConnected ? "Sistema en línea" : "Desconectado"}
      </span>
    </div>
  );
}

// Error Banner Component
function ErrorBanner({ message, onDismiss }: { message: string, onDismiss: () => void }) {
  return (
    <Card className="border-red-500/50 bg-red-500/10">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-400 flex-1">{message}</p>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerDashboard() {
  // Obtener datos desde Solana program
  const [netbooks, setNetbooks] = useState<Netbook[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New state for extended dashboard data
  const [configData, setConfigData] = useState<ExtendedConfigData | null>(null);
  const [roleHolderCounts, setRoleHolderCounts] = useState({
    fabricante: 0,
    auditorHw: 0,
    tecnicoSw: 0,
    escuela: 0
  });
  const [totalRoleRequests, setTotalRoleRequests] = useState(0);
  const [systemUptime, setSystemUptime] = useState<number | null>(null);

  // Funciones para manejar filtros
  const handleUserFilterChange = (filter: { key: string; value: string }) => {
    console.log('User filter changed:', filter);
  };

  const handleNetbookFilterChange = (filter: { key: string; value: string }) => {
    console.log('Netbook filter changed:', filter);
  };

  const { isConnected, connectWallet, publicKey } = useSolanaWeb3();
  const { getAllSerialNumbers, getNetbookState, getNetbookReport, getConfig } = useSupplyChainService();
  const { isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();

  // Fetch netbooks from Solana program
  const fetchDashboardData = useCallback(async () => {
    if (!isConnected) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsSyncing(true);
    setError(null);
    
    try {
      // Fetch config data first
      const config = await getConfig();
      if (config) {
        const extendedConfig = config as ExtendedConfigData;
        setConfigData(extendedConfig);
        
        // Extract role holder counts
        setRoleHolderCounts({
          fabricante: extendedConfig.fabricanteCount || 0,
          auditorHw: extendedConfig.auditorHwCount || 0,
          tecnicoSw: extendedConfig.tecnicoSwCount || 0,
          escuela: extendedConfig.escuelaCount || 0
        });
        
        setTotalRoleRequests(extendedConfig.roleRequestsCount?.toNumber() || 0);
        
        // Calculate system uptime from initialization (if we had timestamp)
        // For now, we'll just track the total netbooks count
        const totalNetbooks = extendedConfig.totalNetbooks?.toNumber() || 0;
      }

      const serials = await getAllSerialNumbers();
      const stateMap: Record<number, NetbookState> = {
        0: 'FABRICADA',
        1: 'HW_APROBADO',
        2: 'SW_VALIDADO',
        3: 'DISTRIBUIDA'
      };

      const netbooksData: Netbook[] = [];
      for (const serial of serials) {
        const state = await getNetbookState(serial);
        const rawReport = await getNetbookReport(serial);
        const report = rawReport ? { hwAuditor: (rawReport as any).hwAuditor || '', swTechnician: (rawReport as any).swTechnician || '' } : { hwAuditor: '', swTechnician: '' };

        netbooksData.push({
          serialNumber: serial,
          batchId: "N/A",
          initialModelSpecs: "N/A",
          hwAuditor: report.hwAuditor,
          hwIntegrityPassed: false,
          hwReportHash: "0x0",
          swTechnician: report.swTechnician,
          osVersion: "N/A",
          swValidationPassed: false,
          destinationSchoolHash: "0x0",
          studentIdHash: "0x0",
          distributionTimestamp: "0",
          currentState: stateMap[Number(state)] || 'FABRICADA',
        });
      }

      setNetbooks(netbooksData);

      // Fetch users from Solana config
      try {
        const service = SolanaSupplyChainService.getInstance();
        const config = await service.getConfig();
        if (config) {
          const userList: any[] = [];
          if (config.fabricante) userList.push({ address: config.fabricante.toBase58(), role: 'FABRICANTE' });
          if (config.auditorHw) userList.push({ address: config.auditorHw.toBase58(), role: 'AUDITOR_HW' });
          if (config.tecnicoSw) userList.push({ address: config.tecnicoSw.toBase58(), role: 'TECNICO_SW' });
          if (config.escuela) userList.push({ address: config.escuela.toBase58(), role: 'ESCUELA' });
          setUsers(userList);
        }
      } catch {
        // Config not initialized or error fetching
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(`Error al cargar datos: ${err.message || 'Desconocido'}`);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [isConnected, getAllSerialNumbers, getNetbookState, getNetbookReport, getConfig]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Calcular estadísticas desde Solana
  const summary = {
    FABRICADA: netbooks.filter(n => n.currentState === 'FABRICADA').length,
    HW_APROBADO: netbooks.filter(n => n.currentState === 'HW_APROBADO').length,
    SW_VALIDADO: netbooks.filter(n => n.currentState === 'SW_VALIDADO').length,
    DISTRIBUIDA: netbooks.filter(n => n.currentState === 'DISTRIBUIDA').length
  };

  // Total netbooks from config
  const totalNetbooksFromConfig = configData?.totalNetbooks?.toNumber() || 0;
  const nextTokenId = configData?.nextTokenId?.toNumber() || 0;

  // Filtrar tareas pendientes basado en roles
  const pendingTasks = netbooks.filter((n: Netbook) => {
    if (!n) return false;
    if ((n.currentState === 'FABRICADA') && (isHardwareAuditor || isAdmin)) return true;
    if ((n.currentState === 'HW_APROBADO') && (isSoftwareTechnician || isAdmin)) return true;
    if ((n.currentState === 'SW_VALIDADO') && (isSchool || isAdmin)) return true;
    return false;
  });

  const netbooksForTable = netbooks;

  // Form states
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  const handleDeleteUser = async (address: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar todos los roles de la cuenta ${address}?`)) {
      return;
    }

    if (!publicKey) {
      alert('Conecta tu wallet primero');
      return;
    }

    try {
      const service = SolanaSupplyChainService.getInstance();
      const targetAddress = new PublicKey(address);
      // Revoke all roles for the target address
      await service.revokeRole('FABRICANTE_ROLE', targetAddress);
      await service.revokeRole('AUDITOR_HW_ROLE', targetAddress);
      await service.revokeRole('TECNICO_SW_ROLE', targetAddress);
      await service.revokeRole('ESCUELA_ROLE', targetAddress);
      
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error revoking roles:', error);
      alert(`Error al eliminar roles: ${error.message}`);
    }
  };

  // Enhanced action handler with debugging
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/rules-of-hooks
  const handleAction = useCallback((action: string, serial: string) => {
    console.log('Handling action:', { action, serial });
    setSelectedSerial(serial);

    switch (action) {
      case 'audit':
        setShowAuditForm(true);
        console.log('Audit form state set to:', true);
        break;
      case 'validate':
        setShowValidationForm(true);
        console.log('Validation form state set to:', true);
        break;
      case 'assign':
        setShowAssignmentForm(true);
        console.log('Assignment form state set to:', true);
        break;
    }
  }, [setSelectedSerial, setShowAuditForm, setShowValidationForm, setShowAssignmentForm]);



  if (!isConnected) {
    return <TempDashboard onConnect={connectWallet} />;
  }



  return (
    <div className="container mx-auto px-4 py-12 space-y-12 relative">
      <div className="absolute inset-0 bg-gradient-overlay opacity-30 pointer-events-none"></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Resumen General</h1>
          <p className="text-muted-foreground">Estado actual de la cadena de suministro de netbooks.</p>
        </div>
        <NetworkStatusBadge isConnected={isConnected} isSyncing={isSyncing} />
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      )}

      <RoleActions />

      {(isHardwareAuditor || isSoftwareTechnician || isSchool || isAdmin) && (
        <PendingRoleApprovals />
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg text-muted-foreground animate-pulse">Sincronizando con la blockchain...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="En fabricación" count={summary.FABRICADA} description="Netbooks registradas pendientes de auditoría." icon={Package} color="text-blue-400" />
            <SummaryCard title="HW Aprobado" count={summary.HW_APROBADO} description="Hardware verificado por auditores." icon={ShieldCheck} color="text-emerald-400" />
            <SummaryCard title="SW Validado" count={summary.SW_VALIDADO} description="Software instalado y certificado." icon={Monitor} color="text-purple-400" />
            <SummaryCard title="Entregadas" count={summary.DISTRIBUIDA} description="Distribuidas a instituciones finales." icon={Truck} color="text-amber-400" />
          </div>

          {/* System Statistics */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Estadísticas del Sistema
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <RoleHolderCard 
                title="Total Registradas" 
                count={totalNetbooksFromConfig} 
                description={`Próximo ID: ${nextTokenId}`}
                icon={Package}
                color="bg-blue-500/20 text-blue-500"
              />
              <RoleHolderCard 
                title="Fabricantes" 
                count={roleHolderCounts.fabricante} 
                description="Cuentas con rol FABRICANTE"
                icon={Building2}
                color="bg-blue-500/20 text-blue-500"
              />
              <RoleHolderCard 
                title="Auditores HW" 
                count={roleHolderCounts.auditorHw} 
                description="Cuentas con rol AUDITOR_HW"
                icon={ShieldCheck}
                color="bg-emerald-500/20 text-emerald-500"
              />
              <RoleHolderCard 
                title="Técnicos SW" 
                count={roleHolderCounts.tecnicoSw} 
                description="Cuentas con rol TECNICO_SW"
                icon={Monitor}
                color="bg-purple-500/20 text-purple-500"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <RoleHolderCard 
                title="Escuelas" 
                count={roleHolderCounts.escuela} 
                description="Cuentas con rol ESCUELA"
                icon={Building2}
                color="bg-amber-500/20 text-amber-500"
              />
              <RoleHolderCard 
                title="Solicitudes de Rol" 
                count={totalRoleRequests} 
                description="Solicitudes pendientes o procesadas"
                icon={Users}
                color="bg-orange-500/20 text-orange-500"
              />
            </div>
          </div>

          {/* Pending Tasks Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                Tareas Pendientes
              </h2>
              {pendingTasks.length > 0 && (
                <Badge variant="success" className="px-3">
                  {pendingTasks.length} Acciones requeridas
                </Badge>
              )}
            </div>

            {pendingTasks.length > 0 ? (
              <div className="grid gap-4">
                {pendingTasks.map((netbook) => (
                  <TrackingCard key={netbook.serialNumber} netbook={netbook} onAction={handleAction} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-white/10 bg-white/5">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">¡Todo al día!</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      No tienes tareas pendientes asignadas a tu rol en este momento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tracking List */}
          {/* Renderizar las tablas con filtros */}
          <div className="grid gap-8 md:grid-cols-2">
            <UserDataTable
              data={users as any}
              onFilterChange={handleUserFilterChange}
              onDelete={handleDeleteUser}
            />
            <NetbookDataTable
              data={netbooksForTable}
              onFilterChange={handleNetbookFilterChange}
            />
          </div>
        </>
      )}

      {/* Forms - Conditional rendering to ensure proper state management */}
      {showAuditForm && (
        <HardwareAuditForm
          isOpen={showAuditForm}
          onOpenChange={setShowAuditForm}
          onComplete={() => {
            console.log('Audit form completed, refetching data');
            fetchDashboardData();
            // Reset form state
            setSelectedSerial('');
            setShowAuditForm(false);
          }}
          initialSerial={selectedSerial}
        />
      )}
      {showValidationForm && (
        <SoftwareValidationForm
          isOpen={showValidationForm}
          onOpenChange={setShowValidationForm}
          onComplete={() => {
            console.log('Validation form completed, refetching data');
            fetchDashboardData();
            // Reset form state
            setSelectedSerial('');
            setShowValidationForm(false);
          }}
          initialSerial={selectedSerial}
        />
      )}
      {showAssignmentForm && (
        <StudentAssignmentForm
          isOpen={showAssignmentForm}
          onOpenChange={setShowAssignmentForm}
          onComplete={() => {
            console.log('Assignment form completed, refetching data');
            fetchDashboardData();
            // Reset form state
            setSelectedSerial('');
            setShowAssignmentForm(false);
          }}
          initialSerial={selectedSerial}
        />
      )}
    </div>
  );
}
