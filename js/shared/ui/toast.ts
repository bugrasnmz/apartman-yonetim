/**
 * Toast Notifications - Shared UI Component
 * Provides user feedback through toast messages
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
    message: string;
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        callback: () => void;
    };
}

/**
 * Show a toast notification
 */
export function showToast(options: ToastOptions): void {
    const {
        message,
        type = 'info',
        duration = 3000,
        action
    } = options;

    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    // Icon based on type
    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Build toast content
    let content = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    if (action) {
        content += `<button class="toast-action">${action.label}</button>`;
    }

    content += `<button class="toast-close" aria-label="Kapat">×</button>`;

    toast.innerHTML = content;
    document.body.appendChild(toast);

    // Bind action button
    if (action) {
        const actionBtn = toast.querySelector('.toast-action');
        actionBtn?.addEventListener('click', () => {
            action.callback();
            toast.remove();
        });
    }

    // Bind close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => toast.remove());

    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Trigger entrance animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });
}

// Convenience functions
export const toastSuccess = (message: string, duration?: number) =>
    showToast({ message, type: 'success', duration });

export const toastError = (message: string, duration?: number) =>
    showToast({ message, type: 'error', duration: duration ?? 5000 });

export const toastWarning = (message: string, duration?: number) =>
    showToast({ message, type: 'warning', duration });

export const toastInfo = (message: string, duration?: number) =>
    showToast({ message, type: 'info', duration });
