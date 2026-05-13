'use client';

type EventCallback<T = unknown> = (data?: T) => void;

interface EventMap {
    ROLE_UPDATED: void;
    REQUESTS_UPDATED: void;
}

class EventBus {
    private listeners: Record<string, Set<EventCallback>> = {};

    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback as EventCallback);
        return () => this.off(event, callback as EventCallback);
    }

    off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>) {
        if (this.listeners[event]) {
            this.listeners[event].delete(callback as EventCallback);
        }
    }

    emit<K extends keyof EventMap>(event: K, data?: EventMap[K]) {
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
