// web/src/components/layout/Header.tsx
"use client";

import { Navigation } from './Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { User, Wallet } from 'lucide-react';
import Link from 'next/link';

// Roles constants
const ROLE_NAMES = [
  'DEFAULT_ADMIN_ROLE',
  'FABRICANTE_ROLE',
  'AUDITOR_HW_ROLE',
  'TECNICO_SW_ROLE',
  'ESCUELA_ROLE'
] as const;

type RoleName = typeof ROLE_NAMES[number];

interface HeaderProps {
  activeRoles?: RoleName[];
  isLoadingRoles?: boolean;
  isConnected?: boolean;
}

export const Header = ({ 
  activeRoles = [], 
  isLoadingRoles = false,
  isConnected = false 
}: HeaderProps) => {
  const [mounted, setMounted] = useState(false);

  // Sincroniza el estado del componente con el ciclo de vida del navegador
  useEffect(() => {
    setMounted(true);
  }, []);

  // Función para formatear el nombre del rol para mostrar en la UI
  const formatRoleNameForDisplay = (roleName: string) => {
    if (roleName === "DEFAULT_ADMIN_ROLE") return "Admin";
    return roleName.replace(/_ROLE/g, '').replace(/_/g, ' ').toLowerCase()
      .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Determinar el color del badge según el rol
  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case "DEFAULT_ADMIN_ROLE": return "destructive" as const;
      case "FABRICANTE_ROLE": return "default" as const;
      case "AUDITOR_HW_ROLE": return "success" as const;
      case "TECNICO_SW_ROLE": return "warning" as const;
      case "ESCUELA_ROLE": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Logo - Siempre visible, lleva a inicio */}
          <Link href="/" className="flex items-center space-x-2 group">
            <h1 className="text-2xl font-bold tracking-tighter text-gradient glow-text group-hover:opacity-80 transition-opacity">
              SupplyChainTracker
            </h1>
          </Link>

          {/* Navegación - Solo visible si está conectado y mounting completado */}
          {mounted && isConnected && <Navigation />}
        </div>

        <div className="flex items-center space-x-4">
          {/* Sección de roles y acciones - Solo si está conectado */}
          {mounted && isConnected && (
            <>
              {/* Badges de roles - Solo en desktop */}
              {!isLoadingRoles && activeRoles.length > 0 && (
                <div className="hidden lg:flex items-center space-x-2">
                  {/* Mostrar solo el rol principal según prioridad */}
                  {(() => {
                    const primaryRole = activeRoles.find(r => r === 'DEFAULT_ADMIN_ROLE') ||
                      activeRoles.find(r => r === 'FABRICANTE_ROLE') ||
                      activeRoles.find(r => r === 'AUDITOR_HW_ROLE') ||
                      activeRoles.find(r => r === 'TECNICO_SW_ROLE') ||
                      activeRoles.find(r => r === 'ESCUELA_ROLE');

                    if (!primaryRole) return null;

                    return (
                      <Badge
                        variant={getRoleBadgeVariant(primaryRole)}
                        className="px-2.5 py-1 text-xs gap-1"
                      >
                        <User className="h-3 w-3" />
                        {formatRoleNameForDisplay(primaryRole)}
                      </Badge>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* Indicador de estado de conexión - Solo en mobile cuando no conectado */}
          {mounted && !isConnected && (
            <div className="flex sm:hidden items-center text-xs text-muted-foreground">
              <Wallet className="h-3.5 w-3.5 mr-1" />
              Sin wallet
            </div>
          )}

          {/* Botón de conexión Solana - Solo renderizar después del mount para evitar hydration mismatch */}
          {mounted && (
            <WalletMultiButton className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-lg px-4 py-2 font-medium transition-all duration-200 shadow-lg hover:shadow-xl" />
          )}
        </div>
      </div>
    </header>
  );
};
