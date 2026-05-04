"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Shield } from 'lucide-react';
import { getRoleMembers } from '@/lib/api/serverRpc';
import { getRoleHashes } from '@/lib/roleUtils';
import { useWeb3 } from '@/hooks/useWeb3';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserRoleData {
  role: string;
  address: string;
  since: string;
  status: 'active' | 'inactive';
  id?: string;
}

const roleColors = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  fabricante: 'bg-blue-100 text-blue-800 border-blue-200',
  auditor_hw: 'bg-green-100 text-green-800 border-green-200',
  tecnico_sw: 'bg-purple-100 text-purple-800 border-purple-200',
  escuela: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function UsersList() {
  const { isConnected } = useWeb3();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users when component mounts or connection changes
  useEffect(() => {
    if (isConnected) {
      fetchUsers();
    } else {
      setUsers([]);
      setIsLoading(false);
    }
  }, [isConnected]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // Get role hashes from contract
      const roleHashes = await getRoleHashes();

      // Fetch members for each role concurrently
      const [adminMembers, fabricanteMembers, auditorHwMembers, tecnicoSwMembers, escuelaMembers] =
        await Promise.all([
          getRoleMembers(roleHashes.ADMIN).catch(() => []),
          getRoleMembers(roleHashes.FABRICANTE).catch(() => []),
          getRoleMembers(roleHashes.AUDITOR_HW).catch(() => []),
          getRoleMembers(roleHashes.TECNICO_SW).catch(() => []),
          getRoleMembers(roleHashes.ESCUELA).catch(() => [])
        ]);

      // Transform to UserRoleData format
      const allUsers: UserRoleData[] = [];

      // Add admin members
      adminMembers.forEach((address: string, index: number) => {
        allUsers.push({
          id: `admin-${index}`,
          address,
          role: 'admin',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      // Add fabricante members
      fabricanteMembers.forEach((address: string, index: number) => {
        allUsers.push({
          id: `fabricante-${index}`,
          address,
          role: 'fabricante',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      // Add auditor_hw members
      auditorHwMembers.forEach((address: string, index: number) => {
        allUsers.push({
          id: `auditor_hw-${index}`,
          address,
          role: 'auditor_hw',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      // Add tecnico_sw members
      tecnicoSwMembers.forEach((address: string, index: number) => {
        allUsers.push({
          id: `tecnico_sw-${index}`,
          address,
          role: 'tecnico_sw',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      // Add escuela members
      escuelaMembers.forEach((address: string, index: number) => {
        allUsers.push({
          id: `escuela-${index}`,
          address,
          role: 'escuela',
          since: new Date().toISOString().split('T')[0],
          status: 'active'
        });
      });

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Gestión de Usuarios</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </div>
        <CardDescription>
          Administrar roles y permisos para todas las direcciones registradas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="h-12 px-4 text-left text-sm font-medium">Dirección</th>
                <th className="h-12 px-4 text-left text-sm font-medium">Rol</th>
                <th className="h-12 px-4 text-left text-sm font-medium">Estado</th>
                <th className="h-12 px-4 text-left text-sm font-medium">Desde</th>
                <th className="h-12 px-4 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="h-16 px-4 py-2 font-mono text-sm">
                    {user.address}
                  </td>
                  <td className="h-16 px-4 py-2">
                    <Badge variant="outline" className={roleColors[user.role as keyof typeof roleColors]}>
                      <Shield className="mr-1 h-3 w-3" />
                      {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </td>
                  <td className="h-16 px-4 py-2">
                    <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="h-16 px-4 py-2 text-sm text-muted-foreground">
                    {new Date(user.since).toLocaleDateString()}
                  </td>
                  <td className="h-16 px-4 py-2 text-right">
                    <Button variant="outline" size="sm" className="mr-2">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      Revocar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}