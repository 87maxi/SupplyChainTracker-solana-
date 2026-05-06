"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Netbook } from '@/types/supply-chain-types';
import { useSolanaEventContext } from '@/lib/solana/event-provider';
import { RefreshCw } from 'lucide-react';

interface TokenDetailsProps {
  params: {
    id: string;
  };
}

export default function TokenDetailsPage({ params }: TokenDetailsProps) {
  const router = useRouter();
  const { id } = params;
  const { connected } = useWeb3();
  const { getNetbookReport, clearCaches } = useSupplyChainService();
  const { events, isConnected: isEventConnected } = useSolanaEventContext();
  
  const [netbook, setNetbook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchNetbook = useCallback(async () => {
    if (!connected) return;
    
    setLoading(true);
    setError('');
    
    try {
      const report = await getNetbookReport(id);
      setNetbook(report);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching netbook:', err);
      setError('Failed to load netbook details');
    } finally {
      setLoading(false);
    }
  }, [id, connected, getNetbookReport]);

  // Initial fetch - only once
  useEffect(() => {
    if (connected && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNetbook();
    }
  }, [connected, fetchNetbook]);

  // Listen for blockchain events and refresh data
  useEffect(() => {
    if (!connected || events.length === 0) return;

    // Process new events
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        // Invalidate caches and refresh data when a successful transaction occurs
        clearCaches();
        
        // Refresh the netbook data with a delay to avoid cascading renders
        // eslint-disable-next-line no-restricted-globals
        setTimeout(() => {
          fetchNetbook();
        }, 100);
        break;
      }
    }
  }, [events, connected, clearCaches, fetchNetbook]);

  const handleRefresh = () => {
    clearCaches();
    fetchNetbook();
  };

  const stateLabels: Record<number, string> = {
    0: 'FABRICADA',
    1: 'HW_APROBADO',
    2: 'SW_VALIDADO',
    3: 'DISTRIBUIDA'
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg mb-4">Por favor, conecta tu wallet para ver los detalles del netbook.</p>
            <Button onClick={() => router.push('/')}>Conectar Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Netbook</CardTitle>
            <CardDescription>Cargando...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={handleRefresh}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!netbook) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Netbook no encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No se encontró un netbook con el número de serie {id}.</p>
            <Button className="mt-4" asChild>
              <a href="/tokens">Volver a la lista</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => router.push('/tokens')}>
          ← Volver a la lista
        </Button>
        <div className="flex items-center gap-4">
          {isEventConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              En vivo
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Actualizado: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Netbook {netbook.serialNumber}</CardTitle>
          <CardDescription>Información completa sobre este netbook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Número de Serie</p>
              <p className="text-foreground font-mono">{netbook.serialNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado Actual</p>
              <p className="text-foreground">{stateLabels[Number(netbook.currentState) || 0] || netbook.currentState}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lote</p>
              <p className="text-foreground">{netbook.batchId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Especificación del Modelo</p>
              <p className="text-foreground">{netbook.initialModelSpecs}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Auditor HW</p>
              <p className="text-foreground font-mono text-xs">{netbook.hwAuditor || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Integridad HW</p>
              <p className="text-foreground">{netbook.hwIntegrityPassed ? '✓ Pasó' : '✗ No pasó'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reporte Hash HW</p>
              <p className="text-foreground font-mono text-xs truncate">{netbook.hwReportHash || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Técnico SW</p>
              <p className="text-foreground font-mono text-xs">{netbook.swTechnician || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Versión OS</p>
              <p className="text-foreground">{netbook.osVersion || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Validación SW</p>
              <p className="text-foreground">{netbook.swValidationPassed ? '✓ Pasó' : '✗ No pasó'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hash Escuela</p>
              <p className="text-foreground font-mono text-xs truncate">{netbook.destinationSchoolHash || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hash Estudiante</p>
              <p className="text-foreground font-mono text-xs truncate">{netbook.studentIdHash || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Timestamp Distribución</p>
              <p className="text-foreground">{netbook.distributionTimestamp || 'N/A'}</p>
            </div>
            {netbook.tokenId !== undefined && netbook.tokenId !== null && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token ID</p>
                <p className="text-foreground">{String(netbook.tokenId)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
