'use client';

type EventCallback<T = unknown> = (data?: T) => void;

export interface EventMap {
    ROLE_UPDATED: { action: string; address?: string; role?: string };
    REQUESTS_UPDATED: void;
    REFRESH_DATA: void;
}

export type EventName = keyof EventMap;

class EventBus {
    private listeners: Record<string, Set<EventCallback>> = {};

    on(event: EventName | string, callback: EventCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback);
        return () => this.off(event, callback);
    }

    off(event: EventName | string, callback: EventCallback) {
        if (this.listeners[event]) {
            this.listeners[event].delete(callback);
        }
    }

    emit<T = unknown>(event: EventName | string, data?: T) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }
}

export const eventBus = new EventBus();

export const EVENTS = {
    ROLE_UPDATED: 'ROLE_UPDATED',
    REQUESTS_UPDATED: 'REQUESTS_UPDATED',
};
