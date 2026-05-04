// web/src/app/admin/components/ApprovedAccountsList.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { useState, useEffect, useCallback } from 'react';
import { truncateAddress } from '@/lib/utils';
import { Copy, Search, RefreshCw, Trash2 } from 'lucide-react';
import { eventBus, EVENTS } from '@/lib/events';
import { ContractRoles } from '@/types/contract';
import { roleMapper } from '@/lib/roleMapping';

const availableRoles = [
    { value: 'ALL', label: 'Todos los Roles' },
    { value: 'FABRICANTE', label: 'Fabricante' },
    { value: 'AUDITOR_HW', label: 'Auditor de Hardware' },
    { value: 'TECNICO_SW', label: 'Técnico de Software' },
    { value: 'ESCUELA', label: 'Escuela' },
    { value: 'ADMIN', label: 'Administrador' }
] as const;

type RoleFilter = typeof availableRoles[number]['value'];

interface Member {
    address: string;
    role: string;
    roleLabel: string;
}

export function ApprovedAccountsList() {
    const { getAllRolesSummary, revokeRole } = useSupplyChainService();
    const { toast } = useToast();

    const [members, setMembers] = useState<Member[]>([]);
    const [optimisticMembers, setOptimisticMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterRole, setFilterRole] = useState<RoleFilter>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [processingAddress, setProcessingAddress] = useState<string | null>(null);

    const [isLoaded, setIsLoaded] = useState(false);

    // Load optimistic members from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('optimistic_approvals');
            if (stored) {
                console.log('[ApprovedAccountsList] Loaded optimistic members:', stored);
                setOptimisticMembers(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Error loading optimistic approvals:', e);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    // Save optimistic members to localStorage whenever they change
    useEffect(() => {
        if (!isLoaded) return; // Prevent overwriting before load
        console.log('[ApprovedAccountsList] Saving optimistic members to localStorage:', optimisticMembers);
        localStorage.setItem('optimistic_approvals', JSON.stringify(optimisticMembers));
    }, [optimisticMembers, isLoaded]);

    const fetchMembers = useCallback(async (force = false) => {
        setLoading(true);
        try {
            const summary = await getAllRolesSummary(force);
            const allMembers: Member[] = [];

            if (summary) {
                Object.entries(summary).forEach(([roleKey, data]: [string, any]) => {
                if (data && data.members && Array.isArray(data.members)) {
                    const roleLabel = availableRoles.find(r => r.value === roleKey)?.label || roleKey;
                    data.members.forEach((address: string) => {
                        allMembers.push({
                            address,
                            role: roleKey,
                            roleLabel
                        });
                    });
                }
                });

                setMembers(allMembers);
            }

            // Clear optimistic members that are now in the real list
            setOptimisticMembers(prev => {
                const filtered = prev.filter(opt =>
                    !allMembers.some(real => real.address.toLowerCase() === opt.address.toLowerCase() && real.role === opt.role)
                );
                return filtered;
            });
        } catch (error) {
            console.error('Error fetching members:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los usuarios aprobados.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [getAllRolesSummary, toast]);

    useEffect(() => {
        fetchMembers(false);

        const unsubscribe = eventBus.on(EVENTS.ROLE_UPDATED, (data: any) => {
            console.log('[ApprovedAccountsList] Role update received:', data);

            if (data && data.action === 'approved' && data.address && data.role) {
                // Optimistically add the new member
                const roleLabel = availableRoles.find(r => r.value === data.role)?.label || data.role;
                const newMember: Member = {
                    address: data.address,
                    role: data.role,
                    roleLabel: roleLabel
                };

                setOptimisticMembers(prev => {
                    // Avoid duplicates
                    if (prev.some(m => m.address === newMember.address && m.role === newMember.role)) return prev;
                    return [newMember, ...prev];
                });
            }

            // Also trigger a background fetch
            fetchMembers(true);
        });

        return () => unsubscribe();
    }, [fetchMembers]);

    const handleRevoke = async (role: string, address: string) => {
        if (!confirm('¿Estás seguro de que deseas revocar este rol?')) return;

        setProcessingAddress(address);
        try {
            // 1. Get the role hash using our centralized mapper
            const roleHash = await roleMapper.getRoleHash(role);
            
            // 2. Send transaction with the proper role hash
            const hash = await revokeRole(roleHash, address as `0x${string}`);
            console.log('[ApprovedAccountsList] Revoke TX submitted:', hash);

            toast({
                title: "Transacción Enviada",
                description: "La revocación se ha enviado a la blockchain.",
            });

            // 2. Optimistic Update: Remove from BOTH lists immediately
            setOptimisticMembers(prev => prev.filter(m => m.address !== address));
            setMembers(prev => prev.filter(m => m.address !== address));

            // 3. Trigger background refresh (non-blocking)
            // We don't wait for it here, just kick it off
            fetchMembers(true);

        } catch (error: any) {
            console.error('Error revoking role:', error);
            toast({
                title: "Error",
                description: error.message || "No se pudo revocar el rol",
                variant: "destructive"
            });
        } finally {
            setProcessingAddress(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copiado",
            description: "Dirección copiada al portapapeles"
        });
    };

    // Merge real and optimistic members
    const allDisplayMembers = [...optimisticMembers, ...members];

    // Filter logic
    const filteredMembers = allDisplayMembers.filter((member, index, self) => {
        // Deduplicate based on address+role (prefer optimistic if it's newer, but here we just take the first one)
        const isDuplicate = self.findIndex(m => m.address === member.address && m.role === member.role) !== index;
        if (isDuplicate) return false;

        const matchesRole = filterRole === 'ALL' || member.role === filterRole;
        const matchesSearch = member.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.roleLabel.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Cuentas Aprobadas</CardTitle>
                        <CardDescription>Lista completa de usuarios con acceso al sistema</CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => fetchMembers(true)} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por dirección..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <div className="w-full sm:w-[200px]">
                        <Select value={filterRole} onValueChange={(value) => setFilterRole(value as RoleFilter)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableRoles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                        {role.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol Asignado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        Cargando usuarios...
                                    </TableCell>
                                </TableRow>
                            ) : filteredMembers.length > 0 ? (
                                filteredMembers.map((member) => {
                                    const isOptimistic = optimisticMembers.some(m => m.address === member.address && m.role === member.role);

                                    return (
                                        <TableRow key={`${member.address}-${member.role}`} className={isOptimistic ? "bg-muted/30" : ""}>
                                            <TableCell className="font-mono text-sm">
                                                <div className="flex items-center gap-2">
                                                    {truncateAddress(member.address)}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => copyToClipboard(member.address)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    {isOptimistic && (
                                                        <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 bg-yellow-50">
                                                            Procesando
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-normal">
                                                    {member.roleLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRevoke(member.role, member.address)}
                                                    disabled={processingAddress === member.address || member.role === 'DEFAULT_ADMIN_ROLE'}
                                                >
                                                    {processingAddress === member.address ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-4 w-4" />
                                                    )}
                                                    <span className="sr-only">Revocar</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No se encontraron usuarios con los filtros actuales.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
