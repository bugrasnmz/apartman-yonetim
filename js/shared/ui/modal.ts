/**
 * Modal Management - Shared UI Component
 * Handles modal dialogs throughout the application
 */

interface ModalConfig {
    id: string;
    title?: string;
    content?: string;
    onOpen?: () => void;
    onClose?: () => void;
}

/**
 * Open a modal by ID
 */
export function openModal(modalId: string, config?: Partial<ModalConfig>): void {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.warn(`Modal "${modalId}" not found`);
        return;
    }

    modal.style.display = 'block';
    modal.classList.add('modal-open');
    document.body.classList.add('modal-active');

    // Update title if provided
    if (config?.title) {
        const titleEl = modal.querySelector('.modal-title, h2, h3');
        if (titleEl) {
            titleEl.textContent = config.title;
        }
    }

    // Update content if provided
    if (config?.content) {
        const contentEl = modal.querySelector('.modal-body, .modal-content');
        if (contentEl) {
            contentEl.innerHTML = config.content;
        }
    }

    // Call onOpen callback
    config?.onOpen?.();

    // Focus trap for accessibility
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
    }
}

/**
 * Close a modal by ID
 */
export function closeModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.style.display = 'none';
    modal.classList.remove('modal-open');

    // Check if any other modals are open
    const openModals = document.querySelectorAll('.modal[style*="block"]');
    if (openModals.length === 0) {
        document.body.classList.remove('modal-active');
    }
}

/**
 * Close all open modals
 */
export function closeAllModals(): void {
    document.querySelectorAll('.modal').forEach(modal => {
        (modal as HTMLElement).style.display = 'none';
        modal.classList.remove('modal-open');
    });
    document.body.classList.remove('modal-active');
}

/**
 * Initialize modal close handlers
 * Call this on DOMContentLoaded
 */
export function initModals(): void {
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Close buttons
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = (btn as HTMLElement).closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
}
