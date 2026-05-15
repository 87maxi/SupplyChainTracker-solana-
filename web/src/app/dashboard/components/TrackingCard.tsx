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
            {/* Enhanced Tracking Card with textures and animations */}
            <Card className="glass-card group relative overflow-hidden hover-lift texture-noise">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />

                {/* Background texture pattern */}
                <div className="absolute inset-0 texture-dots opacity-50 pointer-events-none" />

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="p-5 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Main Info Section */}
                        <div className="flex-1 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Serial</span>
                                        <Badge variant="outline" className="font-mono text-xs font-semibold tracking-tight border-primary/20 text-primary bg-primary/5 px-2.5 py-0.5 group-hover:border-primary/30 transition-colors">
                                            {netbook.serialNumber}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>
                                            {netbook.currentState === 'FABRICADA' ? 'Registrado: ' : 'Actualizado: '}
                                            {formatDate(netbook.distributionTimestamp)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2.5">
                                    <StatusBadge status={netbook.currentState as NetbookState} />
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="text-[10px] font-semibold text-primary hover:text-primary/80 underline-animated uppercase tracking-wider transition-colors pt-1"
                                    >
                                        Ver detalles
                                    </button>
                                </div>
                            </div>

                            {/* Details Grid - Enhanced with textures */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 group-hover:bg-muted/40 group-hover:border-border/70 transition-all duration-300">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                        <Box className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Lote</p>
                                        <p className="text-sm font-medium truncate font-mono" title={netbook.batchId || 'N/A'}>
                                            {netbook.batchId || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 group-hover:bg-muted/40 group-hover:border-border/70 transition-all duration-300">
                                    <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                                        <Settings className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Especificaciones</p>
                                        <p className="text-sm font-medium truncate" title={netbook.initialModelSpecs || 'N/A'}>
                                            {netbook.initialModelSpecs || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions Section */}
                        {onAction && (
                            <div className="flex items-center justify-end lg:border-l lg:border-border/50 lg:pl-6">
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {netbook.currentState === 'FABRICADA' && isHardwareAuditor && (
                                        <Button
                                            size="sm"
                                            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/30 hover-lift"
                                            onClick={() => onAction('audit', netbook.serialNumber)}
                                        >
                                            Realizar Auditoría HW
                                        </Button>
                                    )}

                                    {netbook.currentState === 'HW_APROBADO' && isSoftwareTechnician && (
                                        <Button
                                            size="sm"
                                            className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/30 hover-lift"
                                            onClick={() => onAction('validate', netbook.serialNumber)}
                                        >
                                            Validar Software
                                        </Button>
                                    )}

                                    {netbook.currentState === 'SW_VALIDADO' && (isSchool || isAdmin) && (
                                        <Button
                                            size="sm"
                                            className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20 hover:border-purple-500/30 hover-lift"
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
