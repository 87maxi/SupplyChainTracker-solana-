/* eslint-disable no-restricted-globals */
/**
 * Solana Event Provider
 *
 * Provides real-time event listening context to the React component tree.
 * Integrates with SolanaEventListener to broadcast events to all consumers.
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { SolanaEventListener, SolanaEvent, useSolanaEvents } from './event-listener';

// ==================== Types ====================

export interface SolanaEventContextType {
  /** List of recent events */
  events: SolanaEvent[];
  /** Whether the event listener is connected */
  isConnected: boolean;
  /** Manually subscribe to events */
  subscribe: () => void;
  /** Manually unsubscribe from events */
  unsubscribe: () => void;
  /** Clear all events */
  clearEvents: () => void;
  /** Whether events are being processed */
  isProcessing: boolean;
}

// ==================== Context ====================

const SolanaEventContext = createContext<SolanaEventContextType | undefined>(undefined);

/**
 * Provider component for Solana events
 * 
 * @example
 * ```tsx
 * <SolanaEventProvider>
 *   <App />
 * </SolanaEventProvider>
 * ```
 */
export function SolanaEventProvider({ children }: { children: ReactNode }) {
  const { events, isConnected, subscribe, unsubscribe, clearEvents } = useSolanaEvents();
  const [isProcessing, setIsProcessing] = useState(false);
  const previousEventCount = useRef(0);

  // Track new events and set processing state
  useEffect(() => {
    if (events.length > previousEventCount.current) {
      setIsProcessing(true);
      
      // Clear processing state after a delay
      // eslint-disable-next-line no-restricted-globals
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 3000);
      
      return () => {
        // eslint-disable-next-line no-restricted-globals
        clearTimeout(timer);
      };
    }
    previousEventCount.current = events.length;
  }, [events]);

  // Auto-subscribe on mount
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  const contextValue: SolanaEventContextType = {
    events,
    isConnected,
    subscribe,
    unsubscribe,
    clearEvents,
    isProcessing,
  };

  return (
    <SolanaEventContext.Provider value={contextValue}>
      {children}
    </SolanaEventContext.Provider>
  );
}

// ==================== Hook ====================

/**
 * Hook to access Solana event context
 * 
 * @example
 * ```tsx
 * const { events, isConnected, isProcessing } = useSolanaEventContext();
 * 
 * // React to new events
 * useEffect(() => {
 *   if (events.length > 0) {
 *     console.log('New event:', events[0]);
 *   }
 * }, [events]);
 * ```
 */
export function useSolanaEventContext(): SolanaEventContextType {
  const context = useContext(SolanaEventContext);
  
  if (context === undefined) {
    throw new Error('useSolanaEventContext must be used within a SolanaEventProvider');
  }
  
  return context;
}

// ==================== Event Handlers ====================

/**
 * Hook for handling specific event types
 * 
 * @example
 * ```tsx
 * const handleNetbookRegistered = useSolanaEventHandler('NetbookRegistered', (data) => {
 *   toast.success(`Netbook ${data.serialNumber} registered`);
 * });
 * ```
 */
export function useSolanaEventHandler(
  eventType: string,
  handler: (event: SolanaEvent, data?: any) => void
): () => void {
  const { events } = useSolanaEventContext();
  const handlerRef = useRef(handler);

  // Update handler reference
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Process events
  useEffect(() => {
    for (const event of events) {
      // Check if this is a relevant event based on signature
      if (event.signature) {
        handlerRef.current(event);
      }
    }
  }, [events]);

  // Return cleanup function
  return useCallback(() => {
    // Cleanup if needed
  }, []);
}

/**
 * Hook for handling netbook registration events
 */
export function useOnNetbookRegistered(handler: (serialNumber: string, tokenId: bigint) => void): void {
  const { events } = useSolanaEventContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        // In a full implementation, we would parse the transaction logs
        // to extract the NetbookRegistered event data
        console.log('Netbook registration event detected:', event.signature);
      }
    }
  }, [events]);
}

/**
 * Hook for handling hardware audit events
 */
export function useOnHardwareAudited(handler: (serialNumber: string, passed: boolean) => void): void {
  const { events } = useSolanaEventContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        console.log('Hardware audit event detected:', event.signature);
      }
    }
  }, [events]);
}

/**
 * Hook for handling software validation events
 */
export function useOnSoftwareValidated(handler: (serialNumber: string, passed: boolean) => void): void {
  const { events } = useSolanaEventContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        console.log('Software validation event detected:', event.signature);
      }
    }
  }, [events]);
}

/**
 * Hook for handling role change events
 */
export function useOnRoleChanged(handler: (role: string, account: string, action: 'granted' | 'revoked') => void): void {
  const { events } = useSolanaEventContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    for (const event of events) {
      if (event.type === 'success' && event.signature) {
        console.log('Role change event detected:', event.signature);
      }
    }
  }, [events]);
}

// ==================== Notification Helpers ====================

/**
 * Hook that shows notifications for new events
 */
export function useEventNotifications() {
  const { events, isConnected } = useSolanaEventContext();
  
  const showEventNotification = useCallback((event: SolanaEvent) => {
    // This would integrate with your notification system
    // For now, just log
    if (event.type === 'success') {
      console.log('✅ Transaction successful:', event.signature);
    } else if (event.type === 'error') {
      console.log('❌ Transaction failed:', event.signature);
    }
  }, []);

  useEffect(() => {
    for (const event of events) {
      showEventNotification(event);
    }
  }, [events, showEventNotification]);

  return { isConnected };
}
