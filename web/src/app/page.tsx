// web/src/app/page.tsx
"use client";

import { useSolanaWeb3 } from '@/hooks/useSolanaWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  ArrowRight,
  Zap,
  Lock,
  BarChart3
} from 'lucide-react';

export default function Home() {
  const { isConnected } = useSolanaWeb3();
  // Initialize mounted directly to avoid hydration mismatch and set-state-in-effect
  // See: https://react.dev/reference/react/useEffect
  const [mounted] = useState(() => typeof window !== 'undefined');

  return (
    <div className="relative isolate overflow-hidden min-h-screen">
      {/* Issue #211: Enhanced background with layered gradients */}
      <div className="fixed inset-0 -z-10 bg-gradient-overlay" />
      <div className="fixed inset-0 -z-10 texture-noise opacity-30" />

      <div className="container mx-auto px-4 py-20 sm:py-28 relative z-10">
        <div className="flex flex-col items-center text-center space-y-10">
          {/* Hero Section */}
          <div className="space-y-6 max-w-4xl animate-fade-in">
            <Badge variant="outline" className="px-4 py-1.5 text-xs font-medium uppercase tracking-widest border-primary/20 text-primary bg-primary/5 shadow-lg shadow-primary/5">
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

          {/* Stats Bar */}
          <div className="grid gap-6 sm:grid-cols-3 mt-16 w-full max-w-3xl animate-slide-up stagger-2">
            <StatItem value="100%" label="Transparencia" icon={ShieldCheck} />
            <StatItem value="Real-time" label="Trazabilidad" icon={History} />
            <StatItem value="Solana" label="Blockchain" icon={Zap} />
          </div>

          {/* Feature Grid - Enhanced with Design System v3 */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-24 w-full">
            <FeatureCard
              icon={Cpu}
              title="Fabricación"
              description="Registro inicial de netbooks con huella digital única en la blockchain."
              color="blue"
              delay={1}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Auditoría HW"
              description="Verificación rigurosa del hardware por auditores certificados."
              color="emerald"
              delay={2}
            />
            <FeatureCard
              icon={Code2}
              title="Validación SW"
              description="Certificación del ecosistema de software instalado y configurado."
              color="purple"
              delay={3}
            />
            <FeatureCard
              icon={GraduationCap}
              title="Distribución"
              description="Asignación transparente a instituciones y estudiantes finales."
              color="amber"
              delay={4}
            />
            <FeatureCard
              icon={Settings2}
              title="Administración"
              description="Control granular de roles y permisos mediante Smart Contracts."
              color="rose"
              delay={5}
            />
            <FeatureCard
              icon={History}
              title="Trazabilidad"
              description="Historial completo y auditable de cada dispositivo en tiempo real."
              color="cyan"
              delay={6}
            />
          </div>

          {/* Security Section */}
          <div className="mt-32 w-full max-w-4xl animate-fade-in">
            <div className="text-center space-y-4 mb-12">
              <Badge variant="outline" className="px-4 py-1.5 text-xs font-medium uppercase tracking-widest border-success/20 text-success bg-success/5">
                Seguridad Avanzada
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Protección de nivel empresarial
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Cada transacción es verificable e inmutable, garantizando la integridad del proceso completo.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <SecurityFeature icon={Lock} title="Cifrado PII" description="Identidades protegidas con hashes SHA-256" />
              <SecurityFeature icon={BarChart3} title="Auditoría" description="Cada acción registrada en-chain" />
              <SecurityFeature icon={Zap} title="Eficiente" description="Bajos costos con Solana" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Issue #211: Enhanced FeatureCard v3 with Design System
function FeatureCard({ icon: Icon, title, description, color, delay }: { icon: React.ElementType, title: string, description: string, color: string, delay: number }) {
  const colorMap: Record<string, { bg: string; text: string; accent: string; watermark: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', accent: 'from-blue-500/20', watermark: 'text-blue-500/5' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', accent: 'from-emerald-500/20', watermark: 'text-emerald-500/5' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', accent: 'from-purple-500/20', watermark: 'text-purple-500/5' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', accent: 'from-amber-500/20', watermark: 'text-amber-500/5' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', accent: 'from-rose-500/20', watermark: 'text-rose-500/5' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', accent: 'from-cyan-500/20', watermark: 'text-cyan-500/5' },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <Card className={cn(
      "group relative overflow-hidden glass-card transition-all duration-500 hover:-translate-y-2 hover-lift texture-noise animate-spring-in",
      `stagger-${delay}`
    )}>
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className={cn("w-full h-full bg-gradient-to-bl to-transparent", colors.accent)} />
      </div>

      {/* Watermark icon */}
      <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
        <Icon className={cn("h-24 w-24", colors.watermark)} />
      </div>

      <CardHeader className="pb-3 relative z-10">
        <div className={cn(
          "p-3 rounded-xl w-fit mb-3 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300",
          colors.bg, colors.text
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-lg font-semibold tracking-tight">{title}</div>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

// Stat Item Component
function StatItem({ value, label, icon: Icon }: { value: string, label: string, icon: React.ElementType }) {
  return (
    <div className="group relative overflow-hidden glass-card rounded-xl p-4 text-center hover-lift transition-all duration-300">
      <div className="flex items-center justify-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <div className="text-2xl font-black tabular-nums text-foreground">{value}</div>
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

// Security Feature Component
function SecurityFeature({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="group relative glass-card rounded-xl p-6 text-center hover-lift transition-all duration-300 texture-noise">
      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
