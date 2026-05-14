/**
 * ConnectionIndicator - Real-time WebSocket connection status badge
 *
 * Issue #211: Frontend Evolution - WebSocket Integration
 *
 * Displays the current connection status to the Solana network
 * with color-coded indicators and animated pulse effects.
 */

'use client';

import { useWebSocketService } from '@/lib/solana/websocket-service';
import { Circle, Wifi, WifiOff } from 'lucide-react';

export function ConnectionIndicator() {
  const { status } = useWebSocketService();

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-emerald-500',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          label: 'Live',
          icon: Wifi,
          pulse: true,
        };
      case 'connecting':
        return {
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          label: 'Connecting...',
          icon: Circle,
          pulse: true,
        };
      case 'error':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Error',
          icon: WifiOff,
          pulse: false,
        };
      case 'disconnected':
      default:
        return {
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-border',
          label: 'Offline',
          icon: WifiOff,
          pulse: false,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-xs font-medium border
        ${config.color} ${config.bgColor} ${config.borderColor}
        transition-all duration-300
      `}
      title={`Solana connection: ${status}`}
    >
      <span className={`relative ${config.pulse ? 'animate-pulse' : ''}`}>
        <Icon className="w-3 h-3" />
      </span>
      <span>{config.label}</span>
    </div>
  );
}
