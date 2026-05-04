'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount, useReadContract } from 'wagmi';
import SupplyChainTrackerABI from '@/contracts/abi/SupplyChainTracker.json';
import { NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS } from '@/lib/env';
import { useEffect, useRef, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, UserPlus } from 'lucide-react';
import { getRoleHashes } from '@/lib/roleUtils';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const contractAddress = NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS as `0x${string}`;

// Tipo para el panel de estado
interface HealthPanel {
  title: string;
  value: string | null;
  status: 'success' | 'warning' | 'error' | 'loading';
  icon: React.ReactNode;
  action?: React.ReactNode;
}

type HealthStatus = 'success' | 'warning' | 'error' | 'loading';

// Helper para determinar el badge
const getBadgeVariant = (status: HealthStatus) => {
  switch (status) {
    case 'success': return 'default';
    case 'warning': return 'warning';
    case 'error': return 'destructive';
    default: return 'outline';
  }
};

// Helper para determinar el color de texto
const getTextColor = (status: HealthStatus) => {
  switch (status) {
    case 'success': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'error': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
};

/**
 * Componente de Diagnóstico del Sistema
 * 
 * Proporciona un panel de control para el administrador que verifica 
 * el estado de la red, el contrato y los permisos. Incluye una herramienta
 * para verificar roles de cualquier dirección.
 */
export function SystemHealth() {
  const { address, chainId } = useAccount();
  const { hasRole } = useSupplyChainService();
  const [panels, setPanels] = useState<HealthPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    address: string;
    isAdmin: boolean;
    roles: Array<{role: string; has: boolean}>;
  } | null>(null);

  // Estado de los datos
  const [contractName, setContractName] = useState<string | null>(null);
  const [isContractError, setIsContractError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [localHashes, setLocalHashes] = useState<any>(null);
  const [contractFabricanteHash, setContractFabricanteHash] = useState<string | null>(null);

  // Ref para el estado inicial
  const initialFetchRef = useRef(true);

  // Hooks para verificar datos del contrato
  const { data: defaultAdminRole } = useReadContract({
    address: contractAddress,
    abi: SupplyChainTrackerABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
  });

  const { data: isAddressAdmin, refetch: refetchAdmin } = useReadContract({
    address: contractAddress,
    abi: SupplyChainTrackerABI,
    functionName: 'hasRole',
    args: [defaultAdminRole, address],
    query: {
      enabled: !!address && !!defaultAdminRole,
    }
  });

  const { data: contractFabricanteHashData, refetch: refetchFabricante } = useReadContract({
    address: contractAddress,
    abi: SupplyChainTrackerABI,
    functionName: 'FABRICANTE_ROLE',
    query: {
      enabled: false
    }
  });

  const { data: contractNameData, refetch: refetchName } = useReadContract({
    address: contractAddress,
    abi: SupplyChainTrackerABI,
    functionName: 'name',
    query: {
      enabled: false,
      retry: 1
    }
  });

  // Función para generar un reporte detallado
  const generateDetailedReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      network: {
        chainId,
        isExpected: chainId === 31337
      },
      contract: {
        address: contractAddress,
        name: contractName,
        isConnected: !isContractError && !!contractName
      },
      user: {
        address,
        isSystemAdmin: isAdmin
      },
      roles: {
        localHashes,
        contractFabricanteHash,
        isConsistent: localHashes?.FABRICANTE === contractFabricanteHashData
      },
      verificationResult
    };
    
    // Export data as JSON file
    const jsonData = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_health_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    // Clean up
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Función central para verificar el estado del sistema
  const checkHealth = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Refetch all contract data
      await refetchName();
      await refetchAdmin();
      await refetchFabricante();

      // Update local state immediately from refetch result
      setContractName(contractNameData ? String(contractNameData) : null);
      setIsAdmin(Boolean(isAddressAdmin));
      setContractFabricanteHash(contractFabricanteHashData ? String(contractFabricanteHashData) : null);

      // Get local hashes
      const hashes = await getRoleHashes();
      setLocalHashes(hashes);

      // Determine panel status
      const networkCorrect = chainId === 31337;
      const contractConnected = !isContractError && !!contractName;
      const rolesConsistent = hashes?.FABRICANTE === contractFabricanteHashData;

      setPanels([
        {
          title: 'Red',
          value: chainId ? `Chain ID: ${chainId}` : 'Desconectado',
          status: networkCorrect ? 'success' : 'error',
          icon: <CheckCircle2 className="h-4 w-4" />,          action: !networkCorrect && <Badge variant="destructive">31337</Badge>
        },
        {
          title: 'Contrato',
          value: contractConnected ? contractName as string : 'Error',
          status: contractConnected ? 'success' : 'error',          icon: contractConnected ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" /> },
        {
          title: 'Permiso Admin',
          value: isAdmin ? 'Verificado' : 'No es Admin',
          status: isAdmin ? 'success' : 'warning',
          icon: isAdmin ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
        },
        {
          title: 'Consistencia de Roles',
          value: rolesConsistent ? 'Correcto' : 'Mismatch',
          status: rolesConsistent ? 'success' : 'warning',
          icon: rolesConsistent ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
        }
      ]);
    } catch (e) {
      console.error(e);
      setPanels([
        {
          title: 'Red',
          value: 'Error',
          status: 'error',
          icon: <XCircle className="h-4 w-4" />
        },
        {
          title: 'Contrato',
          value: 'Error',
          status: 'error',
          icon: <XCircle className="h-4 w-4" />
        },
        {
          title: 'Permiso Admin',
          value: 'Error',
          status: 'error',
          icon: <XCircle className="h-4 w-4" />
        },
        {
          title: 'Consistencia de Roles',
          value: 'Error',
          status: 'error',
          icon: <XCircle className="h-4 w-4" />
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Check health on mount and when address changes
  useEffect(() => {
    if (initialFetchRef.current) {
      initialFetchRef.current = false;
      checkHealth(true); // Silent first check
    } else {
      checkHealth();
    }
  }, [address]);

  // Función para verificar roles de cualquier dirección
  const handleVerifyRole = async () => {
    if (!userAddress.trim()) {
      alert('Por favor, ingresa una dirección de Ethereum.');
      return;
    }

    // Validar el formato de la dirección
    if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('La dirección ingresada no tiene un formato válido (debe ser 0x seguido de 40 caracteres hexadecimales).');
      return;
    }

    setVerifyingAddress(true);
    try {
      // Obtén los hashes de todos los roles
      const roleHashes = await getRoleHashes();
      
      // Arreglo de promesas para leer los roles concurrentemente
      const roleChecks = Object.entries(roleHashes).map(async ([roleName, hash]) => {
        const { data: hasRole } = await useReadContract({
          address: contractAddress,
          abi: SupplyChainTrackerABI,
          functionName: 'hasRole',
          args: [hash, userAddress as `0x${string}`],
        });

        return {
          role: roleName,
          has: !!hasRole
        };
      });

      // Ejecutar todas las verificaciones de roles en paralelo
      const roles = await Promise.all(roleChecks);

      // Verificar si es admin
      const isAdminRole = await hasRole('DEFAULT_ADMIN_ROLE', userAddress as `0x${string}`);
      
      setVerificationResult({
        address: userAddress,
        isAdmin: isAdminRole,
        roles
      });
    } catch (error) {
      console.error('Error al verificar roles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Ocurrió un error al verificar los roles. Por favor, intenta nuevamente.\nError: ${errorMessage}`);
    } finally {
      setVerifyingAddress(false);
    }
  };

  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>🏥 Diagnóstico del Sistema</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={generateDetailedReport} disabled={loading}>
            Generar Reporte
          </Button>
          <Button variant="ghost" size="sm" onClick={() => checkHealth()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {panels.length > 0 ? (
            panels.map((panel) => (
              <div key={panel.title} className="p-3 bg-muted/20 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">{panel.title}</div>
                <div className={`flex items-center gap-2 font-mono text-sm ${getTextColor(panel.status)}`}>
                  {panel.icon}
                  {panel.value}
                  {panel.action && <span> {panel.action}</span>}
                </div>
              </div>
            ))
          ) : (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded-lg border">
                <div className="text-xs text-muted-foreground mb-1">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Manual Role Checker */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Verificación de Roles</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="Nombre de usuario (opcional)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="Dirección de Ethereum (0x...)," id="verify-address-input"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                className="h-8 text-sm"
                disabled={verifyingAddress}
              />
            </div>
            <Button
              onClick={handleVerifyRole}
              disabled={verifyingAddress}
              className="h-8 whitespace-nowrap"
            >
              {verifyingAddress ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>

          {/* Resultado de la verificación */}
          {verificationResult && (
            <div className="mt-3 rounded-md border p-3 bg-muted">
              <h5 className="text-sm font-medium mb-2">Resultado para <span className="font-mono">{verificationResult.address}</span></h5>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Admin:</span>
                  <Badge variant={verificationResult.isAdmin ? 'default' : 'secondary'} className="text-xs">
                    {verificationResult.isAdmin ? '✅ Sí' : '❌ No'}
                  </Badge>
                </div>
                <div className="mt-2">
                  <h6 className="font-medium text-xs text-muted-foreground">Roles Asignados:</h6>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {verificationResult.roles.map(({ role, has }) => (
                      <Badge
                        key={role}
                        variant={has ? 'default' : 'secondary'}
                        className={`text-xs ${!has ? 'opacity-50' : ''}`}
                      >
                        {has ? '✅' : '❌'} {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SystemHealth;
