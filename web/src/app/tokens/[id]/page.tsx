"use client";

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Netbook } from '@/types/supply-chain-types';
import { NetbookInfo } from '@/services/SolanaSupplyChainService';
import {
  ArrowLeft,
  Package,
  ShieldCheck,
  Monitor,
  Truck,
  Calendar,
  Box,
  Settings,
  User,
  School,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Hash,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { HardwareAuditForm } from '@/components/contracts/HardwareAuditForm';
import { SoftwareValidationForm } from '@/components/contracts/SoftwareValidationForm';
import { StudentAssignmentForm } from '@/components/contracts/StudentAssignmentForm';

// Netbook state mapping
const STATE_MAP: Record<number, string> = {
  0: 'FABRICADA',
  1: 'HW_APROBADO',
  2: 'SW_VALIDADO',
  3: 'DISTRIBUIDA'
};

const STATE_COLORS: Record<string, string> = {
  'FABRICADA': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'HW_APROBADO': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
  'SW_VALIDADO': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'DISTRIBUIDA': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  'UNKNOWN': 'bg-gray-500/20 text-gray-400 border-gray-500/50'
};

const STATE_ICONS: Record<string, any> = {
  'FABRICADA': Package,
  'HW_APROBADO': ShieldCheck,
  'SW_VALIDADO': Monitor,
  'DISTRIBUIDA': Truck,
  'UNKNOWN': AlertCircle
};

// Lifecycle steps for progress display
const LIFECYCLE_STEPS = [
  { key: 'FABRICADA', label: 'Registrada', icon: Package },
  { key: 'HW_APROBADO', label: 'HW Aprobado', icon: ShieldCheck },
  { key: 'SW_VALIDADO', label: 'SW Validado', icon: Monitor },
  { key: 'DISTRIBUIDA', label: 'Entregada', icon: Truck }
];

// Extended netbook type for display with nullable fields
interface ExtendedNetbook {
  serialNumber: string;
  batchId: string;
  initialModelSpecs: string;
  hwAuditor: string;
  hwIntegrityPassed: boolean | null;
  hwReportHash: string;
  swTechnician: string;
  osVersion: string;
  swValidationPassed: boolean | null;
  destinationSchoolHash: string;
  studentIdHash: string;
  distributionTimestamp: string;
  currentState: string;
  tokenId?: number;
}

export default function NetbookDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isConnected, publicKey } = useSolanaWeb3();
  const { getNetbook, getNetbookState, getAllSerialNumbers } = useSupplyChainService();
  const { isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();
  
  const [netbook, setNetbook] = useState<ExtendedNetbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  
  // Form states
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);

  // Fetch netbook data
  const fetchNetbookData = useCallback(async () => {
    if (!isConnected || !id) return;
    
    setLoading(true);
    setSyncing(true);
    setError(null);

    try {
      // Get the netbook by serial number
      const netbookData = await getNetbook(id);
      
      if (!netbookData) {
        // Try to find by searching all serials
        const serials = await getAllSerialNumbers();
        const foundIndex = serials.findIndex(s => s === id);
        
        if (foundIndex === -1) {
          setError(`No se encontró un netbook con el número de serie: ${id}`);
          setNetbook(null);
          setLoading(false);
          setSyncing(false);
          return;
        }
        
        // Netbook found by index, fetch using the token ID
        setTokenId(foundIndex);
        
        // Fetch the netbook data using the token ID
        const { findNetbookPda } = await import('@/lib/contracts/solana-program');
        findNetbookPda(foundIndex); // PDA calculation, not needed for fetching but confirms valid index
        const service = (await import('@/services/SolanaSupplyChainService')).SolanaSupplyChainService.getInstance();
        const fullNetbookData = await service.getNetbook(id);
        
        if (!fullNetbookData) {
          setError(`No se encontró un netbook con el número de serie: ${id}`);
          setNetbook(null);
        } else {
          const state = await getNetbookState(id);
          
          const extendedNetbook: ExtendedNetbook = {
            serialNumber: fullNetbookData.serialNumber,
            batchId: fullNetbookData.batchId || 'N/A',
            initialModelSpecs: fullNetbookData.modelSpecs || 'N/A',
            hwAuditor: '',
            hwIntegrityPassed: null,
            hwReportHash: '0x0',
            swTechnician: '',
            osVersion: 'N/A',
            swValidationPassed: null,
            destinationSchoolHash: '0x0',
            studentIdHash: '0x0',
            distributionTimestamp: '0',
            currentState: state != null ? STATE_MAP[state] || 'UNKNOWN' : 'UNKNOWN',
            tokenId: fullNetbookData ? Number(fullNetbookData.tokenId) : undefined
          };
          
          setNetbook(extendedNetbook);
        }
      } else {
        // Get state
        const state = await getNetbookState(id);
        
        const extendedNetbook: ExtendedNetbook = {
          serialNumber: netbookData.serialNumber,
          batchId: netbookData.batchId || 'N/A',
          initialModelSpecs: netbookData.modelSpecs || 'N/A',
          hwAuditor: '',
          hwIntegrityPassed: null,
          hwReportHash: '0x0',
          swTechnician: '',
          osVersion: 'N/A',
          swValidationPassed: null,
          destinationSchoolHash: '0x0',
          studentIdHash: '0x0',
          distributionTimestamp: '0',
          currentState: state != null ? STATE_MAP[state] || 'UNKNOWN' : 'UNKNOWN',
          tokenId: netbookData ? Number(netbookData.tokenId) : undefined
        };
        
        setNetbook(extendedNetbook);
        if (netbookData.tokenId) {
          setTokenId(Number(netbookData.tokenId));
        }
      }
    } catch (err: any) {
      console.error('Error fetching netbook:', err);
      setError(`Error al cargar los detalles: ${err.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [isConnected, id, getNetbook, getNetbookState, getAllSerialNumbers]);

  useEffect(() => {
    fetchNetbookData();
  }, [fetchNetbookData]);

  // Check if user can perform actions
  const canAudit = isHardwareAuditor || isAdmin;
  const canValidate = isSoftwareTechnician || isAdmin;
  const canAssign = isSchool || isAdmin;

  // Get current step index
  const currentStepIndex = netbook 
    ? LIFECYCLE_STEPS.findIndex(step => step.key === netbook.currentState)
    : -1;

  // Format hash for display
  const formatHash = (hash: string | number[], maxLength = 16): string => {
    if (!hash || hash === '0x0' || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return 'Pendiente';
    }
    
    const hashStr = typeof hash === 'string' ? hash : '0x' + hash.map(b => b.toString(16).padStart(2, '0')).join('');
    if (hashStr.length <= maxLength) return hashStr;
    return hashStr.substring(0, 10) + '...' + hashStr.substring(hashStr.length - 6);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    if (!timestamp || timestamp === '0') return 'Pendiente';
    try {
      return new Date(Number(timestamp) * 1000).toLocaleString('es-AR');
    } catch {
      return 'Fecha inválida';
    }
  };

  // Short address display
  const shortenAddress = (address: string): string => {
    if (!address || address === '0000000000000000000000000000000000000000000000000000000000000000') return 'Pendiente';
    if (address.length <= 12) return address;
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg mb-4">Por favor, conecta tu wallet para ver los detalles del netbook.</p>
            <Button onClick={() => window.location.reload()}>Conectar Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-lg text-muted-foreground">Cargando detalles del netbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Detalles del Netbook</h1>
              {netbook && (
                <Badge className={cn("px-3 py-1", STATE_COLORS[netbook.currentState] || STATE_COLORS['UNKNOWN'])}>
                  {netbook.currentState}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Serie: <span className="font-mono font-semibold text-primary">{id}</span>
              {tokenId !== null && ` | ID: ${tokenId}`}
            </p>
          </div>
        </div>
        
        <Button onClick={fetchNetbookData} disabled={syncing}>
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {syncing ? 'Sincronizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {netbook ? (
        <>
          {/* Lifecycle Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Ciclo de Vida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {LIFECYCLE_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = netbook.currentState === step.key || 
                    (index < currentStepIndex || (netbook.currentState === 'DISTRIBUIDA' && index < 3));
                  const isCurrent = netbook.currentState === step.key;
                  const isPending = !isCompleted && !isCurrent;
                  
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg",
                        isCurrent ? "bg-primary/20 ring-2 ring-primary" :
                        isCompleted ? "bg-emerald-500/10" : "bg-muted/30"
                      )}>
                        <Icon className={cn(
                          "h-6 w-6",
                          isCurrent ? "text-primary" :
                          isCompleted ? "text-emerald-400" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-xs font-medium text-center",
                          isCurrent ? "text-primary" :
                          isCompleted ? "text-emerald-400" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {index < LIFECYCLE_STEPS.length - 1 && (
                        <div className={cn(
                          "h-0.5 w-12 md:w-24 mx-2",
                          isCompleted ? "bg-emerald-500" : "bg-muted"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {(canAudit || canValidate || canAssign) && (
            <div className="flex flex-wrap gap-3">
              {canAudit && netbook.currentState === 'FABRICADA' && (
                <Button onClick={() => setShowAuditForm(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Auditar Hardware
                </Button>
              )}
              {canValidate && netbook.currentState === 'HW_APROBADO' && (
                <Button onClick={() => setShowValidationForm(true)} className="gap-2 bg-purple-600 hover:bg-purple-700">
                  <Monitor className="h-4 w-4" />
                  Validar Software
                </Button>
              )}
              {canAssign && netbook.currentState === 'SW_VALIDADO' && (
                <Button onClick={() => setShowAssignmentForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
                  <School className="h-4 w-4" />
                  Asignar a Estudiante
                </Button>
              )}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Origin Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Box className="h-5 w-5" />
                  Origen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Número de Serie</p>
                  <p className="font-mono text-sm break-all">{netbook.serialNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Lote</p>
                  <p className="text-sm font-medium">{netbook.batchId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Especificaciones del Modelo</p>
                  <p className="text-sm">{netbook.initialModelSpecs}</p>
                </div>
              </CardContent>
            </Card>

            {/* Hardware Audit Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                  Auditoría de Hardware
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Auditor</p>
                  <p className="text-xs font-mono" title={netbook.hwAuditor}>
                    {shortenAddress(netbook.hwAuditor)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Resultado</p>
                  {netbook.hwIntegrityPassed === null ? (
                    <Badge variant="secondary" className="mt-1">Pendiente</Badge>
                  ) : netbook.hwIntegrityPassed ? (
                    <Badge variant="success" className="mt-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Aprobado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="mt-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      No Aprobado
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Hash del Reporte</p>
                  <p className="text-xs font-mono break-all" title={formatHash(netbook.hwReportHash)}>
                    {formatHash(netbook.hwReportHash)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Software Validation Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-400">
                  <Monitor className="h-5 w-5" />
                  Validación de Software
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Técnico</p>
                  <p className="text-xs font-mono" title={netbook.swTechnician}>
                    {shortenAddress(netbook.swTechnician)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Versión del SO</p>
                  <p className="text-sm font-medium">{netbook.osVersion}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Resultado</p>
                  {netbook.swValidationPassed === null ? (
                    <Badge variant="secondary" className="mt-1">Pendiente</Badge>
                  ) : netbook.swValidationPassed ? (
                    <Badge variant="success" className="mt-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Validado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="mt-1">
                      <XCircle className="h-3 w-3 mr-1" />
                      No Validado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Distribution Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <Truck className="h-5 w-5" />
                  Distribución
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Institución Destino</p>
                  <p className="text-xs font-mono" title={netbook.destinationSchoolHash}>
                    {formatHash(netbook.destinationSchoolHash)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Estudiante</p>
                  <p className="text-xs font-mono" title={netbook.studentIdHash}>
                    {formatHash(netbook.studentIdHash)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Fecha de Distribución</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">{formatTimestamp(netbook.distributionTimestamp)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Blockchain Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" />
                Información Blockchain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Token ID</p>
                  <p className="text-lg font-bold">{tokenId !== null ? tokenId : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Estado On-Chain</p>
                  <Badge className={cn("px-3 py-1", STATE_COLORS[netbook.currentState] || STATE_COLORS['UNKNOWN'])}>
                    {netbook.currentState}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Dirección del Wallet</p>
                  <p className="text-xs font-mono" title={publicKey?.toBase58()}>
                    {publicKey ? shortenAddress(publicKey.toBase58()) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Netbook no encontrado</p>
            <p className="text-muted-foreground text-sm mt-2">No se encontraron datos para el serial: {id}</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Forms */}
      {showAuditForm && (
        <HardwareAuditForm
          isOpen={showAuditForm}
          onOpenChange={setShowAuditForm}
          onComplete={() => {
            fetchNetbookData();
            setShowAuditForm(false);
          }}
          initialSerial={id}
        />
      )}
      {showValidationForm && (
        <SoftwareValidationForm
          isOpen={showValidationForm}
          onOpenChange={setShowValidationForm}
          onComplete={() => {
            fetchNetbookData();
            setShowValidationForm(false);
          }}
          initialSerial={id}
        />
      )}
      {showAssignmentForm && (
        <StudentAssignmentForm
          isOpen={showAssignmentForm}
          onOpenChange={setShowAssignmentForm}
          onComplete={() => {
            fetchNetbookData();
            setShowAssignmentForm(false);
          }}
          initialSerial={id}
        />
      )}
    </div>
  );
}
