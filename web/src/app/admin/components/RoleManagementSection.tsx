// web/src/app/admin/components/RoleManagementSection.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useState } from 'react';
import { eventBus, EVENTS } from '@/lib/events';
import { ToastAction } from '@/components/ui/toast';
import { roleMapper, type RoleName } from '@/lib/roleMapping';

// Definición de los roles disponibles
const availableRoles = [
  { value: 'FABRICANTE_ROLE', label: 'Fabricante' },
  { value: 'AUDITOR_HW_ROLE', label: 'Auditor de Hardware' },
  { value: 'TECNICO_SW_ROLE', label: 'Técnico de Software' },
  { value: 'ESCUELA_ROLE', label: 'Escuela' },
  { value: 'DEFAULT_ADMIN_ROLE', label: 'Administrador' }
] as const;

type RoleValue = typeof availableRoles[number]['value'];

export const RoleManagementSection = () => {
  const { grantRole } = useSupplyChainService();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<RoleValue>('FABRICANTE_ROLE');
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Añadir nuevo miembro
  const handleAddMember = async () => {
    if (!newMemberAddress) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una dirección",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Use roleMapper to convert role name to hash
      const roleHash = await roleMapper.getRoleHash(selectedRole);
      const result = await grantRole(selectedRole as RoleName, newMemberAddress as `0x${string}`);

      if (result.success) {
        toast({
          title: "Éxito",
          description: `Rol otorgado correctamente al usuario ${newMemberAddress}.`,
          action: result.hash ? <ToastAction altText="Ver transacción" onClick={() => window.open(`https://sepolia.etherscan.io/tx/${result.hash}`, '_blank')}>Ver TX</ToastAction> : undefined
        });
        setNewMemberAddress('');
        eventBus.emit(EVENTS.ROLE_UPDATED);
      }
    } catch (error: any) {
      console.error('Error al otorgar rol:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo otorgar el rol",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Otorgar Nuevo Rol</CardTitle>
        <CardDescription>Asigna roles manualmente a direcciones específicas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="role-select">Seleccionar Rol</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as RoleValue)}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label htmlFor="new-member">Dirección de Wallet</Label>
            <div className="flex gap-2">
              <Input
                id="new-member"
                placeholder="0x..."
                value={newMemberAddress}
                onChange={(e) => setNewMemberAddress(e.target.value)}
              />
              <Button onClick={handleAddMember} disabled={loading}>
                {loading ? 'Procesando...' : 'Otorgar Rol'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
};
