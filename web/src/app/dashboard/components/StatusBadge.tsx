"use client";

import { Badge } from "@/components/ui/badge";
import { NetbookState } from "@/types/supply-chain-types";
import { cn } from "@/lib/utils";
import { Package, ShieldCheck, Code2, Truck } from "lucide-react";

interface StatusBadgeProps {
    status: string | NetbookState;
    className?: string;
}

// Issue #211: Enhanced StatusBadge with warm technical design
const STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  icon: typeof Package;
  dotColor: string;
}> = {
  FABRICADA: {
    label: 'Fabricada',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Package,
    dotColor: 'bg-blue-500',
  },
  HW_APROBADO: {
    label: 'HW Aprobado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
    dotColor: 'bg-emerald-500',
  },
  SW_VALIDADO: {
    label: 'SW Validado',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: Code2,
    dotColor: 'bg-purple-500',
  },
  DISTRIBUIDA: {
    label: 'Distribuida',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Truck,
    dotColor: 'bg-amber-500',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || {
      label: status,
      className: 'bg-muted text-muted-foreground border-border',
      icon: Package,
      dotColor: 'bg-muted-foreground',
    };

    const Icon = config.icon;

    return (
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border",
            config.className,
            className
          )}
        >
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", config.dotColor)} />
          <Icon className="w-3 h-3" />
          {config.label}
        </Badge>
    );
}
