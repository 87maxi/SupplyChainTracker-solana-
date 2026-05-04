"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RoleRequestService } from '@/services/RoleRequestService';
import { useWeb3 } from '@/hooks/useWeb3';
import { useSignMessage, useAccount } from 'wagmi';

interface RoleRequestModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RoleRequestModal({ isOpen, onOpenChange }: RoleRequestModalProps) {
    const { signMessageAsync } = useSignMessage();
    const { address } = useAccount();
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!address) {
            toast({
                title: "Error",
                description: "Por favor conecta tu wallet",
                variant: "destructive",
            });
            return;
        }

        if (!role) {
            toast({
                title: "Error",
                description: "Por favor selecciona un rol",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);

            // 1. Prompt user to sign a message
            const roleName = role.replace(/_ROLE/g, '').replace(/_/g, ' ').toLowerCase()
                .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const message = `Solicito el rol de ${roleName} para mi dirección ${address} en SupplyChainTracker.`;
            const signature = await signMessageAsync({ message });

            // 2. Submit request with signature
            await RoleRequestService.createRequest({
              userAddress: address as string,
              role,
              signature
            });

            toast({
                title: "Solicitud enviada",
                description: "Tu solicitud de rol ha sido firmada y enviada correctamente. Está pendiente de aprobación.",
            });

            onOpenChange(false);
        } catch (error: any) {
            console.error('Error submitting role request:', error);

            // Handle user rejection
            if (error.code === 4001 || error.name === 'UserRejectedRequestError') {
                toast({
                    title: "Firma rechazada",
                    description: "Debes firmar el mensaje para enviar la solicitud.",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: error.message || "No se pudo enviar la solicitud",
                    variant: "destructive",
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Solicitar Rol</DialogTitle>
                    <DialogDescription>
                        Selecciona el rol que deseas solicitar para operar en el sistema.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FABRICANTE_ROLE">Fabricante</SelectItem>
                            <SelectItem value="AUDITOR_HW_ROLE">Auditor HW</SelectItem>
                            <SelectItem value="TECNICO_SW_ROLE">Técnico SW</SelectItem>
                            <SelectItem value="ESCUELA_ROLE">Escuela</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading} className="h-11">
                        {loading ? 'Enviando...' : 'Enviar Solicitud'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
