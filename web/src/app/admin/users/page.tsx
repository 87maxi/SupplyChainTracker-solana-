// web/src/app/admin/users/page.tsx
"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { getRoleHashes } from '@/lib/roleUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, UserPlus, UserMinus, Users, ArrowLeft, ClipboardCopy } from 'lucide-react';
import { ContractRoles, ContractRoleName } from '@/types/contract';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Address } from 'viem';

// Zod Schema para el formulario de gestión de roles
  // Contraseña para presets que requieren autorización
  const AUTH_PASSWORD = "admin123";

  const roleManagementSchema = z.object({
    userAddress: z.string().min(1, 'La dirección del usuario es requerida.').startsWith('0x', 'Debe ser una dirección hexadecimal válida (0x...).').length(42, 'Debe tener 42 caracteres.'),
    role: z.string().min(1, 'Rol requerido'), // Validación básica, se verificará contra roles reales
  });
type RoleManagementInputs = z.infer<typeof roleManagementSchema>;

// Tipo para la tabla de usuarios
interface UserWithRoles {
  address: Address;
  roles: ContractRoles[];
}

export default function AdminUsersPage() {
  const { address, isConnected, connectWallet, defaultAdminAddress } = useWeb3();
  const { hasRole, hasRoleByHash, getAllRolesSummary, grantRole, revokeRole } = useSupplyChainService();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([]);
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);
  const [roleHashes, setRoleHashes] = useState<Record<string, string>>({});
  const [availableRoles, setAvailableRoles] = useState<Array<{ key: string, label: string, hash: string }>>([]);

  // Helper to get role label from hash
  const getRoleLabel = (roleHash: string): string => {
    const roleEntry = Object.entries(roleHashes).find(([_, hash]) => hash.toLowerCase() === roleHash.toLowerCase());
    if (roleEntry) {
      return roleEntry[0];
    }
    const roleLabels: Record<string, string> = {
      DEFAULT_ADMIN_ROLE: 'Administrador',
      FABRICANTE_ROLE: 'Fabricante',
      AUDITOR_HW_ROLE: 'Auditor Hardware',
      AUDITOR_SW_ROLE: 'Auditor Software',
      GESTOR_INVENTARIO_ROLE: 'Gestor de Inventario',
      AUDITOR_CADENA_ROLE: 'Auditor de Cadena',
      SUPERVISOR_REDES_ROLE: 'Supervisor de Redes',
      PROVEEDOR_COMPONENTES_ROLE: 'Proveedor de Componentes',
      TECNICO_MANTENIMIENTO_ROLE: 'Técnico de Mantenimiento',
    };
    return roleLabels[roleHash] || roleHash.substring(0, 8);
  };

  const form = useForm<RoleManagementInputs>({
    resolver: zodResolver(roleManagementSchema),
    defaultValues: {
      userAddress: '',
      role: 'FABRICANTE_ROLE', // Rol por defecto en el select
    },
  });

  const fetchUsersAndRoles = useCallback(async () => {
    if (!isConnected || !address) {
      setLoading(false);
      setIsAdmin(false);
      return;
    }

    setLoading(true);
    try {
      // Get role hashes from contract
      const hashes = await getRoleHashes();
      setRoleHashes(hashes);
      
      // Create available roles list for the form (excluding DEFAULT_ADMIN_ROLE for safety)
      const available = Object.entries(hashes)
        .filter(([key, _]) => key !== "ADMIN")
        .map(([key, hash]) => ({
          key,
          label: key.replace(/_/g, ' '),
          hash
        }));
      setAvailableRoles(available);

      const userIsAdmin = await hasRoleByHash(hashes.ADMIN, address);
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // Here we'd want to use getAllRolesSummary but it needs updating
        // For now, this handles displaying users
        const summary = await getAllRolesSummary();
        const consolidatedUsers: Record<Address, ContractRoles[]> = {};

        for (const roleNameKey in summary) {
          if (Object.prototype.hasOwnProperty.call(summary, roleNameKey)) {
            const roleName = roleNameKey as ContractRoles;
            if (summary[roleName] && Array.isArray(summary[roleName].members)) {
              summary[roleName].members.forEach((memberAddress: string) => {
                const address = memberAddress as Address;
                if (!consolidatedUsers[address]) {
                  consolidatedUsers[address] = [];
                }
                // Only add the role if it's not already present
                if (!consolidatedUsers[address].includes(roleName)) {
                  consolidatedUsers[address].push(roleName);
                }
              });
            }
          }
        }
        
          // Only add default admin role if address is known and not already present
        if (defaultAdminAddress && !consolidatedUsers[defaultAdminAddress]) {
          consolidatedUsers[defaultAdminAddress] = ["DEFAULT_ADMIN_ROLE"];
        } else if (defaultAdminAddress && consolidatedUsers[defaultAdminAddress] && !consolidatedUsers[defaultAdminAddress].includes("DEFAULT_ADMIN_ROLE")) {
          consolidatedUsers[defaultAdminAddress].push("DEFAULT_ADMIN_ROLE");
        }

        const formattedUsers: UserWithRoles[] = Object.entries(consolidatedUsers)
          .map(([addr, roles]) => ({
            address: addr as Address,
            roles: roles.sort()
          }));
        setUsersWithRoles(formattedUsers);
      }
    } catch (err: any) {
      console.error('Error fetching users and roles:', err);
      toast({
        title: "Error al cargar usuarios y roles",
        description: err.message || "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [address, defaultAdminAddress, getAllRolesSummary, hasRole, isConnected, toast]);

  useEffect(() => {
    fetchUsersAndRoles();
  }, [fetchUsersAndRoles]);

  const onGrantRoleSubmit: SubmitHandler<RoleManagementInputs> = async (data) => {
    setIsSubmittingGrant(true);
    try {
      // Strip _ROLE suffix from the selected role value before passing to grantRole
      const baseRoleName = data.role.replace('_ROLE', '') as ContractRoleName;
      const result = await grantRole(baseRoleName, data.userAddress as Address);
      if (result.success) {
        toast({
          title: "Rol Otorgado",
          description: `Se otorgó el rol ${data.role} a ${data.userAddress}.${result.hash ? ' Tx: ' + result.hash : ''}`,
        });
      } else {
        toast({
          title: "Error al otorgar rol",
          description: result.error || "Desconocido",
          variant: "destructive"
        });
        return;
      }
      form.reset({ userAddress: '', role: 'FABRICANTE_ROLE' });
      await fetchUsersAndRoles(); // Refrescar la lista de usuarios
    } catch (err: any) {
      console.error('Error granting role:', err);
      toast({
        title: "Error al otorgar rol",
        description: err.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGrant(false);
    }
  };

  const onRevokeRoleSubmit: SubmitHandler<RoleManagementInputs> = async (data) => {
    setIsSubmittingRevoke(true);
    try {
      const result = await revokeRole(data.role as `0x${string}`, data.userAddress as Address);
      // revokeRole only returns hash if successful
      toast({
        title: "Rol Revocado",
        description: `Se revocó el rol ${data.role} a ${data.userAddress}.${result ? ' Tx: ' + result : ''}`,
      });
      form.reset({ userAddress: '', role: 'FABRICANTE_ROLE' });
      await fetchUsersAndRoles(); // Refrescar la lista de usuarios
    } catch (err: any) {
      console.error('Error revoking role:', err);
      toast({
        title: "Error al revocar rol",
        description: err.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles", description: text });
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Por favor, conecta tu wallet para acceder a la gestión de usuarios.
            </p>
            <Button size="lg" variant="gradient" onClick={() => connectWallet()} className="h-12 px-8">
              Conectar Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg text-muted-foreground animate-pulse">Cargando usuarios y roles...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <ShieldAlert className="h-12 w-12 text-red-500/50 mb-4" />
            <h3 className="text-xl font-medium text-red-500 mb-2">Acceso Denegado</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Solo los administradores pueden gestionar los roles de los usuarios.
            </p>
            <Button onClick={() => router.push('/admin')} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver al Panel Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios y Roles</h1>
        <Button onClick={() => router.push('/admin')} variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver al Panel Admin
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario para asignar/revocar roles */}
        <Card className="lg:col-span-1"> 
          <CardHeader>
            <CardTitle>Asignar/Revocar Rol</CardTitle>
            <CardDescription>Otorga o quita un rol a una dirección específica.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onGrantRoleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userAddress">Dirección del Usuario</Label>
                <Input
                  id="userAddress"
                  placeholder="0x..." 
                  {...form.register("userAddress")}
                />
                {form.formState.errors.userAddress && (
                  <p className="text-sm text-red-500">{form.formState.errors.userAddress.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleSelect">Seleccionar Rol</Label>
                <Select onValueChange={(value: ContractRoles) => form.setValue("role", value)} value={form.watch("role")}>
                  <SelectTrigger id="roleSelect">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.key} value={role.key}> 
                        {role.label} 
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-red-500">{form.formState.errors.role.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 gap-2" disabled={isSubmittingGrant}>
                  {isSubmittingGrant ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Otorgar Rol
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={form.handleSubmit(onRevokeRoleSubmit)}
                  disabled={isSubmittingRevoke}
                >
                  {isSubmittingRevoke ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                  Revocar Rol
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Listado de Usuarios y Roles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Roles Asignados
            </CardTitle>
            <CardDescription>Visualiza todos los usuarios y los roles que tienen asignados.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {usersWithRoles.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Dirección</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersWithRoles.map((user) => (
                      <TableRow key={user.address}>
                        <TableCell className="font-mono text-xs flex items-center gap-1">
                          {user.address.substring(0, 6) + '...' + user.address.substring(38)}
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(user.address)}>
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, roleIndex) => (
                              <Badge key={roleIndex} variant="secondary" className="px-2 py-0.5 text-xs">
                                {role.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => form.setValue("userAddress", user.address)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No hay usuarios con roles asignados
                </h3>
                <p className="mb-6">
                  Usa el formulario para empezar a asignar roles a los participantes del sistema.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}