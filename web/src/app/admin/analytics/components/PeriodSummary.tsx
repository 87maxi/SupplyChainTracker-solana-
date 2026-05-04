'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, TrendingUp } from 'lucide-react';

export function PeriodSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del Periodo</CardTitle>
        <CardDescription>Estadísticas para el rango seleccionado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col rounded-lg border p-4">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <ArrowUp className="h-3 w-3 mr-1" />
                +24%
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">semana pasada</span>
            </div>
            <span className="mt-2 text-2xl font-bold">1,234</span>
            <span className="text-sm text-muted-foreground">Usuarios Registrados</span>
          </div>

          <div className="flex flex-col rounded-lg border p-4">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <ArrowUp className="h-3 w-3 mr-1" />
                +15%
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">semana pasada</span>
            </div>
            <span className="mt-2 text-2xl font-bold">567</span>
            <span className="text-sm text-muted-foreground">Solicitudes de Rol</span>
          </div>

          <div className="flex flex-col rounded-lg border p-4">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <ArrowUp className="h-3 w-4 mr-1" />
                +32%
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">mes pasado</span>
            </div>
            <span className="mt-2 text-2xl font-bold">89</span>
            <span className="text-sm text-muted-foreground">Roles Aprobados</span>
          </div>

          <div className="flex flex-col rounded-lg border p-4">
            <div className="flex items-center">
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                -8%
              </Badge>
              <span className="ml-auto text-sm text-muted-foreground">mes pasado</span>
            </div>
            <span className="mt-2 text-2xl font-bold">12</span>
            <span className="text-sm text-muted-foreground">Incidencias</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}