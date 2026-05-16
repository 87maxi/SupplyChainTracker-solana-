"use client";

import { Badge } from "@/components/ui/badge";
import { NetbookState } from "@/types/supply-chain-types";
import { cn } from "@/lib/utils";
import { Package, ShieldCheck, Code2, Truck } from "lucide-react";

interface StatusBadgeProps {
    status: string | NetbookState;
    className?: string;
}

// Enhanced StatusBadge v3 — Premium design with textures, animations, glow effects, and step indicators
const STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  icon: typeof Package;
  dotColor: string;
  glowColor: string;
  step: number;
  progressBg: string;
}> = {
  FABRICADA: {
    label: 'Fabricada',
    className: 'bg-blue-50/80 text-blue-700 border-blue-200/80 hover:border-blue-300 hover:bg-blue-100/80 backdrop-blur-sm',
    icon: Package,
    dotColor: 'bg-blue-500',
    glowColor: 'shadow-blue-200/50',
    step: 1,
    progressBg: 'bg-blue-500',
  },
  HW_APROBADO: {
    label: 'HW Aprobado',
    className: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-100/80 backdrop-blur-sm',
    icon: ShieldCheck,
    dotColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-200/50',
    step: 2,
    progressBg: 'bg-emerald-500',
  },
  SW_VALIDADO: {
    label: 'SW Validado',
    className: 'bg-purple-50/80 text-purple-700 border-purple-200/80 hover:border-purple-300 hover:bg-purple-100/80 backdrop-blur-sm',
    icon: Code2,
    dotColor: 'bg-purple-500',
    glowColor: 'shadow-purple-200/50',
    step: 3,
    progressBg: 'bg-purple-500',
  },
  DISTRIBUIDA: {
    label: 'Distribuida',
    className: 'bg-amber-50/80 text-amber-700 border-amber-200/80 hover:border-amber-300 hover:bg-amber-100/80 backdrop-blur-sm',
    icon: Truck,
    dotColor: 'bg-amber-500',
    glowColor: 'shadow-amber-200/50',
    step: 4,
    progressBg: 'bg-amber-500',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: 'bg-muted text-muted-foreground border-border hover:border-border/80',
      icon: Package,
      dotColor: 'bg-muted-foreground',
      glowColor: 'shadow-muted/30',
    };

    const Icon = config.icon;

    return (
        <div className="inline-flex flex-col items-start gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border",
              "transition-all duration-500 hover:shadow-lg cursor-default group/badge",
              config.className,
              config.glowColor,
              className
            )}
          >
            {/* Animated pulse dot with glow */}
            <span className={cn(
              "inline-block w-1.5 h-1.5 rounded-full status-pulse",
              config.dotColor
            )} />
            <Icon className="w-3 h-3 flex-shrink-0 group-hover/badge:scale-110 transition-transform" />
            <span className="truncate">{config.label}</span>
            {/* Step indicator */}
            <span className={cn(
              "ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[9px] font-bold",
              config.progressBg,
              "text-white"
            )}>
              {config.step}/4
            </span>
          </Badge>
          {/* Progress bar */}
          <div className="h-0.5 w-full max-w-[120px] bg-muted/50 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-out", config.progressBg)}
              style={{ width: `${(config.step / 4) * 100}%` }}
            />
          </div>
        </div>
    );
}
