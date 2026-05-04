"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Shield, Users, HardDrive, Monitor, GraduationCap, Package, CheckCircle } from 'lucide-react';
import { NetbookStatusChart } from '@/components/charts/NetbookStatusChart';
import { UserRolesChart } from '@/components/charts/UserRolesChart';
import { useWeb3 } from '@/hooks/useWeb3';
import { getRoleMembers, getRoleMemberCount, getNetbooksByState, revalidateAll } from '@/lib/api/serverRpc';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionConfirmation } from '@/components/contracts/TransactionConfirmation';
import { truncateAddress , cn } from '@/lib/utils';
import { getRoleHashes } from '@/lib/roleUtils';
import { useRoleRequests } from '@/hooks/useRoleRequests';

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

interface RoleRequestsDashboardProps {
  stats?: DashboardStats;
}

export default function RoleRequestsDashboard({ stats: initialStats }: RoleRequestsDashboardProps) {
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();
  const { requests: pendingRequests, approveMutation, rejectMutation } = useRoleRequests();

  const [showRoleManager, setShowRoleManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(initialStats || {
    fabricanteCount: 0,
    auditorHwCount: 0,
    tecnicoSwCount: 0,
    escuelaCount: 0,
    totalFabricadas: 0,
    totalHwAprobadas: 0,
    totalSwValidadas: 0,
    totalDistribuidas: 0
  });
  const [userRoles, setUserRoles] = useState<UserRoleData[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState({
    open: false,
    title: '',
    description: '',
    warning: '',
    onConfirm: () => Promise.resolve()
  });

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchDashboardData(true),
          fetchUserRoles()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    address,
    isConnected,
    initialStats
  ]);

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
      console.error('Error fetching dashboard data:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: "No se pudieron obtener los datos del dashboard",
          variant: "destructive"
        });
      }
    } finally {
      if (!silent) {
        toast({
          title: "Datos actualizados",
          description: "Dashboard actualizado correctamente"
        });
      }
    }
    return {
      stats,
      userRoles
    };
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchDashboardData(true),
          fetchUserRoles()
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    address,
    isConnected,
    initialStats
  ]);

  const fetchStats = async (): Promise<DashboardStats> => {
    try {
      const roleHashes = await getRoleHashes();

      const [
        fabricanteCount,
        auditorHwCount,
        tecnicoSwCount,
        escuelaCount,
        fabricadas,
        hwAprobadas,
        swValidadas,
        distribuidas
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

      return {
        fabricanteCount,
        auditorHwCount,
        tecnicoSwCount,
        escuelaCount,
        totalFabricadas: fabricadas.length,
        totalHwAprobadas: hwAprobadas.length,
        totalSwValidadas: swValidadas.length,
        totalDistribuidas: distribuidas.length
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        fabricanteCount: 0,
        auditorHwCount: 0,
        tecnicoSwCount: 0,
        escuelaCount: 0,
        totalFabricadas: 0,
        totalHwAprobadas: 0,
        totalSwValidadas: 0,
        totalDistribuidas: 0
      };
    }
  };

  return {
    stats,
    userRoles,
    isLoading,
    refresh: async () => {
      setIsLoading(true);
      try {
        const newStats = await fetchStats();
        setStats(newStats);
        await fetchUserRoles();
        toast({
          title: "Datos actualizados",
          description: "Dashboard actualizado correctamente"
        });
      } catch (error) {
        console.error('Error refreshing dashboard:', error);
        toast({
          title: "Error",
          description: "No se pudieron actualizar los datos",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
}