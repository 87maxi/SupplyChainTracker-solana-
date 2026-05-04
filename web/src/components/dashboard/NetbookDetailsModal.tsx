"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Netbook } from "@/types/supply-chain-types";
import { Package, ShieldCheck, Monitor, Truck, Calendar, Box, Settings, User, School } from "lucide-react";

interface NetbookDetailsModalProps {
    netbook: Netbook | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NetbookDetailsModal({ netbook, isOpen, onOpenChange }: NetbookDetailsModalProps) {
    if (!netbook) return null;

    const formatDate = (timestamp: string | number) => {
        if (!timestamp || timestamp === '0') return 'Pendiente';
        try {
            return new Date(Number(timestamp) * 1000).toLocaleString();
        } catch (e) {
            return 'Fecha inválida';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        Detalles de Netbook
                    </DialogTitle>
                    <DialogDescription>
                        Información completa de trazabilidad para el número de serie:
                        <span className="font-mono font-bold ml-1 text-primary">{netbook.serialNumber}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Estado Actual */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Estado Actual</p>
                            <p className="text-lg font-bold">{netbook.currentState}</p>
                        </div>
                        <Badge variant="outline" className="h-8 px-4">
                            {netbook.currentState}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Datos de Origen */}
                        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-blue-400">
                                <Box className="h-4 w-4" />
                                Origen
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Lote</p>
                                    <p className="text-sm font-medium">{netbook.batchId || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Especificaciones</p>
                                    <p className="text-sm font-medium">{netbook.initialModelSpecs || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Datos de Hardware */}
                        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-400">
                                <ShieldCheck className="h-4 w-4" />
                                Auditoría HW
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Auditor</p>
                                    <p className="text-xs font-mono truncate" title={netbook.hwAuditor}>{netbook.hwAuditor || 'Pendiente'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Resultado</p>
                                    <Badge variant={netbook.hwIntegrityPassed ? "success" : "secondary"} className="mt-1">
                                        {netbook.hwIntegrityPassed ? "Aprobado" : "Pendiente/No Aprobado"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Datos de Software */}
                        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                                <Monitor className="h-4 w-4" />
                                Validación SW
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Técnico</p>
                                    <p className="text-xs font-mono truncate" title={netbook.swTechnician}>{netbook.swTechnician || 'Pendiente'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Versión OS</p>
                                    <p className="text-sm font-medium">{netbook.osVersion || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Datos de Destino */}
                        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                                <Truck className="h-4 w-4" />
                                Distribución
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Escuela (Hash)</p>
                                    <p className="text-xs font-mono truncate" title={netbook.destinationSchoolHash}>{netbook.destinationSchoolHash || 'Pendiente'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase">Estudiante (Hash)</p>
                                    <p className="text-xs font-mono truncate" title={netbook.studentIdHash}>{netbook.studentIdHash || 'Pendiente'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Línea de Tiempo / Info Adicional */}
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">Registro de Actividad</span>
                        </div>
                        <p className="text-sm">
                            Última actualización registrada el <span className="font-semibold">{formatDate(netbook.distributionTimestamp)}</span>
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
