// web/src/hooks/use-notifications.ts
"use client";

import { useState, useCallback, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export interface NotificationMethods {
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  notify: NotificationMethods;
}

// Global state for notifications
let memoryNotifications: Notification[] = [];
const listeners = new Set<(notifications: Notification[]) => void>();
const timeoutRefs: Record<string, NodeJS.Timeout> = {};

const emit = () => {
  listeners.forEach((listener) => listener([...memoryNotifications]));
};

// Duración por defecto para cada tipo de notificación
const DEFAULT_DURATIONS = {
  success: 5000,
  error: 7000,
  warning: 6000,
  info: 4000
};

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>(memoryNotifications);

  useEffect(() => {
    listeners.add(setNotifications);
    return () => {
      listeners.delete(setNotifications);
    };
  }, []);

  const removeNotification = useCallback((id: string) => {
    memoryNotifications = memoryNotifications.filter(notif => notif.id !== id);

    // Limpiar timeout si existe
    if (timeoutRefs[id]) {
      clearTimeout(timeoutRefs[id]);
      delete timeoutRefs[id];
    }

    emit();
  }, []);

  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const timestamp = new Date();
    const duration = notification.duration || DEFAULT_DURATIONS[notification.type];

    const newNotification: Notification = {
      ...notification,
      id,
      timestamp
    };

    memoryNotifications = [...memoryNotifications, newNotification];
    emit();

    // Auto-remover notificación después de la duración
    if (duration > 0) {
      timeoutRefs[id] = setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, [removeNotification]);

  const clearNotifications = useCallback(() => {
    memoryNotifications = [];

    // Limpiar todos los timeouts
    Object.values(timeoutRefs).forEach(clearTimeout);
    Object.keys(timeoutRefs).forEach(key => delete timeoutRefs[key]);

    emit();
  }, []);

  // Helper functions para tipos específicos
  const notify = {
    success: (title: string, message: string, duration?: number) =>
      addNotification({ type: 'success', title, message, duration }),

    error: (title: string, message: string, duration?: number) =>
      addNotification({ type: 'error', title, message, duration }),

    warning: (title: string, message: string, duration?: number) =>
      addNotification({ type: 'warning', title, message, duration }),

    info: (title: string, message: string, duration?: number) =>
      addNotification({ type: 'info', title, message, duration })
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    notify
  };
};

// Hook para notificaciones de transacciones
export const useTransactionNotifications = () => {
  const { notify } = useNotifications();

  const transaction = {
    started: (txHash: string, message = 'Transacción enviada') => {
      return notify.info(
        'Transacción en progreso',
        `${message}. Hash: ${txHash.substr(0, 10)}...`,
        0 // No auto-close
      );
    },

    success: (txHash: string, message = 'Transacción exitosa') => {
      return notify.success(
        '¡Éxito!',
        `${message}. Hash: ${txHash.substr(0, 10)}...`
      );
    },

    error: (error: unknown, message = 'Error en transacción') => {
      const errorMessage = error.message || error.toString();
      return notify.error(
        'Error',
        `${message}: ${errorMessage}`
      );
    },

    rejected: (message = 'Transacción rechazada') => {
      return notify.warning(
        'Transacción cancelada',
        message
      );
    }
  };

  return { transaction };
};