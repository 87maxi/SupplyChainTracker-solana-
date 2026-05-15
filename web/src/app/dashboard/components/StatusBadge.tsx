"use client";

import { Badge } from "@/components/ui/badge";
import { NetbookState } from "@/types/supply-chain-types";
import { cn } from "@/lib/utils";
import { Package, ShieldCheck, Code2, Truck } from "lucide-react";

interface StatusBadgeProps {
    status: string | NetbookState;
    className?: string;
}

// Enhanced StatusBadge with textures, animations, and visual effects
const STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  icon: typeof Package;
  dotColor: string;
  glowColor: string;
}> = {
  FABRICADA: {
    label: 'Fabricada',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300 hover:bg-blue-100/80',
    icon: Package,
    dotColor: 'bg-blue-500',
    glowColor: 'shadow-blue-200/50',
  },
  HW_APROBADO: {
    label: 'HW Aprobado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-100/80',
    icon: ShieldCheck,
    dotColor: 'bg-emerald-500',
    glowColor: 'shadow-emerald-200/50',
  },
  SW_VALIDADO: {
    label: 'SW Validado',
    className: 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300 hover:bg-purple-100/80',
    icon: Code2,
    dotColor: 'bg-purple-500',
    glowColor: 'shadow-purple-200/50',
  },
  DISTRIBUIDA: {
    label: 'Distribuida',
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-100/80',
    icon: Truck,
    dotColor: 'bg-amber-500',
    glowColor: 'shadow-amber-200/50',
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
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border",
            "transition-all duration-300 hover:shadow-md cursor-default",
            config.className,
            config.glowColor,
            className
          )}
        >
          {/* Animated pulse dot */}
          <span className={cn(
            "inline-block w-1.5 h-1.5 rounded-full status-pulse",
            config.dotColor
          )} />
          <Icon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{config.label}</span>
        </Badge>
    );
}
