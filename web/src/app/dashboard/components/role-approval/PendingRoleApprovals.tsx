'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useRoleRequests } from '@/hooks/useRoleRequests';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EnhancedRoleApprovalDialog } from '@/app/admin/components/EnhancedRoleApprovalDialog';
import { useState } from 'react';
import { RoleRequest } from '@/types/role-request';

export function PendingRoleApprovals() {
  const { requests: pendingRequests, isLoading } = useRoleRequests();
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No hay solicitudes de rol pendientes
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle>Solicitudes Pendientes</CardTitle>
          <Badge variant="secondary">{pendingRequests.length}</Badge>
        </div>
        <CardDescription>
          Solicitudes que requieren tu aprobación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
              <div className="space-y-1">
                <div className="font-mono text-sm">
                  {truncateAddress(request.address)}
                </div>
                <Badge variant="outline" className="capitalize text-xs">
                  {request.role.replace('_', ' ')}
                </Badge>
              </div>
              <Button 
                size="sm" 
                onClick={() => setSelectedRequest(request)}
              >
                Aprobar
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      
      {selectedRequest && (
        <EnhancedRoleApprovalDialog 
          request={selectedRequest}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedRequest(null);
          }}
          onApproved={() => {
            setSelectedRequest(null);
          }}
        />
      )}
    </Card>
  );
}