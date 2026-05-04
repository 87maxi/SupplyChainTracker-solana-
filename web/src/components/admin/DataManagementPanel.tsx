'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Database, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataManagementPanelProps {
  onRefresh: () => void;
  onExport: (type: 'users' | 'netbooks' | 'all') => void;
  onImport: (type: 'users' | 'netbooks', data: any) => void;
  isLoading?: boolean;
}

export function DataManagementPanel({ 
  onRefresh, 
  onExport, 
  onImport, 
  isLoading = false 
}: DataManagementPanelProps) {
  const { toast } = useToast();
  const [importData, setImportData] = useState<string>('');

  const handleImport = (type: 'users' | 'netbooks') => {
    try {
      const data = JSON.parse(importData);
      onImport(type, data);
      setImportData('');
      toast({
        title: 'Importación exitosa',
        description: `Datos de ${type === 'users' ? 'usuarios' : 'netbooks'} importados correctamente`,
      });
    } catch (error) {
      toast({
        title: 'Error de importación',
        description: 'Formato de datos inválido',
        variant: 'destructive',
      });
    }
  };

  const handleExport = (type: 'users' | 'netbooks' | 'all') => {
    onExport(type);
    toast({
      title: 'Exportación iniciada',
      description: `Exportando datos de ${type === 'all' ? 'todos los registros' : type}`,
    });
  };

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Gestión de Datos
        </CardTitle>
        <CardDescription>
          Herramientas para administrar y mantener los datos del sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="actions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid gap-2">
              <Button 
                onClick={onRefresh} 
                disabled={isLoading}
                variant="outline"
                className="justify-start"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Sincronizar Datos
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleExport('users')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Usuarios
                </Button>
                <Button 
                  onClick={() => handleExport('netbooks')}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Netbooks
                </Button>
              </div>
              
              <Button 
                onClick={() => handleExport('all')}
                variant="outline"
                size="sm"
                className="justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Todo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <div className="space-y-2">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Pega aquí los datos en formato JSON"
                className="w-full h-32 p-2 border rounded-md text-sm font-mono"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => handleImport('users')}
                  disabled={!importData.trim()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Usuarios
                </Button>
                <Button 
                  onClick={() => handleImport('netbooks')}
                  disabled={!importData.trim()}
                  variant="outline"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Netbooks
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}