'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';

export function ReportGenerator() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar Reportes</CardTitle>
        <CardDescription>Exporta datos para análisis detallado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Datos de Usuarios
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Solicitudes de Rol
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Historial de Transacciones
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Estadísticas de Actividad
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}