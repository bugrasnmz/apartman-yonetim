/**
 * Event Bus - Global event system for cross-module communication
 * Allows decoupled communication between features
 */

type EventCallback = (...args: any[]) => void;

interface EventBus {
    events: Map<string, EventCallback[]>;
    on(event: string, callback: EventCallback): void;
    off(event: string, callback: EventCallback): void;
    emit(event: string, ...args: any[]): void;
    once(event: string, callback: EventCallback): void;
}

export const eventBus: EventBus = {
    events: new Map(),

    /**
     * Subscribe to an event
     */
    on(event: string, callback: EventCallback): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    },

    /**
     * Unsubscribe from an event
     */
    off(event: string, callback: EventCallback): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    },

    /**
     * Emit an event with optional arguments
     */
    emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    },

    /**
     * Subscribe to an event only once
     */
    once(event: string, callback: EventCallback): void {
        const onceWrapper = (...args: any[]) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        this.on(event, onceWrapper);
    }
};

// ===== Predefined Event Names =====
export const EVENTS = {
    // Auth events
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    AUTH_STATE_CHANGED: 'auth:stateChanged',

    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_UPDATED: 'data:updated',
    DATA_ERROR: 'data:error',

    // Navigation events
    ROUTE_CHANGED: 'route:changed',
    SECTION_CHANGED: 'section:changed',

    // UI events
    MODAL_OPENED: 'ui:modalOpened',
    MODAL_CLOSED: 'ui:modalClosed',
    TOAST_SHOWN: 'ui:toastShown',

    // Feature-specific events
    TRANSACTION_ADDED: 'transaction:added',
    TRANSACTION_UPDATED: 'transaction:updated',
    TRANSACTION_DELETED: 'transaction:deleted',

    APARTMENT_UPDATED: 'apartment:updated',

    BILL_ADDED: 'bill:added',
    BILL_UPDATED: 'bill:updated',
    BILL_DELETED: 'bill:deleted',

    DUE_TOGGLED: 'due:toggled',

    DOCUMENT_UPLOADED: 'document:uploaded',
    DOCUMENT_DELETED: 'document:deleted',

    NOTIFICATION_SENT: 'notification:sent',
    NOTIFICATION_FAILED: 'notification:failed'
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];
