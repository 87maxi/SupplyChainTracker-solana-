"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // State for settings
  const [settings, setSettings] = useState({
    enableNotifications: true,
    autoRefresh: true,
    refreshInterval: '30',
    theme: 'light',
    contractAddress: '',
    rpcUrl: ''
  });

  // Carga asincrónica de configuración con manejo de errores
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = localStorage.getItem('admin-settings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          setSettings(prev => ({ ...prev, ...parsedSettings }));
        } else {
          // Solo establecer valores por defecto desde el entorno si no hay configuración guardada
          setSettings(prev => ({
            ...prev,
            contractAddress: process.env.NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS || prev.contractAddress,
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || prev.rpcUrl
          }));
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        // Mantener valores por defecto en caso de error
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('admin-settings', JSON.stringify(settings));
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han aplicado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los ajustes.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Administra las preferencias y configuraciones del panel de administración.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
            <CardDescription>
              Controla cómo recibes notificaciones del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificaciones en tiempo real</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe actualizaciones instantáneas cuando ocurren eventos importantes.
                </p>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, enableNotifications: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-refresh</Label>
                <p className="text-sm text-muted-foreground">
                  Refresca automáticamente los datos del dashboard.
                </p>
              </div>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoRefresh: checked }))
                }
              />
            </div>

            {settings.autoRefresh && (
              <div className="space-y-2">
                <Label>Intervalo de refresco (segundos)</Label>
                <Input
                  type="number"
                  min="10"
                  max="300"
                  value={settings.refreshInterval}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, refreshInterval: e.target.value }))
                  }
                  className="max-w-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>
              Personaliza la interfaz visual del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tema</Label>
              <div className="flex gap-4">
                <Button
                  variant={settings.theme === 'light' ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                  className="gap-2"
                >
                  Claro
                </Button>
                <Button
                  variant={settings.theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                  className="gap-2"
                >
                  Oscuro
                </Button>
                <Button
                  variant={settings.theme === 'system' ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, theme: 'system' }))}
                  className="gap-2"
                >
                  Sistema
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuración de Contrato</CardTitle>
            <CardDescription>
              Ajusta la configuración avanzada del contrato inteligente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Dirección del Contrato</Label>
              <Input
                value={settings.contractAddress}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, contractAddress: e.target.value }))
                }
                placeholder="0x..."
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>URL del RPC</Label>
              <Input
                value={settings.rpcUrl}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, rpcUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}