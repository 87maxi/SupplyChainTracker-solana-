// web/src/app/page.tsx
"use client";

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { useEffect, useState } from 'react';

import {
  ShieldCheck,
  Cpu,
  Code2,
  GraduationCap,
  Settings2,
  History,
  ArrowRight
} from 'lucide-react';

export default function Home() {
  const { isConnected } = useSolanaWeb3();
  // Initialize mounted directly to avoid hydration mismatch and set-state-in-effect
  // See: https://react.dev/reference/react/useEffect
  const [mounted] = useState(() => typeof window !== 'undefined');

  return (
    <div className="relative isolate overflow-hidden min-h-screen">
      {/* Issue #211: Clean background - removed gradient blobs, using subtle overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-overlay" />

      <div className="container mx-auto px-4 py-20 sm:py-28 relative z-10">
        <div className="flex flex-col items-center text-center space-y-10">
          {/* Hero Section */}
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <Badge variant="outline" className="px-4 py-1.5 text-xs font-medium uppercase tracking-widest border-primary/20 text-primary bg-primary/5">
              Web3 Supply Chain Solution
            </Badge>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              Trazabilidad <span className="text-gradient">Inmutable</span>
              <br />para la Educación
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Garantiza la transparencia y seguridad en la distribución de netbooks educativas
              utilizando tecnología blockchain de última generación.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 animate-slide-up">
            {!mounted ? (
              <div className="h-12 w-48" />
            ) : !isConnected ? (
              <WalletConnectButton />
            ) : (
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5">
                <Link href="/dashboard">
                  Ir al Panel <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {/* Feature Grid */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mt-24 w-full">
            <FeatureCard
              icon={Cpu}
              title="Fabricación"
              description="Registro inicial de netbooks con huella digital única en la blockchain."
              color="text-blue-400"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Auditoría HW"
              description="Verificación rigurosa del hardware por auditores certificados."
              color="text-emerald-400"
            />
            <FeatureCard
              icon={Code2}
              title="Validación SW"
              description="Certificación del ecosistema de software instalado y configurado."
              color="text-purple-400"
            />
            <FeatureCard
              icon={GraduationCap}
              title="Distribución"
              description="Asignación transparente a instituciones y estudiantes finales."
              color="text-amber-400"
            />
            <FeatureCard
              icon={Settings2}
              title="Administración"
              description="Control granular de roles y permisos mediante Smart Contracts."
              color="text-rose-400"
            />
            <FeatureCard
              icon={History}
              title="Trazabilidad"
              description="Historial completo y auditable de cada dispositivo en tiempo real."
              color="text-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Issue #211: Warm Technical Feature Card
function FeatureCard({ icon: Icon, title, description, color }: { icon: React.ElementType, title: string, description: string, color: string }) {
  return (
    <Card className="group relative overflow-hidden glass-card transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className={cn(
          "p-3 rounded-xl w-fit mb-3 group-hover:scale-110 transition-all duration-300",
          color.replace('text-', 'bg-').replace('400', '100'),
          color
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}