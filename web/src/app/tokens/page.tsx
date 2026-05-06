"use client";

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { NetbookInfo } from '@/services/SolanaSupplyChainService';
import {
  Laptop,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Package,
  ShieldCheck,
  Monitor,
  Truck,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ExtendedNetbookData {
  serialNumber: string;
  tokenId: number;
  currentState: string;
  batchId: string;
  modelSpecs: string;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: keyof ExtendedNetbookData;
  direction: SortDirection;
}

export default function TokensPage() {
  const { isConnected } = useSolanaWeb3();
  const { getAllSerialNumbers, getNetbook, getNetbookState } = useSupplyChainService();
  const { isAdmin } = useUserRoles();
  
  const [netbooks, setNetbooks] = useState<ExtendedNetbookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'serialNumber',
    direction: 'asc'
  });

  const fetchNetbookData = useCallback(async () => {
    if (!isConnected) return;
    
    setLoading(true);
    setSyncing(true);
    setError(null);

    try {
      const serials = await getAllSerialNumbers();
      
      const netbooksData: ExtendedNetbookData[] = [];
      
      for (const serial of serials) {
        try {
          const netbookData = await getNetbook(serial);
          const state = await getNetbookState(serial);
          
          if (netbookData && state != null) {
            const tokenId = netbookData.tokenId ? Number(netbookData.tokenId) : netbooksData.length;
            
            netbooksData.push({
              serialNumber: netbookData.serialNumber,
              tokenId: tokenId,
              currentState: STATE_MAP[state] || 'UNKNOWN',
              batchId: netbookData.batchId || 'N/A',
              modelSpecs: netbookData.modelSpecs || 'N/A'
            });
          }
        } catch (err) {
          console.error(`Error fetching netbook ${serial}:`, err);
        }
      }
      
      setNetbooks(netbooksData);
    } catch (err: any) {
      console.error('Error fetching netbooks:', err);
      setError(`Error al cargar los netbooks: ${err.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [isConnected, getAllSerialNumbers, getNetbook, getNetbookState]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchNetbookData();
  }, [fetchNetbookData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Filter and search
  const filteredNetbooks = netbooks.filter(netbook => {
    const matchesSearch = netbook.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          netbook.batchId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterState === 'ALL' || netbook.currentState === filterState;
    return matchesSearch && matchesFilter;
  });

  // Sort
  const sortedNetbooks = [...filteredNetbooks].sort((a, b) => {
    if (!sortConfig.direction) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: keyof ExtendedNetbookData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : prev.key === key && prev.direction === 'desc' ? null : 'asc'
    }));
  };

  const getSortIcon = (key: keyof ExtendedNetbookData) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    if (sortConfig.direction === 'asc') return <ArrowUpDown className="h-3 w-3 ml-1 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowUpDown className="h-3 w-3 ml-1 text-primary rotate-180" />;
    return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
  };

  // Stats
  const totalNetbooks = netbooks.length;
  const stateCounts = {
    FABRICADA: netbooks.filter(n => n.currentState === 'FABRICADA').length,
    HW_APROBADO: netbooks.filter(n => n.currentState === 'HW_APROBADO').length,
    SW_VALIDADO: netbooks.filter(n => n.currentState === 'SW_VALIDADO').length,
    DISTRIBUIDA: netbooks.filter(n => n.currentState === 'DISTRIBUIDA').length
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg mb-4">Por favor, conecta tu wallet para ver los netbooks.</p>
            <Button onClick={() => window.location.reload()}>Conectar Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Netbooks</h1>
          <p className="text-muted-foreground mt-1">
            Total: {totalNetbooks} netbooks registrados en el sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button asChild>
              <Link href="/tokens/create">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Netbooks
              </Link>
            </Button>
          )}
          <Button onClick={fetchNetbookData} disabled={syncing || loading} variant="outline">
            {syncing ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Sincronizando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ⟳
                Actualizar
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-400 flex items-center gap-2">
              <Package className="h-4 w-4" />
              FABRICADAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stateCounts.FABRICADA}</p>
          </CardContent>
        </Card>
        
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              HW APROBADAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stateCounts.HW_APROBADO}</p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-400 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              SW VALIDADAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stateCounts.SW_VALIDADO}</p>
          </CardContent>
        </Card>
        
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              ENTREGADAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stateCounts.DISTRIBUIDA}</p>
          </CardContent>
        </Card>
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

      {/* Loading State */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nmero de serie o lote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Todos los estados</option>
                <option value="FABRICADA">FABRICADA</option>
                <option value="HW_APROBADO">HW APROBADO</option>
                <option value="SW_VALIDADO">SW VALIDADO</option>
                <option value="DISTRIBUIDA">DISTRIBUIDA</option>
              </select>
            </div>
          </div>

          {/* Netbooks Table */}
          <Card>
            <CardContent className="p-0">
              {sortedNetbooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('serialNumber')}>
                        <span className="flex items-center">Nmero de Serie {getSortIcon('serialNumber')}</span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('tokenId')}>
                        <span className="flex items-center">Token ID {getSortIcon('tokenId')}</span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('currentState')}>
                        <span className="flex items-center">Estado {getSortIcon('currentState')}</span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('batchId')}>
                        <span className="flex items-center">Lote {getSortIcon('batchId')}</span>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedNetbooks.map((netbook) => {
                      const Icon = STATE_ICONS[netbook.currentState] || Package;
                      return (
                        <TableRow key={netbook.serialNumber}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="max-w-[200px] truncate" title={netbook.serialNumber}>
                                {netbook.serialNumber}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">#{netbook.tokenId}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("px-2 py-0.5", STATE_COLORS[netbook.currentState] || STATE_COLORS['UNKNOWN'])}>
                              {netbook.currentState}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[150px] truncate" title={netbook.batchId}>
                            {netbook.batchId}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/tokens/${netbook.serialNumber}`}>
                                Ver Detalles
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || filterState !== 'ALL' ? 'No se encontraron resultados' : 'No hay netbooks registrados'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filterState !== 'ALL'
                      ? 'Intenta cambiar los filtros de bsqueda'
                      : isAdmin
                        ? 'Comienza registrando el primer netbook del sistema'
                        : 'No hay netbooks registrados en el sistema'
                    }
                  </p>
                  {isAdmin && !searchTerm && filterState === 'ALL' && (
                    <Button asChild>
                      <Link href="/tokens/create" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Registrar Primer Netbook
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
