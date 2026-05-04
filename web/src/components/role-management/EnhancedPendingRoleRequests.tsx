import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ShieldCheck, XCircle, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRoleRequests } from '@/hooks/useRoleRequests';
import { RoleRequest as RoleRequestType } from '@/types/role-request';
import { EnhancedRoleApprovalDialog } from '@/app/admin/components/EnhancedRoleApprovalDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';

// Tipos para el estado de aprobación
type ApprovalStatus = 'pending' | 'confirming' | 'approved' | 'confirmed' | 'rejected';

type RoleStatusBadgeProps = {
  status: ApprovalStatus;
  transactionHash?: string;
  onTransactionConfirmed?: () => void;
};

// Componente de badge de estado reutilizable
function RoleStatusBadge({ status, transactionHash }: RoleStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pendiente',
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Clock className='h-3 w-3' />
    },
    confirming: {
      label: 'Confirmando...',
      color: 'bg-blue-100 text-blue-800 animate-pulse',
      icon: <AlertTriangle className='h-3 w-3' />
    },
    approved: {
      label: 'Aprobado',
      color: 'bg-blue-100 text-blue-800',
      icon: <CheckCircle className='h-3 w-3' />
    },
    confirmed: {
      label: 'Confirmado',
      color: 'bg-green-100 text-green-800',
      icon: <ShieldCheck className='h-3 w-3' />
    },
    rejected: {
      label: 'Rechazado',
      color: 'bg-red-100 text-red-800',
      icon: <XCircle className='h-3 w-3' />
    }
  };

  const config = statusConfig[status];

  return (
    <Badge className={`flex items-center gap-1 ${config.color}`} variant='outline'>
      {config.icon}
      {config.label}
      {transactionHash && status === 'confirmed' && (
        <button 
          onClick={() => window.open(`https://etherscan.io/tx/${transactionHash}`, '_blank')}
          className='ml-1 hover:underline flex items-center gap-1'
        >
          <ExternalLink className='h-3 w-3' />
          ver TX
        </button>
      )}
    </Badge>
  );
}

// Estado de errores
type ErrorState = {
  type: 'network' | 'contract' | 'user' | 'unknown';
  message: string;
  timestamp: number;
};

// Añadir tipo para el estado del diálogo
interface ApprovalDialogState {
  open: boolean;
  request: RoleRequestType | null;
}

export default function EnhancedPendingRoleRequests() {
  const { toast } = useToast();
  const { requests: pendingRequests, rejectMutation } = useRoleRequests();
  
  // Estado para el diálogo de aprobación
  const [approvalDialog, setApprovalDialog] = useState<ApprovalDialogState>({
    open: false,
    request: null
  });

  // Estado para errores
  const [error, setError] = useState<ErrorState | null>(null);

  // Manejar el rechazo de solicitud
  const handleRejectRequest = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas rechazar esta solicitud?')) return;

    setRejectingId(id);
    try {
      await rejectMutation.mutateAsync(id);
      
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada correctamente.",
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError("No se pudo rechazar la solicitud");
    } finally {
      setRejectingId(null);
    }
  };

  // Cerrar el diálogo de aprobación
  const handleDialogClose = (open: boolean) => {
    setApprovalDialog(prev => ({
      ...prev,
      open
    }));
  };

  // Manejar la aprobación exitosa
  const handleApproved = () => {
    toast({
      title: "Solicitud aprobada",
      description: "El rol ha sido asignado exitosamente",
    });
  };

  // Mostrar mensaje de error
  const showError = (message: string, type: ErrorState['type'] = 'unknown') => {
    setError({ type, message, timestamp: Date.now() });
    toast({
      title: "Error",
      description: message,
      variant: "destructive"
    });
  };

  // Estado de carga del rechazo
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solicitudes de Rol Pendientes</CardTitle>
              <CardDescription>
                Revisa y gestiona las solicitudes de acceso al sistema.
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {pendingRequests.length} solicitud(es) pendiente(s)
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Mensaje de error general */}
          {error && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Lista de solicitudes */}
          <div className="rounded-md border">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay solicitudes pendientes de aprobación.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase bg-muted/50">
                    <tr>
                      <th className="px-6 py-4 font-medium text-left">Usuario</th>
                      <th className="px-6 py-4 font-medium text-left">Rol Solicitado</th>
                      <th className="px-6 py-4 font-medium text-left">Fecha</th>
                      <th className="px-6 py-4 font-medium text-left">Estado</th>
                      <th className="px-6 py-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingRequests.map((request: RoleRequestType) => (
                      <tr 
                        key={request.id} 
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-sm">
                          {truncateAddress(request.address)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="capitalize">
                            {request.role.replace('_', ' ').toLowerCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {new Date(request.timestamp).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                      </td>
                      <td className="px-6 py-4">
                        <RoleStatusBadge status="pending" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => {
                              setApprovalDialog({
                                open: true,
                                request
                              });
                            }}
                            disabled={rejectMutation.isPending && rejectingId === request.id}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Aprobar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={rejectMutation.isPending && rejectingId === request.id}
                          >
                            {rejectMutation.isPending && rejectingId === request.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Procesando...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Rechazar
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    {approvalDialog.request && (
      <EnhancedRoleApprovalDialog
        key={`approval-dialog-${approvalDialog.request.id}`}
        open={approvalDialog.open}
        onOpenChange={handleDialogClose}
        request={approvalDialog.request}
        onApproved={handleApproved}
      />
    )}
    </>
  );
}
