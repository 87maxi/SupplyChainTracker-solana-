"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Factory, ShieldCheck, Gavel } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AnalyticsChart } from './components/AnalyticsChart';
import { DateRangeSelector } from './components/DateRangeSelector';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';

/**
 * Página de Analytics & Reporting para administradores
 * 
 * Muestra métricas de roles, gráficos de participación
 * y herramientas para análisis de la red de participantes.
 */
export default function AnalyticsPage() {
  const { address, isConnected, connectWallet } = useWeb3();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const { toast } = useToast();
  const { data, stats, isLoading: analyticsLoading, error } = useAnalyticsData();

  const loading = rolesLoading || analyticsLoading;

  // No need for manual admin check - useUserRoles already handles this

  // Renderizado según estado
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <h3 className="text-xl font-medium text-foreground mb-2">Acceso Restringido</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Por favor, conecta tu wallet para acceder al panel de análisis.
            </p>
            <Button 
              size="lg" 
              onClick={() => connectWallet()} 
              className="h-12 px-8"
            >
              Conectar Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-lg text-muted-foreground">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="h-12 w-12 text-red-500/50 mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-red-500 mb-2">Acceso Denegado</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              No tienes permisos de administrador para acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Renderizado principal
  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Analytics & Reporting</h1>
          <p className="text-muted-foreground">Visualiza el estado del sistema y el crecimiento de la red de participantes.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium">Administrador Conectado</span>
        </div>
      </div>

      {/* Selectores de rango de fechas */}
      <DateRangeSelector />

      {/* Metrics Overview */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Todos los usuarios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Netbooks</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalNetbooks || 0}</div>
            <p className="text-xs text-muted-foreground">Dispositivos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.usersByRole.ADMIN_ROLE || 0}</div>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats?.usersByRole || {}).length}</div>
            <p className="text-xs text-muted-foreground">Roles activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de análisis general */}
      <AnalyticsChart data={data} />

    </div>
  );
}
