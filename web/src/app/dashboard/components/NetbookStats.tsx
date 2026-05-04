import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Truck, Monitor, Loader2 } from 'lucide-react'
import { useNetbookStats } from '@/hooks/useNetbookStats'

export function NetbookStats() {
  const { stats, isLoading } = useNetbookStats()

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
              <p className="text-sm font-medium leading-none">Venta</p>
              <p className="text-sm text-muted-foreground">En tiendas</p>
            </div>
            <div className="text-2xl font-bold">{stats?.retail}</div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Vendidos</p>
              <p className="text-sm text-muted-foreground">Entregados</p>
            </div>
            <div className="text-2xl font-bold">{stats?.sold}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}