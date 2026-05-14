/**
 * WebSocketService - Dedicated WebSocket management for Solana RPC subscriptions
 *
 * Issue #211: Frontend Evolution - WebSocket Integration
 *
 * Features:
 * - Account subscriptions via createSolanaRpcSubscriptions (@solana/kit v2)
 * - Transaction confirmation subscriptions
 * - Log subscriptions for program events
 * - Exponential backoff reconnection with jitter
 * - Reactive connection status (connected, connecting, disconnected, error)
 * - Environment detection (local validator vs devnet/mainnet)
 * - React Query integration for cache invalidation
 *
 * Usage:
 *   import { WebSocketService } from '@/lib/solana/websocket-service';
 *   const ws = WebSocketService.getInstance();
 *   ws.onConnectionStatusChange(status => console.log(status));
 *   await ws.connect();
 */

'use client';

import {
  createSolanaRpcSubscriptions,
  address,
  type Address,
} from '@solana/kit';
import { QueryClient } from '@tanstack/react-query';

// ==================== Types ====================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface WebSocketEvent {
  type: 'account_change' | 'transaction' | 'log' | 'connection';
  data: unknown;
  timestamp: number;
}

export type ConnectionStatusCallback = (_status: ConnectionStatus) => void;
export type EventCallback = (_event: WebSocketEvent) => void;

// ==================== Configuration ====================

const DEFAULT_CONFIG = {
  maxReconnectAttempts: 10,
  initialReconnectDelay: 1000, // 1 second
  maxReconnectDelay: 8000, // 8 seconds
  jitterFactor: 0.3, // 30% jitter
  heartbeatInterval: 30_000, // 30 seconds
};

// ==================== WebSocket Service Class ====================

export class WebSocketService {
  private static instance: WebSocketService | null = null;

  private rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions> | null = null;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private statusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private abortController: AbortController | null = null;
  private queryClient: QueryClient | null = null;
  private rpcUrl: string;
  private programAddress: Address | null = null;

  private constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || '';
    this.rpcUrl = this.detectWebSocketEndpoint(rpcUrl);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Set the QueryClient for cache invalidation
   */
  setQueryClient(client: QueryClient): void {
    this.queryClient = client;
  }

  /**
   * Set the program address for subscriptions
   */
  setProgramAddress(addr: string): void {
    try {
      this.programAddress = address(addr);
    } catch {
      console.warn('[WebSocketService] Invalid program address:', addr);
    }
  }

  /**
   * Detect WebSocket endpoint from HTTP RPC URL
   * Converts http(s):// to ws(s)://
   */
  private detectWebSocketEndpoint(rpcUrl: string): string {
    if (!rpcUrl) {
      // Default to local validator
      return 'ws://localhost:8899';
    }

    // Convert http to ws
    if (rpcUrl.startsWith('https://')) {
      return rpcUrl.replace('https://', 'wss://');
    }
    if (rpcUrl.startsWith('http://')) {
      return rpcUrl.replace('http://', 'ws://');
    }

    // Already a WebSocket URL
    return rpcUrl;
  }

  /**
   * Calculate reconnect delay with exponential backoff and jitter
   */
  private calculateReconnectDelay(): number {
    const exponentialDelay = Math.min(
      DEFAULT_CONFIG.initialReconnectDelay * Math.pow(2, this.reconnectAttempts),
      DEFAULT_CONFIG.maxReconnectDelay
    );
    const jitter = exponentialDelay * DEFAULT_CONFIG.jitterFactor * (Math.random() - 0.5) * 2;
    return Math.max(100, Math.round(exponentialDelay + jitter));
  }

