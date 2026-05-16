'use client';

import { useState } from 'react';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Plus, ShieldCheck, Monitor, UserPlus, Package } from 'lucide-react';
import { NetbookForm } from '@/components/contracts/NetbookForm';
import { HardwareAuditForm } from '@/components/contracts/HardwareAuditForm';
import { SoftwareValidationForm } from '@/components/contracts/SoftwareValidationForm';
import { StudentAssignmentForm } from '@/components/contracts/StudentAssignmentForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Role card configuration with enhanced design tokens
const ROLE_CONFIGS = {
  manufacturer: {
    title: 'Fabricante',
    description: 'Registro inicial de netbooks en la blockchain.',
    action: 'Registrar Netbook',
    icon: Plus,
    color: 'blue',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    hoverBg: 'hover:bg-blue-500/10',
    titleColor: 'text-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    accentGradient: 'from-blue-500/10 to-transparent',
  },
  auditor: {
    title: 'Auditor HW',
    description: 'Verificación y aprobación de integridad física.',
    action: 'Auditar Hardware',
    icon: ShieldCheck,
    color: 'emerald',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    hoverBg: 'hover:bg-emerald-500/10',
    titleColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    accentGradient: 'from-emerald-500/10 to-transparent',
  },
  technician: {
    title: 'Técnico SW',
    description: 'Instalación y validación del sistema operativo.',
    action: 'Validar Software',
    icon: Monitor,
    color: 'purple',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/5',
    hoverBg: 'hover:bg-purple-500/10',
    titleColor: 'text-purple-600',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    buttonBg: 'bg-purple-600 hover:bg-purple-700',
    accentGradient: 'from-purple-500/10 to-transparent',
  },
  school: {
    title: 'Escuela',
    description: 'Asignación final de la netbook al estudiante.',
    action: 'Asignar Estudiante',
    icon: UserPlus,
    color: 'amber',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    hoverBg: 'hover:bg-amber-500/10',
    titleColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    accentGradient: 'from-amber-500/10 to-transparent',
  },
} as const;

// Individual Role Card Component with enhanced design
type RoleConfig = (typeof ROLE_CONFIGS)[keyof typeof ROLE_CONFIGS];
function RoleCard({ config, onAction }: { config: RoleConfig, onAction: () => void }) {
  const Icon = config.icon;

  return (
    <Card className={cn(
      "group relative overflow-hidden glass-card hover-lift texture-noise",
      config.borderColor, config.bgColor, config.hoverBg,
      "transition-all duration-500"
    )}>
      {/* Gradient accent overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        config.accentGradient
      )} />

      {/* Background watermark icon */}
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] group-hover:scale-110 transition-all duration-700">
        <Icon className={cn("h-24 w-24", config.titleColor)} />
      </div>

      {/* Top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left",
        config.titleColor.replace('text-', 'bg-')
      )} />

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 rounded-xl group-hover:scale-110 transition-all duration-500",
              config.iconBg, config.iconColor
            )}>
              <Icon className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-bold">{config.title}</CardTitle>
          </div>
          <span className={cn(
            "inline-block w-1.5 h-1.5 rounded-full status-pulse",
            config.titleColor.replace('text-', 'bg-')
          )} />
        </div>
        <CardDescription className="text-[11px] leading-relaxed pt-1">{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <Button
          onClick={onAction}
          size="sm"
          className={cn(
            "w-full gap-2 group/btn",
            config.buttonBg
          )}
        >
          <Package className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform" />
          {config.action}
        </Button>
      </CardContent>
    </Card>
  );
}

export function RoleActions() {
    const { isManufacturer, isHardwareAuditor, isSoftwareTechnician, isSchool, isAdmin } = useUserRoles();

    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showAuditForm, setShowAuditForm] = useState(false);
    const [showValidationForm, setShowValidationForm] = useState(false);
    const [showAssignmentForm, setShowAssignmentForm] = useState(false);

    // If no relevant roles, return null
    if (!isManufacturer && !isHardwareAuditor && !isSoftwareTechnician && !isSchool && !isAdmin) {
        return null;
    }

    return (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {(isManufacturer || isAdmin) && (
              <>
                <div className="animate-spring-in stagger-1">
                  <RoleCard
                    config={ROLE_CONFIGS.manufacturer}
                    onAction={() => setShowRegisterForm(true)}
                  />
                </div>
                <NetbookForm
                  isOpen={showRegisterForm}
                  onOpenChange={setShowRegisterForm}
                  onComplete={() => window.location.reload()}
                />
              </>
            )}

            {(isHardwareAuditor || isAdmin) && (
              <>
                <div className="animate-spring-in stagger-2">
                  <RoleCard
                    config={ROLE_CONFIGS.auditor}
                    onAction={() => setShowAuditForm(true)}
                  />
                </div>
                <HardwareAuditForm
                  isOpen={showAuditForm}
                  onOpenChange={setShowAuditForm}
                  onComplete={() => window.location.reload()}
                />
              </>
            )}

            {(isSoftwareTechnician || isAdmin) && (
              <>
                <div className="animate-spring-in stagger-3">
                  <RoleCard
                    config={ROLE_CONFIGS.technician}
                    onAction={() => setShowValidationForm(true)}
                  />
                </div>
                <SoftwareValidationForm
                  isOpen={showValidationForm}
                  onOpenChange={setShowValidationForm}
                  onComplete={() => window.location.reload()}
                />
              </>
            )}

            {(isSchool || isAdmin) && (
              <>
                <div className="animate-spring-in stagger-4">
                  <RoleCard
                    config={ROLE_CONFIGS.school}
                    onAction={() => setShowAssignmentForm(true)}
                  />
                </div>
                <StudentAssignmentForm
                  isOpen={showAssignmentForm}
                  onOpenChange={setShowAssignmentForm}
                  onComplete={() => window.location.reload()}
                />
              </>
            )}
        </div>
    );
}
