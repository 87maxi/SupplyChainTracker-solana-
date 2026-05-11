/**
 * Solana Event Listener with Real-time Updates
 * Uses connection.onLogs() for real-time transaction monitoring
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { connection } from './connection';
import { PROGRAM_ID } from '@/lib/contracts/solana-program';
import { PublicKey, Logs } from '@solana/web3.js';

// ==================== Types ====================

export interface SolanaEvent {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
  type: 'success' | 'error' | 'pending';
}

export type EventCallback = (event: SolanaEvent) => void;

// ==================== Event Listener Class ====================

export class SolanaEventListener {
  private static instance: SolanaEventListener | null = null;
  private callbacks: Set<EventCallback> = new Set();
  private subscriptionId: number | null = null;
  private isSubscribed: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  private constructor() {}

  /** Get singleton instance */
  static getInstance(): SolanaEventListener {
    if (!SolanaEventListener.instance) {
      SolanaEventListener.instance = new SolanaEventListener();
    }
    return SolanaEventListener.instance;
  }

  /** Start listening for program events */
  async start(): Promise<boolean> {
    if (this.isSubscribed) {
      console.log('⚠️ Already subscribed to program events');
      return true;
    }

    try {
      const programPubkey = new PublicKey(PROGRAM_ID);
      
      this.subscriptionId = connection.onLogs(
        programPubkey,
        (logs: Logs) => this.handleLogs(logs),
        'confirmed'
      );

      this.isSubscribed = true;
      this.reconnectAttempts = 0;
      
      console.log('✅ Subscribed to Solana program events');
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to program events:', error);
      this.scheduleReconnect();
      return false;
    }
  }

  /** Stop listening for events */
  async stop(): Promise<void> {
    if (this.subscriptionId !== null) {
      try {
        await connection.removeOnLogsListener(this.subscriptionId);
        console.log('🛑 Unsubscribed from program events');
      } catch (error) {
        console.error('Error removing subscription:', error);
      }
      this.subscriptionId = null;
      this.isSubscribed = false;
    }
  }

  /** Register event callback */
  onEvent(callback: EventCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Remove specific callback */
  offEvent(callback: EventCallback): void {
    this.callbacks.delete(callback);
  }

  /** Clear all callbacks */
  clearCallbacks(): void {
    this.callbacks.clear();
  }

  /** Check if currently subscribed */
  isConnected(): boolean {
    return this.isSubscribed;
  }

  // ==================== Private Methods ====================

  private handleLogs(logs: Logs): void {
    // The Logs type from @solana/web3.js has signature, err, logs, slot, blockTime
    // Using type assertion for compatibility
    const logsData = logs as unknown as {
      signature: string;
      slot: number;
      blockTime: number | null;
      err: unknown;
    };
    
    const event: SolanaEvent = {
      signature: logsData.signature,
      slot: logsData.slot,
      blockTime: logsData.blockTime,
      err: logsData.err,
      type: logsData.err ? 'error' : 'success',
    };

    // Notify all callbacks
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
         
        console.error('Error in event callback:', error);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️ Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
     
     
    setTimeout(async () => {
      await this.start();
    }, delay);
  }
}

// ==================== React Hook ====================

/**
 * Hook for subscribing to Solana program events in real-time
 * 
 * @example
 * ```tsx
 * const { events, isConnected, subscribe, unsubscribe } = useSolanaEvents();
 * 
 * useEffect(() => {
 *   subscribe();
 *   return () => unsubscribe();
 * }, []);
 * ```
 */
export function useSolanaEvents() {
  const [events, setEvents] = useState<SolanaEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const listenerRef = useRef<SolanaEventListener | null>(null);

  const subscribe = useCallback(() => {
    const listener = SolanaEventListener.getInstance();
    listenerRef.current = listener;

    const unsub = listener.onEvent((event) => {
      setEvents(prev => [event, ...prev.slice(0, 99)]);
    });

    listener.start().then((success) => {
      setIsConnected(success);
    });

    return unsub;
  }, []);

  const unsubscribe = useCallback(() => {
    const listener = listenerRef.current;
    if (listener) {
      listener.stop();
      listener.clearCallbacks();
      setIsConnected(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    events,
    isConnected,
    subscribe,
    unsubscribe,
    clearEvents: () => setEvents([]),
  };
}
