"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useState, useEffect } from 'react';

export default function TransfersPage() {
  const { address, isConnected } = useWeb3();
  const { getAllSerialNumbers, getNetbookState } = useSupplyChainService();
  const [transfers, setTransfers] = useState<Array<{ serial: string, from: string, to: string, status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!isConnected) return;

      setLoading(true);
      setError('');

      try {
        // Get all serial numbers
        const serials = await getAllSerialNumbers();

        // Filter for transfers that are pending approval
        // In a real implementation, we'd have a pending transfers mapping in the contract
        // For now, we'll simulate pending transfers based on state transitions

        const pendingTransfers: Array<{ serial: string, from: string, to: string, status: string }> = [];

        for (const serial of serials) {
          const stateValue = await getNetbookState(serial);
          const state = ['FABRICADA', 'HW_APROBADO', 'SW_VALIDADO', 'DISTRIBUIDA'][Number(stateValue)];

          // In our state machine, transfers happen when moving from SW_VALIDADO to DISTRIBUIDA
          // We'll consider these as "pending" until confirmed
          if (state === 'DISTRIBUIDA') { // DISTRIBUIDA
            // This is a completed transfer, not pending
            // In a real implementation, we'd have a separate pending transfers mapping
            // For now, we'll show all transfers as completed
            pendingTransfers.push({
              serial,
              from: 'Fabricante',
              to: 'Institución Educativa',
              status: 'Completado'
            });
          }
        }

        setTransfers(pendingTransfers);
      } catch (err) {
        console.error('Error fetching transfers:', err);
        setError('Failed to load transfers');
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg mb-4">Por favor, conecta tu wallet para ver las transferencias pendientes.</p>
            <Button onClick={() => window.location.reload()}>Conectar Wallet</Button>
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p>Cargando transferencias...</p>
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
        <h1 className="text-3xl font-bold mb-8">Transferencias Pendientes</h1>

        <Card>
          <CardHeader>
            <CardTitle>Transferencias de Netbooks</CardTitle>
            <CardDescription>Lista de transferencias de netbooks entre entidades</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="text-red-500 p-4 rounded-md bg-red-50 mb-4">{error}</div>}

            {transfers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número de Serie</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{transfer.serial}</TableCell>
                      <TableCell>{transfer.from}</TableCell>
                      <TableCell>{transfer.to}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${transfer.status === 'Completado' ? 'bg-green-100 text-green-800' :
                            transfer.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {transfer.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          // In a real implementation, this would open a modal to approve/reject
                          // For now, we'll redirect to the token details page
                          window.location.href = `/tokens/${transfer.serial}`;
                        }}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay transferencias pendientes.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}