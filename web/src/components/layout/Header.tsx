// web/src/components/layout/Header.tsx
"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Navigation } from './Navigation';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RoleRequestModal } from '@/components/contracts/RoleRequestModal';
import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { User, Wallet } from 'lucide-react';
import Link from 'next/link';

export const Header = () => {
  const { activeRoleNames, isLoading: rolesLoading } = useUserRoles();
  const { isConnected } = useWeb3();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
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
              {/* Botón solicitar rol - Solo si no tiene roles */}
              {!rolesLoading && activeRoleNames.length === 0 && (
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => setIsRequestModalOpen(true)}
                  className="hidden sm:flex"
                >
                  <User className="h-4 w-4 mr-1" />
                  Solicitar Rol
                </Button>
              )}

              {/* Badges de roles - Solo en desktop */}
              {!rolesLoading && activeRoleNames.length > 0 && (
                <div className="hidden lg:flex items-center space-x-2">
                  {/* Mostrar solo el rol principal según prioridad */}
                  {(() => {
                    const primaryRole = activeRoleNames.find(r => r === 'DEFAULT_ADMIN_ROLE') ||
                      activeRoleNames.find(r => r === 'FABRICANTE_ROLE') ||
                      activeRoleNames.find(r => r === 'AUDITOR_HW_ROLE') ||
                      activeRoleNames.find(r => r === 'TECNICO_SW_ROLE') ||
                      activeRoleNames.find(r => r === 'ESCUELA_ROLE');

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

          {/* Botón de conexión - Siempre visible */}
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>

      {/* Modal de solicitud de rol */}
      <RoleRequestModal
        isOpen={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
      />
    </header>
  );
};