  /**
   * Update connection status and notify callbacks
   */
  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus === status) return;
    this.connectionStatus = status;
    console.log(`[WebSocketService] Status: ${status}`);

    this.statusCallbacks.forEach(cb => cb(status));

    // Broadcast connection event
    this.broadcastEvent({
      type: 'connection',
      data: { status },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast event to all registered callbacks
   */
  private broadcastEvent(event: WebSocketEvent): void {
    this.eventCallbacks.forEach(cb => {
      try {
        cb(event);
      } catch (error) {
        console.error('[WebSocketService] Error in event callback:', error);
      }
    });
  }

  /**
   * Invalidate React Query caches based on event type
   */
  private invalidateQueryCache(eventType: string): void {
    if (!this.queryClient) return;

    switch (eventType) {
      case 'account_change':
        this.queryClient.invalidateQueries({ queryKey: ['netbooks'] });
        this.queryClient.invalidateQueries({ queryKey: ['config'] });
        this.queryClient.invalidateQueries({ queryKey: ['roles'] });
        break;
      case 'transaction':
        this.queryClient.invalidateQueries({ queryKey: ['transactions'] });
        break;
      case 'log':
        this.queryClient.invalidateQueries({ queryKey: ['events'] });
        break;
    }
  }

  /**
   * Start heartbeat to detect stale connections
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setTimeout(() => {
      this.startHeartbeat();
    }, DEFAULT_CONFIG.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= DEFAULT_CONFIG.maxReconnectAttempts) {
      console.error('[WebSocketService] Max reconnect attempts reached');
      this.setStatus('error');
      return;
    }

    const delay = this.calculateReconnectDelay();
    this.reconnectAttempts++;

    console.log(
      `[WebSocketService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${DEFAULT_CONFIG.maxReconnectAttempts})`
    );

    this.setStatus('connecting');
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[WebSocketService] Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Connect to Solana RPC WebSocket and set up subscriptions
   */
  async connect(): Promise<void> {
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      // Abort any existing connection
      this.abortController?.abort();
      this.abortController = new AbortController();

      // Create WebSocket subscription client
      this.rpcSubscriptions = createSolanaRpcSubscriptions(this.rpcUrl);

      // Set up log subscriptions for program events
      await this.setupLogSubscription();

      // Set up account subscriptions if program address is configured
      if (this.programAddress) {
        await this.setupAccountSubscription();
      }

      // Reset reconnect counter on successful connection
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startHeartbeat();
    } catch (error) {
      console.error('[WebSocketService] Connection failed:', error);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Set up log subscription for program events
   */
  private async setupLogSubscription(): Promise<void> {
    if (!this.rpcSubscriptions || !this.abortController) return;

    try {
      // Use logsNotifications for program log events
      const logsNotifications = await this.rpcSubscriptions
        .logsNotifications({
          mentions: [this.programAddress ?? address('11111111111111111111111111111111')],
        })
        .subscribe({ abortSignal: this.abortController.signal });

      for await (const logNotification of logsNotifications) {
        this.broadcastEvent({
          type: 'log',
          data: logNotification.value,
          timestamp: Date.now(),
        });
        this.invalidateQueryCache('log');
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        // Clean abort - don't log as error
        return;
      }
      console.error('[WebSocketService] Log subscription error:', error);
      throw error;
    }
  }

  /**
   * Set up account subscription for program accounts
   */
  private async setupAccountSubscription(): Promise<void> {
    if (!this.rpcSubscriptions || !this.abortController || !this.programAddress) return;

    try {
      const accountNotifications = await this.rpcSubscriptions
        .accountNotifications(this.programAddress, { commitment: 'confirmed' })
        .subscribe({ abortSignal: this.abortController.signal });

      for await (const notification of accountNotifications) {
        this.broadcastEvent({
          type: 'account_change',
          data: {
            account: notification.context.slot,
            lamports: notification.value.lamports.toString(),
          },
          timestamp: Date.now(),
        });
        this.invalidateQueryCache('account_change');
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        return;
      }
      console.error('[WebSocketService] Account subscription error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket and clean up subscriptions
   */
  async disconnect(): Promise<void> {
    console.log('[WebSocketService] Disconnecting...');

    // Abort all subscriptions
    this.abortController?.abort();
    this.abortController = null;

    // Clear timers
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.rpcSubscriptions = null;
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  /**
   * Register a connection status callback
   * Returns an unsubscribe function
   */
  onConnectionStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);

    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Register an event callback
   * Returns an unsubscribe function
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected';
  }

  /**
   * Get the WebSocket URL being used
   */
  getWebSocketUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    if (WebSocketService.instance) {
      WebSocketService.instance.disconnect();
      WebSocketService.instance = null;
    }
  }
}

// ==================== React Hook ====================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for WebSocket connection status and events
 */
export function useWebSocketService(): {
  status: ConnectionStatus;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  onEvent: (_callback: EventCallback) => () => void;
} {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const serviceRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    serviceRef.current = WebSocketService.getInstance();

    const unsubscribe = serviceRef.current.onConnectionStatusChange(newStatus => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async () => {
    await serviceRef.current?.connect();
  }, []);

  const disconnect = useCallback(async () => {
    await serviceRef.current?.disconnect();
  }, []);

  const onEvent = useCallback((cb: EventCallback) => {
    return serviceRef.current?.onEvent(cb) ?? (() => {});
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    onEvent,
  };
}
