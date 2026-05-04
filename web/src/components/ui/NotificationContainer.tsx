'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationContainer() {
    const { notifications, removeNotification } = useNotifications();
    const [mounted, setMounted] = useState(false);

    // Sincroniza el estado del componente con el ciclo de vida del navegador
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-md pointer-events-none">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={cn(
                        "pointer-events-auto relative flex w-full items-start gap-4 rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-right-full",
                        notification.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                        notification.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-500",
                        notification.type === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-500",
                        notification.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-500"
                    )}
                >
                    <div className="mt-0.5">
                        {notification.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                        {notification.type === 'error' && <AlertCircle className="h-5 w-5" />}
                        {notification.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
                        {notification.type === 'info' && <Info className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold leading-none">{notification.title}</p>
                        <p className="text-sm opacity-90 leading-relaxed">{notification.message}</p>
                    </div>

                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="absolute top-2 right-2 p-1 rounded-md opacity-50 hover:opacity-100 transition-opacity"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
