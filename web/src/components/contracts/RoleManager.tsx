import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { useToast } from '@hooks/use-toast';
import { useRoleCallsManager } from '@/hooks/useRoleCallsManager';
import { useRoleData } from '@/hooks/useRoleData';
import { ROLE_HASHES } from '@/lib/constants/roles';

interface Role {
  name: string;
  description: string;
  color: string;
}

// Definición de roles disponibles
const roles: Role[] = [
  {
    name: 'fabricante',
    description: 'Puede registrar nuevas netbooks en el sistema',
    color: 'bg-blue-100'
  },
  {
    name: 'auditor_hw',
    description: 'Puede realizar auditorías de hardware',
    color: 'bg-green-100'
  },
  {
    name: 'tecnico_sw',
    description: 'Puede validar el software instalado',
    color: 'bg-yellow-100'
  },
  {
    name: 'escuela',
    description: 'Puede asignar netbooks a estudiantes',
    color: 'bg-purple-100'
  }
];

export function RoleManager() {
  const [selectedRole, setSelectedRole] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { grantRole } = useRoleCallsManager();
  const { data: accountInfo, refetch: refetchAccountInfo } = useRoleData();

  // Verificar si el usuario puede conceder roles
  const canGrantRoles = accountInfo?.roles?.includes('admin') || false;

  const handleGrantRole = async () => {
    if (!selectedRole || !address) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }

    // Validar dirección Ethereum
    if (!/^(0x)?[0-9a-fA-F]{40}$/.test(address)) {
      toast({
        title: "Error",
        description: "Dirección Ethereum inválida",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Convertir nombre del rol a hash
      const roleHash = roleHashMap[selectedRole];
      
      if (!roleHash) {
        throw new Error('Rol no válido');
      }
      
      const result = await grantRole(roleHash, address);
      
      if (result.success) {
        toast({
          title: "Éxito",
          description: `Rol ${selectedRole} concedido a ${address}`,
        });
        
        // Limpiar formulario
        setSelectedRole('');
        setAddress('');
        
        // Refrescar información de la cuenta
        refetchAccountInfo();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error granting role:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo conceder el rol",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mapeo de nombres de roles a hashes
  const roleHashMap: Record<string, string> = {
    fabricante: ROLE_HASHES.FABRICANTE,
    auditor_hw: ROLE_HASHES.AUDITOR_HW,
    tecnico_sw: ROLE_HASHES.TECNICO_SW,
    escuela: ROLE_HASHES.ESCUELA,
    admin: ROLE_HASHES.ADMIN
  };

  if (!canGrantRoles) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Roles</CardTitle>
          <CardDescription>
            Necesitas permisos de administrador para gestionar roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Solo los administradores pueden conceder roles a otros usuarios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Roles</CardTitle>
        <CardDescription>
          Conceder roles a usuarios para permitirles realizar acciones específicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rol a Conceder</Label>
              <Select onValueChange={setSelectedRole} value={selectedRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${role.color} mr-2`}></div>
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Dirección del Usuario</Label>
              <Input
                id="address"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          
          {selectedRole && (
            <div className="p-4 border rounded-md bg-muted">
              <h4 className="text-sm font-medium mb-2">Detalles del Rol</h4>
              <p className="text-sm text-muted-foreground">
                {roles.find(r => r.name === selectedRole)?.description}
              </p>
            </div>
          )}
          
          <Button 
            onClick={handleGrantRole} 
            disabled={loading || !selectedRole || !address}
            className="w-full md:w-auto"
          >
            {loading ? 'Concediendo...' : 'Conceder Rol'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}