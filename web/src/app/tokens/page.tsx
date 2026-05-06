"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Netbook, NetbookState } from '@/types/supply-chain-types';
import { Laptop, Plus, RefreshCw } from 'lucide-react';
import { useSolanaEventContext } from '@/lib/solana/event-provider';

export default function TokensPage() {
  const { connected } = useWeb3();
  const router = useRouter();
  const {
    getAllSerialNumbers,
    getNetbookState,
    getNetbookReport,
    clearCaches
  } = useSupplyChainService();
  const { events, isConnected: isEventConnected } = useSolanaEventContext();
  const hasFetchedRef = useRef(false);
  
  const [netbooks, setNetbooks] = useState<Netbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const stateLabels: Record<number, string> = {
    0: 'FABRICADA',
    1: 'HW_APROBADO',
    2: 'SW_VALIDADO',
    3: 'DISTRIBUIDA'
  };

  const stateColors: Record<number, string> = {
    0: 'bg-blue-100 text-blue-800 border border-blue-200',
    1: 'bg-green-100 text-green-800 border border-green-200',
    2: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    3: 'bg-purple-100 text-purple-800 border border-purple-200'
  };

  const fetchNetbooks = useCallback(async () => {
    if (!connected) return;
    
    setLoading(true);
    setError('');
    
    // Mapeo de número de estado a NetbookState
    const stateMap: Record<number, NetbookState> = {
      0: 'FABRICADA',
      1: 'HW_APROBADO',
      2: 'SW_VALIDADO',
      3: 'DISTRIBUIDA'
    };
    
    try {
      const serials = await getAllSerialNumbers();
      
      const netbooksData = await Promise.all(
        serials.map(async (serial: string) => {
          const state = await getNetbookState(serial);
          const report = await getNetbookReport(serial);
          
          return {
            serialNumber: serial,
            batchId: report?.batchId || "N/A",
            initialModelSpecs: report?.modelSpecs || "N/A",
            hwAuditor: report?.hwAuditor || "",
            hwIntegrityPassed: report?.hwIntegrityPassed || false,
            hwReportHash: report?.hwReportHash || "",
            swTechnician: report?.swTechnician || "",
            osVersion: report?.osVersion || "N/A",
            swValidationPassed: report?.swValidationPassed || false,
            destinationSchoolHash: report?.destinationSchoolHash || "",
            studentIdHash: report?.studentIdHash || "",
            distributionTimestamp: report?.distributionTimestamp || "0",
            currentState: stateMap[Number(state)] || 'FABRICADA',
          };
        })
      );
      
      setNetbooks(netbooksData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching netbooks:', err);
      setError('Failed to load netbooks');
    } finally {
      setLoading(false);
    }
  }, [connected, getAllSerialNumbers, getNetbookState, getNetbookReport]);

  // Initial fetch - only once
  useEffect(() => {
    if (connected && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNetbooks();
    }
  }, [connected, fetchNetbooks]);

  // Listen for blockchain events and refresh data
  useEffect(() => {
    if (!connected || events.length === 0) return;

    // Process new events
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        // Invalidate caches and refresh data when a successful transaction occurs
        clearCaches();
        
        // Refresh the netbooks list with a delay to avoid cascading renders
        // eslint-disable-next-line no-restricted-globals
        setTimeout(() => {
          fetchNetbooks();
        }, 100);
        break;
      }
    }
  }, [events, connected, clearCaches, fetchNetbooks]);

  const handleRefresh = () => {
    clearCaches();
    fetchNetbooks();
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg mb-4">Por favor, conecta tu wallet para ver los netbooks.</p>
            <Button onClick={() => router.push('/')}>Conectar Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 relative">
        <div className="absolute inset-0 bg-gradient-overlay opacity-30 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-8">Gestión de Netbooks</h1>
          
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                    <div className="h-6 w-20 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                    <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 relative">
      <div className="absolute inset-0 bg-gradient-overlay opacity-30 pointer-events-none"></div>
      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-8">Gestión de Netbooks</h1>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">
              Total: {netbooks.length} netbooks registrados
            </p>
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
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
            <Button asChild>
              <Link href="/tokens/create">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Nuevos Netbooks
              </Link>
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent>
            {error && <div className="text-red-500 p-4 rounded-md bg-red-50 mb-4">{error}</div>}
            
            {netbooks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Serie</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Propietario</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {netbooks.map((netbook, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{netbook.serialNumber}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${typeof netbook.currentState === 'number' ? stateColors[netbook.currentState] : stateColors[0]}`}>
                          {stateLabels[typeof netbook.currentState === 'number' ? netbook.currentState : 0] || netbook.currentState}
                        </span>
                      </TableCell>
                      <TableCell>
                        {netbook.hwAuditor && netbook.hwAuditor !== '' ? 'HW Audited' : 'Pending'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          router.push(`/tokens/${netbook.serialNumber}`);
                        }}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Laptop className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No hay netbooks registrados
                </h3>
                <p className="text-muted-foreground mb-6">
                  Comienza registrando el primer netbook del sistema
                </p>
                <Button asChild>
                  <Link href="/tokens/create" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Registrar Primer Netbook
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
