/**
 * Auth Service - Authentication logic for admin and residents
 */

import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, APP_CONFIG } from '../../firebase-config.js';
import { AppState } from '../../modules/state.js';
import { showPage, showSection } from '../../core/router.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { toastSuccess, toastError } from '../../shared/ui/toast.js';
import type { AdminUser, ResidentUser, CurrentUser } from './auth.types.js';

/**
 * Auth Service - Handles all authentication operations
 */
export const AuthService = {
    /**
     * Login as admin using Firebase Authentication
     */
    async loginAdmin(password: string): Promise<boolean> {
        const email = APP_CONFIG.ADMIN_EMAIL;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const adminUser: AdminUser = {
                role: 'admin',
                uid: user.uid,
                email: user.email
            };

            AppState.currentUser = adminUser;

            eventBus.emit(EVENTS.AUTH_LOGIN, adminUser);
            toastSuccess('Hoş geldiniz, Yönetici!');

            return true;
        } catch (error) {
            console.error("Login error:", error);
            toastError('Giriş başarısız! Lütfen e-posta ve parolanızı kontrol edin.');
            return false;
        }
    },

    /**
     * Login as resident (client-side authentication)
     */
    loginResident(apartmentNumber: number): boolean {
        const totalApartments = APP_CONFIG.TOTAL_APARTMENTS;

        if (apartmentNumber >= 1 && apartmentNumber <= totalApartments) {
            const residentUser: ResidentUser = {
                role: 'resident',
                apartment: apartmentNumber
            };

            AppState.currentUser = residentUser;

            // Use sessionStorage for security - data cleared when browser tab closes
            sessionStorage.setItem(
                APP_CONFIG.SESSION_STORAGE_KEY,
                JSON.stringify(residentUser)
            );

            eventBus.emit(EVENTS.AUTH_LOGIN, residentUser);
            toastSuccess(`Hoş geldiniz, Daire ${apartmentNumber}!`);

            return true;
        }

        toastError('Geçersiz daire numarası!');
        return false;
    },

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        try {
            await signOut(auth);
            sessionStorage.removeItem(APP_CONFIG.SESSION_STORAGE_KEY);

            const previousUser = AppState.currentUser;
            AppState.currentUser = null;

            eventBus.emit(EVENTS.AUTH_LOGOUT, previousUser);
            showPage('login-page');
            toastSuccess('Çıkış yapıldı');
        } catch (error) {
            console.error("Logout error", error);
            toastError('Çıkış yapılırken bir hata oluştu.');
        }
    },

    /**
     * Check and restore authentication state
     */
    checkAuth(onAuthenticated?: (user: CurrentUser) => void): void {
        // Listen to Firebase Auth State (for admin)
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Admin is logged in
                const adminUser: AdminUser = {
                    role: 'admin',
                    uid: user.uid,
                    email: user.email
                };
                AppState.currentUser = adminUser;

                eventBus.emit(EVENTS.AUTH_STATE_CHANGED, adminUser);
                onAuthenticated?.(adminUser);
            } else {
                // Check for resident session
                const savedResident = sessionStorage.getItem(APP_CONFIG.SESSION_STORAGE_KEY);
                if (savedResident) {
                    try {
                        const residentData = JSON.parse(savedResident) as ResidentUser;
                        AppState.currentUser = residentData;

                        eventBus.emit(EVENTS.AUTH_STATE_CHANGED, residentData);
                        onAuthenticated?.(residentData);
                    } catch {
                        sessionStorage.removeItem(APP_CONFIG.SESSION_STORAGE_KEY);
                    }
                } else {
                    eventBus.emit(EVENTS.AUTH_STATE_CHANGED, null);
                }
            }
        });
    },

    /**
     * Get current user
     */
    getCurrentUser(): CurrentUser {
        return AppState.currentUser;
    },

    /**
     * Check if user is admin
     */
    isAdmin(): boolean {
        return AppState.currentUser?.role === 'admin';
    },

    /**
     * Check if user is resident
     */
    isResident(): boolean {
        return AppState.currentUser?.role === 'resident';
    },

    /**
     * Get resident apartment number (if resident)
     */
    getResidentApartment(): number | null {
        const user = AppState.currentUser;
        if (user?.role === 'resident') {
            return user.apartment;
        }
        return null;
    }
};

// Export convenience functions for backward compatibility
export const loginAdmin = AuthService.loginAdmin.bind(AuthService);
export const loginResident = AuthService.loginResident.bind(AuthService);
export const logout = AuthService.logout.bind(AuthService);
export const checkAuth = AuthService.checkAuth.bind(AuthService);

export default AuthService;
