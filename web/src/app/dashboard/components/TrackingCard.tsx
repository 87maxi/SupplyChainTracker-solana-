"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Calendar, Box, Settings } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { Netbook, NetbookState } from "@/types/supply-chain-types";
import { useUserRoles } from "@/hooks/useUserRoles";
import { NetbookDetailsModal } from "@/components/dashboard/NetbookDetailsModal";

interface TrackingCardProps {
    netbook: Netbook;
    onAction?: (action: string, serial: string) => void;
}

export function TrackingCard({ netbook, onAction }: TrackingCardProps) {
    const { isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!netbook) return null;

    // Format date helper
    const formatDate = (timestamp: string | number) => {
        if (!timestamp || timestamp === '0') return 'Pendiente';
        try {
            return new Date(Number(timestamp) * 1000).toLocaleDateString();
        } catch (e) {
            return 'Fecha inválida';
        }
    };

    return (
        <>
            <Card className="hover:bg-white/5 transition-all duration-200 border-white/5 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Main Info Section */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Serial Number</span>
                                        <Badge variant="outline" className="font-mono text-sm font-bold tracking-tight border-primary/20 text-primary bg-primary/5">
                                            {netbook.serialNumber}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        <span>
                                            {netbook.currentState === 'FABRICADA' ? 'Registrado: ' : 'Actualizado: '}
                                            {formatDate(netbook.distributionTimestamp)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={netbook.currentState as NetbookState} />
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tighter"
                                    >
                                        Ver más detalles
                                    </button>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-md bg-blue-500/10 text-blue-400">
                                        <Box className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lote (Batch ID)</p>
                                        <p className="text-sm font-medium truncate" title={netbook.batchId || 'N/A'}>
                                            {netbook.batchId || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5">
                                    <div className="p-2 rounded-md bg-purple-500/10 text-purple-400">
                                        <Settings className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Especificaciones</p>
                                        <p className="text-sm font-medium truncate" title={netbook.initialModelSpecs || 'N/A'}>
                                            {netbook.initialModelSpecs || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Section */}
                        {onAction && (
                            <div className="flex items-center justify-end lg:border-l lg:border-white/10 lg:pl-6">
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {netbook.currentState === 'FABRICADA' && isHardwareAuditor && (
                                        <Button
                                            size="sm"
                                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20"
                                            onClick={() => onAction('audit', netbook.serialNumber)}
                                        >
                                            Realizar Auditoría HW
                                        </Button>
                                    )}

                                    {netbook.currentState === 'HW_APROBADO' && isSoftwareTechnician && (
                                        <Button
                                            size="sm"
                                            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"
                                            onClick={() => onAction('validate', netbook.serialNumber)}
                                        >
                                            Validar Software
                                        </Button>
                                    )}

                                    {netbook.currentState === 'SW_VALIDADO' && (isSchool || isAdmin) && (
                                        <Button
                                            size="sm"
                                            className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20"
                                            onClick={() => onAction('assign', netbook.serialNumber)}
                                        >
                                            Asignar a Alumno
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <NetbookDetailsModal
                netbook={netbook}
                isOpen={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </>
    );
}
