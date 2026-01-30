/**
 * Router - SPA routing management
 * Handles page and section navigation
 */

import { eventBus, EVENTS } from './events.js';

export interface RouteConfig {
    pageId: string;
    sectionId?: string;
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
}

interface Router {
    currentPage: string;
    currentSection: string;
    routes: Map<string, RouteConfig>;

    init(): void;
    showPage(pageId: string): void;
    showSection(sectionId: string): void;
    getCurrentRoute(): { page: string; section: string };
}

export const router: Router = {
    currentPage: 'login',
    currentSection: '',
    routes: new Map(),

    /**
     * Initialize router
     */
    init(): void {
        // Could add hash-based routing here if needed
        console.log('[Router] Initialized');
    },

    /**
     * Navigate to a page
     */
    showPage(pageId: string): void {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            (p as HTMLElement).style.display = 'none';
        });

        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            this.currentPage = pageId;

            eventBus.emit(EVENTS.ROUTE_CHANGED, {
                page: pageId,
                previousPage: this.currentPage
            });
        }
    },

    /**
     * Navigate to a section within current page
     */
    showSection(sectionId: string): void {
        // Remove active class from all nav items
        document.querySelectorAll('.sidebar-nav a').forEach(a => {
            a.classList.remove('active');
        });

        // Add active class to clicked nav item
        const activeNav = document.querySelector(`.sidebar-nav a[onclick*="${sectionId}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
        }

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => {
            (s as HTMLElement).style.display = 'none';
        });

        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionId;

            eventBus.emit(EVENTS.SECTION_CHANGED, {
                section: sectionId,
                previousSection: this.currentSection
            });
        }
    },

    /**
     * Get current route info
     */
    getCurrentRoute(): { page: string; section: string } {
        return {
            page: this.currentPage,
            section: this.currentSection
        };
    }
};

// Export convenience functions
export const showPage = (pageId: string) => router.showPage(pageId);
export const showSection = (sectionId: string) => router.showSection(sectionId);
export const getCurrentRoute = () => router.getCurrentRoute();
