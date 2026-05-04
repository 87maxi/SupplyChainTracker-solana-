'use client';

type EventCallback = (data?: unknown) => void;

class EventBus {
    private listeners: Record<string, Set<EventCallback>> = {};

    on(event: string, callback: EventCallback) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        this.listeners[event].add(callback);
        return () => this.off(event, callback);
    }

    off(event: string, callback: EventCallback) {
        if (this.listeners[event]) {
            this.listeners[event].delete(callback);
        }
    }

    emit(event: string, data?: unknown) {
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
