"use client";

import { useEffect, useState, useCallback, useRef } from 'react';

// Hooks
import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useUserStats } from '@/hooks/useUserStats';
import { useNetbookStats } from '@/hooks/useNetbookStats';
import { useProcessedUserAndNetbookData } from '@/hooks/useProcessedUserAndNetbookData';

// Services
import { UnifiedSupplyChainService } from '@/services/UnifiedSupplyChainService';

// Types
import { Netbook } from '@/types/supply-chain-types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Icons
import {
  Package,
  ShieldCheck,
  Monitor,
  Truck,
  Search,
  LayoutDashboard,
  Loader2,
  User,
} from 'lucide-react';

// Dashboard Components
import { RoleActions } from './components/RoleActions';
import { PendingRoleApprovals } from './components/role-approval/PendingRoleApprovals';
import { TrackingCard } from './components/TrackingCard';
import { UserDataTable } from './components/UserDataTable';
import { NetbookDataTable } from './components/NetbookDataTable';

// Forms
import { HardwareAuditForm } from '@/components/contracts/HardwareAuditForm';
import { SoftwareValidationForm } from '@/components/contracts/SoftwareValidationForm';
import { StudentAssignmentForm } from '@/components/contracts/StudentAssignmentForm';

// Real-time
import { useSolanaEventContext } from '@/lib/solana/event-provider';
import { SolanaActivityFeed } from '@/components/real-time/SolanaActivityFeed';
import { ConnectionIndicator } from '@/components/real-time/ConnectionIndicator';

// Summary Card Component - Enhanced with textures, animations, and spatial composition
function SummaryCard({ title, count, description, icon: Icon, color, statusClass }: { title: string, count: number, description: string, icon: React.ElementType, color: string, statusClass?: string }) {
  const bgColor = color.replace('text-', 'bg-');
  const tintBg = color.replace('text-', 'bg-').replace('500', '50');
  const iconBg = color.replace('text-', 'bg-').replace('500', '100');

  return (
    <Card className={cn(
      "relative overflow-hidden group glass-card hover-lift texture-noise",
      statusClass
    )}>
      {/* Gradient mesh overlay */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        `bg-gradient-to-br from-transparent via-transparent ${tintBg}/30`
      )} />

      {/* Background icon with scale animation */}
      <div className={cn("absolute -bottom-2 -right-2 opacity-[0.04] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-500", color)}>
        <Icon className="h-28 w-28" />
      </div>

      {/* Animated status indicator */}
      <div className="absolute top-4 right-4">
        <span className={cn("inline-block w-2 h-2 rounded-full status-pulse", bgColor)} />
      </div>

      {/* Top accent bar */}
      <div className={cn("h-0.5 w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left", bgColor)} />

      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-2 rounded-lg group-hover:scale-110 transition-transform duration-300",
            iconBg
          )}>
            <Icon className={cn("h-4 w-4", color)} />
          </div>
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className={cn("text-4xl font-bold mb-1.5 tracking-tight animate-count-in")}>{count}</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
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

