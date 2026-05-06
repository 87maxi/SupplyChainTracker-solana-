import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, Monitor, Loader2 } from 'lucide-react'
import { useSupplyChainService } from '@/hooks/useSupplyChainService'
import { useState, useEffect } from 'react'

export function NetbookStats() {
  const { getAllSerialNumbers, getNetbook } = useSupplyChainService()
  const [stats, setStats] = useState<{ total: number; production: number; distribution: number; retail: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const serials = await getAllSerialNumbers();
        
        let production = 0;
        let distribution = 0;
        let retail = 0;

        for (const serial of serials) {
          try {
            const netbook = await getNetbook(serial);
            if (netbook) {
              const state = (netbook as any).currentState || netbook.state;
              switch (state) {
                case 'FABRICADA':
                  production++;
                  break;
                case 'DISTRIBUIDA':
                  distribution++;
                  break;
                case 'SW_VALIDADO':
                  retail++;
                  break;
              }
            }
          } catch {
            // Skip netbooks that can't be loaded
          }
        }

        setStats({ 
          total: serials.length, 
          production, 
          distribution, 
          retail 
        });
      } catch (err) {
        console.error('Error fetching netbook stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [getAllSerialNumbers, getNetbook]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Netbooks</CardTitle>
          <CardDescription>Cargando estadísticas...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Estadísticas de Netbooks</CardTitle>
          <Badge variant="secondary">Total: {stats?.total}</Badge>
        </div>
        <CardDescription>Desglose por estado de los dispositivos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Package className="h-8 w-8 text-blue-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Producción</p>
              <p className="text-sm text-muted-foreground">En fabricación</p>
            </div>
            <div className="text-2xl font-bold">{stats?.production}</div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Truck className="h-8 w-8 text-amber-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Distribución</p>
              <p className="text-sm text-muted-foreground">En tránsito</p>
            </div>
            <div className="text-2xl font-bold">{stats?.distribution}</div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Monitor className="h-8 w-8 text-emerald-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Validación</p>
              <p className="text-sm text-muted-foreground">SW pendiente</p>
            </div>
            <div className="text-2xl font-bold">{stats?.retail}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
