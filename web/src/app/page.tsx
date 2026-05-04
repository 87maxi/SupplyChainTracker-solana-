// web/src/app/page.tsx
"use client";

import { useWeb3 } from '@/hooks/useWeb3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
  const { isConnected } = useWeb3();
  const [mounted, setMounted] = useState(false);

  // Evitar error de hidratación: solo mostrar contenido dinámico después del mount
  // Precarga el estado de conexión para evitar renderizados innecesarios
  useEffect(() => {
    setMounted(true);
    // Pre-fetch y cache datos iniciales si es necesario
  }, []);

  return (
    <div className="relative isolate overflow-hidden min-h-screen">
      {/* Background Glows - Full screen coverage */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0ea5e9] to-[#8b5cf6] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#8b5cf6] to-[#0ea5e9] opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-24 sm:py-32 relative z-10">
        <div className="flex flex-col items-center text-center space-y-10">
          {/* Hero Section */}
          <div className="space-y-6 max-w-4xl animate-float">
            <Badge variant="outline-glow" className="px-4 py-1.5 text-sm uppercase tracking-widest">
              Web3 Supply Chain Solution
            </Badge>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight">
              Trazabilidad <span className="text-gradient">Inmutable</span> para la Educación
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Garantiza la transparencia y seguridad en la distribución de netbooks educativas utilizando tecnología blockchain de última generación.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {!mounted ? (
              // Placeholder para evitar hydration mismatch
              <div className="h-12 w-48" />
            ) : !isConnected ? (
              <div className="scale-110">
                <ConnectButton />
              </div>
            ) : (
              <Button asChild size="lg" variant="gradient" className="h-12 px-8 text-lg font-semibold">
                <Link href="/dashboard">
                  Ir al Panel <ArrowRight className="ml-2 h-5 w-5" />
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

function FeatureCard({ icon: Icon, title, description, color }: { icon: React.ElementType, title: string, description: string, color: string }) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-500 hover:translate-y-[-8px]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <CardHeader>
        <div className={cn("p-3 rounded-2xl bg-white/5 w-fit mb-4 group-hover:scale-110 transition-transform duration-500", color)}>
          <Icon className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl group-hover:text-primary transition-colors">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}