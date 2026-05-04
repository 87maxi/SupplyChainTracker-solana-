// web/src/app/admin/components/EnhancedRoleApprovalDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, Clock, ShieldCheck, XCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { truncateAddress } from '@/lib/utils';
import { useState } from 'react';
import { RoleRequest } from '@/types/role-request';
import { useToast } from '@/hooks/use-toast';
import { useRoleRequests } from '@/hooks/useRoleRequests';

// Tipos para el estado del diálogo
type ApprovalStep = 'confirm' | 'processing' | 'completed' | 'error';

type TransactionStatus = 'pending' | 'confirmed' | 'failed';

interface EnhancedRoleApprovalDialogProps {
  request: RoleRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

export function EnhancedRoleApprovalDialog({
  request,
  open,
  onOpenChange,
  onApproved
}: EnhancedRoleApprovalDialogProps) {
  const { toast } = useToast();
  const { approveMutation } = useRoleRequests();
  
  const [step, setStep] = useState<ApprovalStep>('confirm');
  const [txStatus, setTxStatus] = useState<TransactionStatus>('pending');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Iniciar el proceso de aprobación
  const handleApprove = async () => {
    setStep('processing');
    setTxStatus('pending');
    setError(null);
    
    try {
      // Llamar a la mutación de aprobación
      const result = await approveMutation.mutateAsync({
        requestId: request.id,
        role: request.role,
        userAddress: request.address
      });
      
      // Actualizar estado con el hash de la transacción
      if (result) {
        setTxHash(result);
        setStep('completed');
        setTxStatus('confirmed');
        
        // Mostrar toast de éxito
        toast({
          title: "Solicitud aprobada",
          description: `El rol ${request.role} ha sido asignado a ${truncateAddress(request.address)}`,
        });
        
        // Notificar al componente padre
        onApproved();
      }
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message || 'Error desconocido al aprobar la solicitud');
      setStep('error');
      setTxStatus('failed');
      
      toast({
        title: "Error",
        description: error || 'Error desconocido',
        variant: "destructive"
      });
    }
  };

  // Renderizar el contenido según el paso actual
  const renderContent = () => {
    switch (step) {
      case 'confirm':
        return (
          <div className="space-y-6">
            <DialogDescription>
              ¿Estás seguro de que deseas aprobar esta solicitud de rol? Esta acción no se puede deshacer.
            </DialogDescription>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-muted-foreground">Usuario</p>
                <p className="font-mono text-sm">{truncateAddress(request.address)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rol solicitado</p>
                <Badge variant="outline">{request.role}</Badge>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleApprove}
                className="flex-1"
              >
                Sí, aprobar
              </Button>
            </div>
          </div>
        );
        
      case 'processing':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Procesando aprobación...</p>
                <p className="text-sm text-blue-700">Por favor, confirma en tu wallet</p>
              </div>
            </div>
            
            {txHash && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">Transacción enviada!</span>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="text-center text-sm text-muted-foreground">
              El proceso puede tardar unos minutos. No cierres esta ventana.
            </div>
            
            <Button 
              disabled
              className="w-full"
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirmando...
            </Button>
          </div>
        );
        
      case 'completed':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">¡Éxito!</p>
                <p className="text-sm text-green-700">La solicitud ha sido aprobada exitosamente</p>
              </div>
            </div>
            
            {txHash && (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Hash de transacción:</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg font-mono text-xs">
                  {truncateAddress(txHash)}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(`https://etherscan.io/tx/${txHash}`, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => {
                onOpenChange(false);
                // Resetear estados cuando se cierra
                setTimeout(() => {
                  setStep('confirm');
                  setTxHash(null);
                  setError(null);
                }, 300);
              }}
              className="w-full"
            >
              Cerrar
            </Button>
          </div>
        );
        
      case 'error':
        return (
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || 'No se pudo completar la aprobación de la solicitud'}
              </AlertDescription>
            </Alert>
            
                        <div className="text-center text-sm text-muted-foreground">
              Por favor, intenta nuevamente o contacta al equipo técnico.
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep('confirm');
                  setError(null);
                }}
                className="flex-1"
              >
                Intentar de nuevo
              </Button>
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  // Resetear estados cuando se cierra
                  setTimeout(() => {
                    setStep('confirm');
                    setTxHash(null);
                    setError(null);
                  }, 300);
                }}
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirma Aprobación de Rol</DialogTitle>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}