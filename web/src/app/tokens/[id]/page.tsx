"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Netbook } from '@/types/supply-chain-types';

interface TokenDetailsProps {
  params: {
    id: string;
  };
}

export default function TokenDetailsPage({ params }: TokenDetailsProps) {
  const { id } = params;
  const { isConnected } = useWeb3();
  const { getNetbookReport } = useSupplyChainService();
  const [netbook, setNetbook] = useState<Netbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchNetbook = async () => {
      if (!isConnected) return;
      
      setLoading(true);
      setError('');
      
      try {
        const report = await getNetbookReport(id);
        setNetbook(report);
      } catch (err) {
        console.error('Error fetching netbook:', err);
        setError('Failed to load netbook details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNetbook();
  }, [id, isConnected]);
  
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
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
            <Button className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
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
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Netbook {netbook.serialNumber}</CardTitle>
          <CardDescription>Información sobre este netbook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-medium">Número de Serie</p>
              <p className="text-foreground">{netbook.serialNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Lote</p>
              <p className="text-foreground">{netbook.batchId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Especificación del Modelo</p>
              <p className="text-foreground">{netbook.initialModelSpecs}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Estado Actual</p>
              <p className="text-foreground">{netbook.currentState}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}