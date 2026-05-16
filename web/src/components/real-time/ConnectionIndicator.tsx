/**
 * ConnectionIndicator v3 - Premium real-time WebSocket connection status badge
 *
 * Issue #211: Frontend Evolution - WebSocket Integration
 *
 * Displays the current connection status to the Solana network
 * with color-coded indicators, animated pulse effects, and glass morphism.
 */

'use client';

import { useWebSocketService } from '@/lib/solana/websocket-service';
import { Circle, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Status configuration with enhanced design tokens
const STATUS_CONFIG = {
  connected: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    dotColor: 'bg-emerald-500',
    label: 'Live',
    sublabel: 'WebSocket activo',
    icon: Wifi,
    pulse: true,
  },
  connecting: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
    label: 'Conectando',
    sublabel: 'Estableciendo conexión...',
    icon: Loader2,
    pulse: true,
    spin: true,
  },
  error: {
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    dotColor: 'bg-red-500',
    label: 'Error',
    sublabel: 'Reconectando...',
    icon: WifiOff,
    pulse: false,
  },
  disconnected: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border/50',
    dotColor: 'bg-muted-foreground',
    label: 'Offline',
    sublabel: 'Sin conexión',
    icon: WifiOff,
    pulse: false,
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export function ConnectionIndicator() {
  const { status } = useWebSocketService();
  const config = STATUS_CONFIG[status as StatusKey] || STATUS_CONFIG.disconnected;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl",
        "text-xs font-medium border backdrop-blur-sm",
        config.color, config.bgColor, config.borderColor,
        "transition-all duration-500 hover:shadow-sm hover:scale-105",
        "cursor-default group"
      )}
      title={`Solana connection: ${status}`}
    >
      {/* Animated status dot */}
      <span className="relative">
        <span className={cn(
          "inline-block w-2 h-2 rounded-full",
          config.dotColor,
          config.pulse && "status-pulse"
        )} />
      </span>

      {/* Icon with animation */}
      <Icon className={cn(
        "w-3.5 h-3.5 flex-shrink-0",
        status === 'connecting' && "animate-spin"
      )} />

      {/* Status text */}
      <div className="flex flex-col leading-tight">
        <span className="font-semibold">{config.label}</span>
        <span className={cn(
          "text-[9px] opacity-0 group-hover:opacity-100",
          "transition-opacity duration-300 -mt-0.5",
          "text-muted-foreground"
        )}>
          {config.sublabel}
        </span>
      </div>
    </div>
  );
}