export default function ManagerDashboard() {
  // Stats from MongoDB
  const { isLoading: usersLoading } = useUserStats();
  const { isLoading: netbooksLoading } = useNetbookStats();

  // Combined processed data
  const { users, netbooks: netbooksTable, isLoading: dataLoading, refetch: fetchDashboardData } = useProcessedUserAndNetbookData();

  const isLoading = usersLoading || netbooksLoading || dataLoading;

  // Filter handlers
  const handleUserFilterChange = (_filter: { key: string; value: string }) => {
    // Filter applied client-side via DataTable
  };

  const handleNetbookFilterChange = (_filter: { key: string; value: string }) => {
    // Filter applied client-side via DataTable
  };

  const { isConnected, connectWallet } = useWeb3();
  const { clearCaches } = useSupplyChainService();
  const { isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();

  // Real-time event listener
  const { events } = useSolanaEventContext();

  // Refresh on blockchain events
  useEffect(() => {
    if (!isConnected || events.length === 0) return;

    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        clearCaches();
        setTimeout(() => fetchDashboardData(), 100);
        break;
      }
    }
  }, [events, isConnected, clearCaches, fetchDashboardData]);

  // State summary
  const summary = {
    FABRICADA: netbooksTable.filter((n: Netbook) => n.currentState === 'FABRICADA').length,
    HW_APROBADO: netbooksTable.filter((n: Netbook) => n.currentState === 'HW_APROBADO').length,
    SW_VALIDADO: netbooksTable.filter((n: Netbook) => n.currentState === 'SW_VALIDADO').length,
    DISTRIBUIDA: netbooksTable.filter((n: Netbook) => n.currentState === 'DISTRIBUIDA').length,
  };

  // Pending tasks by role
  const pendingTasks = netbooksTable.filter((n: Netbook) => {
    if (!n) return false;
    if (n.currentState === 'FABRICADA' && (isHardwareAuditor || isAdmin)) return true;
    if (n.currentState === 'HW_APROBADO' && (isSoftwareTechnician || isAdmin)) return true;
    if (n.currentState === 'SW_VALIDADO' && (isSchool || isAdmin)) return true;
    return false;
  });

  // Form state
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  const handleDeleteUser = async (address: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar todos los roles de la cuenta ${address}?`)) {
      return;
    }

    try {
      const service = UnifiedSupplyChainService.getInstance();
      const result = await service.revokeAllRoles(address as import('@solana/kit').Address);

      if (result.success) {
        fetchDashboardData();
      } else {
        alert(`Error al eliminar roles: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error inesperado al eliminar el usuario');
    }
  };

  const handleAction = useCallback((action: string, serial: string) => {
    setSelectedSerial(serial);

    switch (action) {
      case 'audit':
        setShowAuditForm(true);
        break;
      case 'validate':
        setShowValidationForm(true);
        break;
      case 'assign':
        setShowAssignmentForm(true);
        break;
    }
  }, [setSelectedSerial, setShowAuditForm, setShowValidationForm, setShowAssignmentForm]);

  if (!isConnected) {
    return <TempDashboard onConnect={connectWallet} />;
  }



  return (
    <div className="container mx-auto px-4 py-8 space-y-8 relative texture-mesh">
      {/* Issue #211: Solana Activity Feed - Real-time network activity */}
      <div className="animate-fade-in">
        <SolanaActivityFeed maxEntries={15} compact={true} />
      </div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slide-up">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight mb-1">Panel de Control</h1>
          <p className="text-sm text-muted-foreground">Estado actual de la cadena de suministro de netbooks.</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-2.5 rounded-xl border border-border/60 shadow-sm animate-scale-in">
          <ConnectionIndicator />
          <span className="text-xs font-medium text-muted-foreground">Red Solana</span>
        </div>
      </div>

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
          {/* Summary Cards - Enhanced with spring animations and textures */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="animate-spring-in stagger-1">
              <SummaryCard title="En fabricación" count={summary.FABRICADA} description="Registradas pendientes de auditoría." icon={Package} color="text-blue-500" statusClass="border-blue-200/50" />
            </div>
            <div className="animate-spring-in stagger-2">
              <SummaryCard title="HW Aprobado" count={summary.HW_APROBADO} description="Hardware verificado por auditores." icon={ShieldCheck} color="text-emerald-500" statusClass="border-emerald-200/50" />
            </div>
            <div className="animate-spring-in stagger-3">
              <SummaryCard title="SW Validado" count={summary.SW_VALIDADO} description="Software instalado y certificado." icon={Monitor} color="text-purple-500" statusClass="border-purple-200/50" />
            </div>
            <div className="animate-spring-in stagger-4">
              <SummaryCard title="Entregadas" count={summary.DISTRIBUIDA} description="Distribuidas a instituciones." icon={Truck} color="text-amber-500" statusClass="border-amber-200/50" />
            </div>
          </div>

          {/* Main Content Tabs - Pending Tasks + Data Tables */}
          <Tabs defaultValue="tasks" className="w-full animate-slide-up stagger-4">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Tareas</span>
                {pendingTasks.length > 0 && (
                  <Badge variant="success" className="ml-1 h-5 px-1.5 text-[10px] rounded-full">
                    {pendingTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Usuarios</span>
              </TabsTrigger>
              <TabsTrigger value="netbooks" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Netbooks</span>
              </TabsTrigger>
            </TabsList>

            {/* Pending Tasks Tab */}
            <TabsContent value="tasks" className="mt-6 space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-emerald-500/10">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </span>
                  Tareas Pendientes
                </h2>
              </div>

              {pendingTasks.length > 0 ? (
                <div className="grid gap-3">
                  {pendingTasks.map((netbook, index) => (
                    <div key={netbook.serialNumber} className="animate-spring-in" style={{ animationDelay: `${(index + 4) * 60}ms` }}>
                      <TrackingCard netbook={netbook} onAction={handleAction} />
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-border/50 bg-gradient-to-br from-card to-muted/20 texture-dots">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 animate-float">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">¡Todo al día!</h3>
                      <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                        No tienes tareas pendientes asignadas a tu rol en este momento.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="mt-6">
              <UserDataTable
                data={users as any}
                onFilterChange={handleUserFilterChange}
                onDelete={handleDeleteUser}
              />
            </TabsContent>

            {/* Netbooks Tab */}
            <TabsContent value="netbooks" className="mt-6">
              <NetbookDataTable
                data={netbooksTable}
                onFilterChange={handleNetbookFilterChange}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Forms - Conditional rendering to ensure proper state management */}
      {showAuditForm && (
        <HardwareAuditForm
          isOpen={showAuditForm}
          onOpenChange={setShowAuditForm}
          onComplete={() => {
            fetchDashboardData();
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
            fetchDashboardData();
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
            fetchDashboardData();
            setSelectedSerial('');
            setShowAssignmentForm(false);
          }}
          initialSerial={selectedSerial}
        />
      )}
    </div>
  );
}
