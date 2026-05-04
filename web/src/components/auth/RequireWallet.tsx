// web/src/components/auth/RequireWallet.tsx
"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWeb3 } from '@/hooks/useWeb3';
import { Loader2 } from 'lucide-react';

interface RequireWalletProps {
    children: React.ReactNode;
}

/**
 * Componente que protege las rutas que requieren conexión de wallet.
 * Si el usuario no está conectado, redirige a la página de inicio.
 */
export const RequireWallet = ({ children }: RequireWalletProps) => {
    const { isConnected } = useWeb3();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    // Rutas públicas que no requieren wallet conectada
    const publicRoutes = ['/'];

    // Sincroniza el estado del componente con el ciclo de vida del navegador
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Solo ejecutar en cliente y después del mount
        if (!mounted) return;

        // Si no está conectado y no es una ruta pública, redirigir
        if (!isConnected && !publicRoutes.includes(pathname)) {
            router.push('/');
        }
    }, [isConnected, pathname, router, mounted]);

    // Durante SSR o antes del mount, mostrar loading
    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Verificando conexión...</p>
            </div>
        );
    }

    // Si no está conectado y no es ruta pública, mostrar loading mientras redirige
    if (!isConnected && !publicRoutes.includes(pathname)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Redirigiendo...</p>
            </div>
        );
    }

    return <>{children}</>;
};
