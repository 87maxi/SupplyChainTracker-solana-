/**
 * SolanaActivityFeed - Real-time blockchain activity feed
 *
 * Issue #211: Frontend Evolution - Real-time Solana Network Activity
 *
 * Displays a live feed of recent blockchain transactions and events
 * with color-coded status indicators and animated entries.
 * Integrates with WebSocketService for real-time updates.
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSolanaEventContext } from '@/lib/solana/event-provider';
import { useWebSocketService } from '@/lib/solana/websocket-service';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

// ==================== Types ====================

interface ActivityEntry {
  id: string;
  type: 'transaction' | 'account_change' | 'connection' | 'error';
  status: 'success' | 'pending' | 'error' | 'info';
  message: string;
  signature?: string;
  timestamp: number;
  computeUnits?: number;
}

// ==================== Helpers ====================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatSignature(signature: string): string {
  if (signature.length <= 12) return signature;
  return `${signature.slice(0, 6)}...${signature.slice(-4)}`;
}

function getStatusIcon(status: ActivityEntry['status']) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'pending':
      return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'info':
      return <Clock className="w-3.5 h-3.5 text-blue-500" />;
  }
}

function getStatusBadge(status: ActivityEntry['status']) {
  const variants: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return variants[status] || variants.info;
}

// ==================== Activity Entry Component ====================

function ActivityEntryItem({ entry, index }: { entry: ActivityEntry; index: number }) {
  return (
    <div
      className={`
        flex items-start gap-3 px-3 py-2.5 rounded-lg
        hover:bg-muted/30 transition-all duration-200
        animate-slide-up stagger-${(index % 5) + 1}
        border-b border-border/30 last:border-0
      `}
    >
      {/* Status Icon */}
      <div className="mt-0.5 flex-shrink-0">
        {getStatusIcon(entry.status)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-foreground truncate">{entry.message}</p>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${getStatusBadge(entry.status)}`}
          >
            {entry.status}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {entry.signature && (
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatSignature(entry.signature)}
            </span>
          )}
          {entry.computeUnits && (
            <span className="text-[11px] text-muted-foreground">
              {entry.computeUnits.toLocaleString()} CUs
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== Stats Bar Component ====================

function ActivityStats({ entries }: { entries: ActivityEntry[] }) {
  const successCount = entries.filter(e => e.status === 'success').length;
  const errorCount = entries.filter(e => e.status === 'error').length;
  const pendingCount = entries.filter(e => e.status === 'pending').length;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-600">{successCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-medium text-amber-600">{pendingCount}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <XCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-xs font-medium text-red-600">{errorCount}</span>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{entries.length} total</span>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

interface SolanaActivityFeedProps {
  maxEntries?: number;
  autoScroll?: boolean;
  compact?: boolean;
}

export function SolanaActivityFeed({
  maxEntries = 20,
  autoScroll = true,
  compact = false,
}: SolanaActivityFeedProps) {
  const { events } = useSolanaEventContext();
  const { status: wsStatus } = useWebSocketService();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isVisible, setIsVisible] = useState(!compact);
  const entriesRef = useRef<HTMLDivElement>(null);

  // Process blockchain events into activity entries (memoized)
  const entries: ActivityEntry[] = useMemo(() => {
    if (events.length === 0) return [];

    const processed = events.map((event, idx) => {
      // Use blockTime (from SolanaEvent) or a stable fallback based on slot+idx
      const eventTime = event.blockTime ? event.blockTime * 1000 : 0;
      const baseEntry = {
        id: `evt-${event.slot}-${idx}`,
        timestamp: eventTime,
        signature: event.signature,
      };

      switch (event.type) {
        case 'success':
          return {
            ...baseEntry,
            type: 'transaction' as const,
            status: 'success' as const,
            message: `Transacción confirmada (slot #${event.slot})`,
          };
        case 'error':
          return {
            ...baseEntry,
            type: 'transaction' as const,
            status: 'error' as const,
            message: `Error en transacción (slot #${event.slot})`,
          };
        case 'pending':
          return {
            ...baseEntry,
            type: 'transaction' as const,
            status: 'pending' as const,
            message: `Transacción pendiente (slot #${event.slot})`,
          };
        default:
          return {
            ...baseEntry,
            type: 'account_change' as const,
            status: 'info' as const,
            message: `Actualización detectada (slot #${event.slot})`,
          };
      }
    });

    return processed.slice(0, maxEntries);
  }, [events, maxEntries]);

  // Auto-scroll to latest entries
  useEffect(() => {
    if (autoScroll && entriesRef.current) {
      entriesRef.current.scrollTop = 0;
    }
  }, [entries.length, autoScroll]);

  const visibleEntries = isExpanded ? entries : entries.slice(0, 3);

  return (
    <>
      {/* Floating toggle button when collapsed */}
      {!isVisible && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 animate-scale-in"
          onClick={() => setIsVisible(true)}
        >
          <Activity className="w-4 h-4 mr-2" />
          Actividad ({entries.length})
        </Button>
      )}

      {/* Activity Feed Card */}
      {isVisible && (
        <Card className="glass-card overflow-hidden animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${wsStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'}
                `}>
                  {wsStatus === 'connected' ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Actividad en Red Solana
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {wsStatus === 'connected'
                      ? 'Conexión en tiempo real activa'
                      : `Estado: ${wsStatus}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`
                    text-[10px] px-2 py-0.5
                    ${wsStatus === 'connected'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-muted text-muted-foreground'}
                  `}
                >
                  <span className={`
                    inline-block w-1.5 h-1.5 rounded-full mr-1.5
                    ${wsStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-muted-foreground'}
                  `} />
                  {wsStatus === 'connected' ? 'Live' : wsStatus}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsVisible(false)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Stats Bar */}
            {entries.length > 0 && (
              <div className="mb-3">
                <ActivityStats entries={entries} />
              </div>
            )}

            {/* Activity Entries */}
            <div
              ref={entriesRef}
              className={`
                overflow-y-auto scrollbar-thin
                ${isExpanded ? 'max-h-80' : 'max-h-[180px]'}
              `}
            >
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted/50">
                    <Activity className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Sin actividad reciente
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Las transacciones y eventos aparecerán aquí
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {visibleEntries.map((entry, index) => (
                    <ActivityEntryItem
                      key={entry.id}
                      entry={entry}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
