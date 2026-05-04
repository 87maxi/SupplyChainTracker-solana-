"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShieldCheck, Monitor, Truck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSupplyChainService } from '@/hooks/useSupplyChainService';
import { cn } from '@/lib/utils';

interface NetbookCounts {
    total: number;
    fabricadas: number;
    hwAprobado: number;
    swValidado: number;
    distribuidas: number;
}

const StateCard = ({
    title,
    count,
    icon: Icon,
    color,
    percentage
}: {
    title: string;
    count: number;
    icon: React.ElementType;
    color: string;
    percentage: number;
}) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all">
        <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", color)}>
            <Icon className="h-12 w-12" />
        </div>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{count}</span>
                <span className="text-sm text-muted-foreground">netbooks</span>
            </div>
            <div className="mt-3">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all", color.replace('text-', 'bg-'))}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{percentage.toFixed(0)}% del total</p>
            </div>
        </CardContent>
    </Card>
);

export const NetbookStateMetrics = () => {
    const { getAllSerialNumbers, getNetbookState } = useSupplyChainService();
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<NetbookCounts>(() => {
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem('netbook_metrics_cache');
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    return { total: 0, fabricadas: 0, hwAprobado: 0, swValidado: 0, distribuidas: 0 };
                }
            }
        }
        return { total: 0, fabricadas: 0, hwAprobado: 0, swValidado: 0, distribuidas: 0 };
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Only show loader if we don't have cached data
                if (counts.total === 0) setLoading(true);

                const serials = await getAllSerialNumbers();
                const total = serials.length;

                if (total === 0) {
                    const newCounts = { total: 0, fabricadas: 0, hwAprobado: 0, swValidado: 0, distribuidas: 0 };
                    setCounts(newCounts);
                    localStorage.setItem('netbook_metrics_cache', JSON.stringify(newCounts));
                    return;
                }

                // Contar netbooks por estado en paralelo
                const states = await Promise.all(
                    serials.map(async (serial: string) => {
                        try {
                            const state = await getNetbookState(serial);
                            return Number(state);
                        } catch (e) {
                            console.error(`Error getting state for ${serial}:`, e);
                            return -1;
                        }
                    })
                );

                let fabricadas = 0, hwAprobado = 0, swValidado = 0, distribuidas = 0;
                states.forEach((state: number) => {
                    switch (state) {
                        case 0: fabricadas++; break;
                        case 1: hwAprobado++; break;
                        case 2: swValidado++; break;
                        case 3: distribuidas++; break;
                    }
                });

                const newCounts = { total, fabricadas, hwAprobado, swValidado, distribuidas };
                setCounts(newCounts);
                localStorage.setItem('netbook_metrics_cache', JSON.stringify(newCounts));
            } catch (error) {
                console.error('Error fetching netbook metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

          // Listen for global refresh events
        const unsubscribe = eventBus.on(EVENTS.REFRESH_DATA || 'REFRESH_DATA', () => {
            console.log('[NetbookStateMetrics] Global refresh detected...');
            fetchData();
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">Cargando métricas de netbooks...</span>
                </CardContent>
            </Card>
        );
    }

    const getPercentage = (value: number) => counts.total > 0 ? (value / counts.total) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Estado de Netbooks</h2>
                    <p className="text-muted-foreground">Distribución por etapa del ciclo de vida</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                    <p className="text-3xl font-bold">{counts.total}</p>
                    <p className="text-sm text-muted-foreground">Total registradas</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StateCard
                    title="Fabricadas"
                    count={counts.fabricadas}
                    icon={Package}
                    color="text-blue-500"
                    percentage={getPercentage(counts.fabricadas)}
                />
                <StateCard
                    title="HW Aprobado"
                    count={counts.hwAprobado}
                    icon={ShieldCheck}
                    color="text-emerald-500"
                    percentage={getPercentage(counts.hwAprobado)}
                />
                <StateCard
                    title="SW Validado"
                    count={counts.swValidado}
                    icon={Monitor}
                    color="text-purple-500"
                    percentage={getPercentage(counts.swValidado)}
                />
                <StateCard
                    title="Distribuidas"
                    count={counts.distribuidas}
                    icon={Truck}
                    color="text-amber-500"
                    percentage={getPercentage(counts.distribuidas)}
                />
            </div>
        </div>
    );
};
