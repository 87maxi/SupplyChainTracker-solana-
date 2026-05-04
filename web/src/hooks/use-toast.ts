"use client";

import { useState, useEffect, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
}

// Global state for toasts
let memoryToasts: Toast[] = [];
const listeners = new Set<(toasts: Toast[]) => void>();

const emit = () => {
  console.log(`[useToast] Emitting to ${listeners.size} listeners. Current toasts:`, memoryToasts.length);
  listeners.forEach((listener) => listener([...memoryToasts]));
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useEffect(() => {
    console.log("[useToast] Listener added");
    listeners.add(setToasts);
    return () => {
      console.log("[useToast] Listener removed");
      listeners.delete(setToasts);
    };
  }, []);

  const toast = useCallback((props: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    console.log(`[useToast] Adding toast: ${props.title || 'No Title'} (ID: ${id})`);
    memoryToasts = [...memoryToasts, { ...props, id }];
    emit();

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      console.log(`[useToast] Auto-dismissing toast: ${id}`);
      memoryToasts = memoryToasts.filter((t) => t.id !== id);
      emit();
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    console.log(`[useToast] Manually dismissing toast: ${id}`);
    memoryToasts = memoryToasts.filter((t) => t.id !== id);
    emit();
  }, []);

  return {
    toasts,
    toast,
    dismiss,
  };
}