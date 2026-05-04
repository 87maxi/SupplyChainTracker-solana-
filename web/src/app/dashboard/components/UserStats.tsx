import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, ShieldCheck, Loader2 } from 'lucide-react'
import { useUserStats } from '@/hooks/useUserStats'

export function UserStats() {
  const { stats, isLoading } = useUserStats()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas de Usuarios</CardTitle>
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
          <CardTitle>Estadísticas de Usuarios</CardTitle>
          <Badge variant="secondary">Total: {stats?.total}</Badge>
        </div>
        <CardDescription>Desglose por roles del sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Usuarios</p>
              <p className="text-sm text-muted-foreground">Totales registrados</p>
            </div>
            <div className="text-2xl font-bold">{stats?.total}</div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Administradores</p>
              <p className="text-sm text-muted-foreground">Acceso completo</p>
            </div>
            <div className="text-2xl font-bold">{stats?.admin}</div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-800 text-xs font-bold">F</span>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Fabricantes</p>
              <p className="text-sm text-muted-foreground">Producción</p>
            </div>
            <div className="text-2xl font-bold">{stats?.manufacturer}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}