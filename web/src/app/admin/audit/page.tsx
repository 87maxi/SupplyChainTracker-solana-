'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { getProvider } from '@/lib/web3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';
import { AuditLog } from '@/types/audit';
import { useToast } from '@/hooks/use-toast';
import { getEventService } from '@/lib/services/event-service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWeb3 } from '@/hooks/useWeb3';

const ITEMS_PER_PAGE = 10;

export default function AuditPage() {
  const { address } = useWeb3();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventService, setEventService] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Inicializar el servicio de eventos
  useEffect(() => {
    let isMounted = true;
    setMounted(true);

    const initEventService = async () => {
      try {
        const service = await getEventService();
        if (!isMounted) return;

        setEventService(service);

        // Escuchar eventos cuando el servicio esté listo
        if (service) {
          const allLogs = await service.getAuditLogs();
          if (!isMounted) return;
          setLogs(Array.isArray(allLogs) ? allLogs : []);
        }
      } catch (error) {
        console.error('Error initializing event service:', error);
        if (isMounted) {
          toast({
            title: 'Error',
            description: 'No se pudo conectar al servicio de eventos',
            variant: 'destructive',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initEventService();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const applyFilters = useCallback(() => {
    const filtered = logs.filter((log) => {
      const matchesSearch = searchTerm === '' ||
        log.transactionHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return filtered;
  }, [logs, searchTerm]);

  const filteredLogs = useMemo(() => applyFilters(), [applyFilters]);
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'REQUEST_ROLE':
        return 'secondary';
      case 'APPROVE_ROLE':
      case 'REVOKE_ROLE':
        return 'default';
      case 'GRANT_ROLE':
        return 'success';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Auditoría del Sistema</h1>
          <p className="text-muted-foreground">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por acción, dirección o hash..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoría ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                No se encontraron registros de auditoría
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedLogs.map((log, index) => (
                  <div
                    key={`${log.transactionHash}-${index}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-2 mb-2 sm:mb-0">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Por: <span className="font-mono text-xs">{log.actor}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cuándo: {formatDate(log.timestamp)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono break-all">
                        {log.transactionHash?.substring(0, 8)}...
                        {log.transactionHash?.substring(log.transactionHash.length - 6)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="flex items-center px-4">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}