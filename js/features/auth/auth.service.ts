/**
 * Auth Service - Authentication logic for admin and residents
 * Enhanced with security features and audit logging
 */

import { 
    auth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged, 
    APP_CONFIG,
    logSecurityEvent,
    verifyAdminRole,
    getUserClaims,
    db,
    COLLECTIONS
} from '../../firebase-config.js';
import { AppState } from '../../modules/state.js';
import { showPage, showSection } from '../../core/router.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { toastSuccess, toastError } from '../../shared/ui/toast.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import type { AdminUser, ResidentUser, CurrentUser, LoginAttempt } from './auth.types.js';

// Login attempt tracking (client-side only, for UI feedback)
const loginAttempts = new Map<string, LoginAttempt>();

/**
 * Get or initialize login attempt tracking for an identifier
 */
function getLoginAttempt(identifier: string): LoginAttempt {
    if (!loginAttempts.has(identifier)) {
        loginAttempts.set(identifier, {
            count: 0,
            lastAttempt: 0,
            locked: false
        });
    }
    return loginAttempts.get(identifier)!;
}

/**
 * Check if account is locked due to failed attempts
 */
function isAccountLocked(identifier: string): boolean {
    const attempt = getLoginAttempt(identifier);
    if (!attempt.locked) return false;
    
    const lockoutDuration = APP_CONFIG.SECURITY.lockoutDurationMinutes * 60 * 1000;
    const timeSinceLock = Date.now() - attempt.lastAttempt;
    
    if (timeSinceLock > lockoutDuration) {
        // Reset lock after duration
        attempt.locked = false;
        attempt.count = 0;
        return false;
    }
    
    return true;
}

/**
 * Record a failed login attempt
 */
function recordFailedAttempt(identifier: string): void {
    const attempt = getLoginAttempt(identifier);
    attempt.count++;
    attempt.lastAttempt = Date.now();
    
    if (attempt.count >= APP_CONFIG.SECURITY.maxLoginAttempts) {
        attempt.locked = true;
        console.warn(`🔒 Account locked for ${identifier} due to multiple failed attempts`);
    }
}

/**
 * Reset login attempts on successful login
 */
function resetLoginAttempts(identifier: string): void {
    loginAttempts.delete(identifier);
}

/**
 * Auth Service - Handles all authentication operations
 */
export const AuthService = {
    /**
     * Login as admin using Firebase Authentication
     * Enhanced with rate limiting and audit logging
     */
    async loginAdmin(password: string, emailOverride?: string): Promise<boolean> {
        const email = (emailOverride || APP_CONFIG.ADMIN_EMAIL || '').trim().toLowerCase();
        const deviceId = this.getDeviceFingerprint();

        if (!email) {
            toastError('Yönetici e-posta adresi gerekli.');
            return false;
        }
        
        // Check rate limiting
        if (isAccountLocked(email)) {
            const attempt = getLoginAttempt(email);
            const remainingMinutes = Math.ceil(
                (APP_CONFIG.SECURITY.lockoutDurationMinutes * 60 * 1000 - 
                 (Date.now() - attempt.lastAttempt)) / 60000
            );
            toastError(`Çok fazla başarısız giriş denemesi. Lütfen ${remainingMinutes} dakika sonra tekrar deneyin.`);
            return false;
        }

        try {
            // Log attempt
            await logSecurityEvent('login_attempt', {
                email,
                method: 'password',
                deviceId
            });

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Verify admin role in Firestore (additional security layer)
            const isVerifiedAdmin = await verifyAdminRole(user.uid);
            
            // Get custom claims
            const claims = await getUserClaims(user);
            
            // Check if user has admin claim OR is in admins collection
            if (!claims.admin && !isVerifiedAdmin) {
                // Not an admin - sign out immediately
                await signOut(auth);
                
                await logSecurityEvent('unauthorized_access', {
                    email,
                    uid: user.uid,
                    reason: 'User authenticated but not admin'
                }, user.uid);
                
                toastError('Bu hesap yönetici yetkisine sahip değil.');
                recordFailedAttempt(email);
                return false;
            }

            // If verified in Firestore but no claim, update claim locally
            // (In production, this should be done via Firebase Admin SDK on server)
            if (isVerifiedAdmin && !claims.admin) {
                console.warn('Admin verified in Firestore but missing custom claim. Consider updating via Admin SDK.');
            }

            // Success - reset attempts
            resetLoginAttempts(email);

            const adminUser: AdminUser = {
                role: 'admin',
                uid: user.uid,
                email: user.email,
                isVerified: true,
                lastLoginAt: new Date().toISOString()
            };

            AppState.currentUser = adminUser;

            // Update last login in Firestore
            await this.updateAdminLastLogin(user.uid);

            // Log success
            await logSecurityEvent('login_success', {
                email,
                uid: user.uid,
                deviceId
            }, user.uid);

            eventBus.emit(EVENTS.AUTH_LOGIN, adminUser);
            toastSuccess('Hoş geldiniz, Yönetici!');

            return true;
        } catch (error: any) {
            console.error("Login error:", error);
            
            recordFailedAttempt(email);
            const attempt = getLoginAttempt(email);
            const remainingAttempts = APP_CONFIG.SECURITY.maxLoginAttempts - attempt.count;
            
            // Log failure
            await logSecurityEvent('login_failure', {
                email,
                error: error.code,
                deviceId,
                remainingAttempts
            });

            // User-friendly error messages
            let errorMessage = 'Giriş başarısız! Lütfen e-posta ve parolanızı kontrol edin.';
            
            if (error.code === 'auth/wrong-password') {
                errorMessage = `Hatalı şifre. Kalan deneme hakkı: ${remainingAttempts}`;
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Kullanıcı bulunamadı.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.';
            } else if (error.code === 'auth/invalid-credential') {
                errorMessage = `Geçersiz giriş bilgileri. Kalan deneme hakkı: ${remainingAttempts}`;
            }
            
            toastError(errorMessage);
            return false;
        }
    },

    /**
     * Update admin's last login timestamp
     */
    async updateAdminLastLogin(uid: string): Promise<void> {
        try {
            const adminRef = doc(db, COLLECTIONS.ADMINS, uid);
            await setDoc(adminRef, {
                lastLoginAt: serverTimestamp(),
                lastLoginIp: 'client-side', // In production, get from server
                loginCount: increment(1)
            }, { merge: true });
        } catch (e) {
            console.error('Failed to update last login:', e);
        }
    },

    /**
     * Generate a simple device fingerprint for tracking
     */
    getDeviceFingerprint(): string {
        const userAgent = navigator.userAgent;
        const screenRes = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fingerprint = btoa(`${userAgent}-${screenRes}-${timezone}`).slice(0, 32);
        return fingerprint;
    },

    /**
     * Login as resident (client-side authentication)
     * Note: This is a simplified auth for residents
     */
    loginResident(apartmentNumber: number, password?: string): boolean {
        const totalApartments = APP_CONFIG.TOTAL_APARTMENTS;

        if (apartmentNumber < 1 || apartmentNumber > totalApartments) {
            toastError('Geçersiz daire numarası!');
            return false;
        }

        // TODO: Implement password verification for residents
        // For now, using session-based auth as before
        // In production, residents should also use Firebase Auth

        const residentUser: ResidentUser = {
            role: 'resident',
            apartment: apartmentNumber,
            loginAt: new Date().toISOString()
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
    },

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        try {
            const previousUser = AppState.currentUser;
            
            await signOut(auth);
            sessionStorage.removeItem(APP_CONFIG.SESSION_STORAGE_KEY);
            
            AppState.currentUser = null;

            // Log logout
            if (previousUser?.uid) {
                await logSecurityEvent('data_access', {
                    action: 'logout',
                    userRole: previousUser.role
                }, previousUser.uid);
            }

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
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Admin is logged in - verify role
                const claims = await getUserClaims(user);
                const isVerifiedAdmin = await verifyAdminRole(user.uid);
                
                if (claims.admin || isVerifiedAdmin) {
                    const adminUser: AdminUser = {
                        role: 'admin',
                        uid: user.uid,
                        email: user.email,
                        isVerified: true,
                        lastLoginAt: new Date().toISOString()
                    };
                    
                    AppState.currentUser = adminUser;
                    eventBus.emit(EVENTS.AUTH_STATE_CHANGED, adminUser);
                    onAuthenticated?.(adminUser);
                } else {
                    // User authenticated but not admin
                    console.warn('User authenticated but not admin, signing out');
                    await signOut(auth);
                    eventBus.emit(EVENTS.AUTH_STATE_CHANGED, null);
                }
            } else {
                // Check for resident session
                const savedResident = sessionStorage.getItem(APP_CONFIG.SESSION_STORAGE_KEY);
                if (savedResident) {
                    try {
                        const residentData = JSON.parse(savedResident) as ResidentUser;
                        
                        // Check session expiry
                        if (residentData.loginAt) {
                            const loginTime = new Date(residentData.loginAt).getTime();
                            const expiryHours = APP_CONFIG.SESSION_STORAGE_KEY ? 24 : 24; // Default 24h
                            const expiryTime = loginTime + (expiryHours * 60 * 60 * 1000);
                            
                            if (Date.now() > expiryTime) {
                                console.log('Resident session expired');
                                sessionStorage.removeItem(APP_CONFIG.SESSION_STORAGE_KEY);
                                eventBus.emit(EVENTS.AUTH_STATE_CHANGED, null);
                                return;
                            }
                        }
                        
                        AppState.currentUser = residentData;
                        eventBus.emit(EVENTS.AUTH_STATE_CHANGED, residentData);
                        onAuthenticated?.(residentData);
                    } catch {
                        sessionStorage.removeItem(APP_CONFIG.SESSION_STORAGE_KEY);
                        eventBus.emit(EVENTS.AUTH_STATE_CHANGED, null);
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
    },

    /**
     * Require admin access - throws error if not admin
     */
    requireAdmin(): void {
        if (!this.isAdmin()) {
            throw new Error('Admin access required');
        }
    },

    /**
     * Check if user can access apartment data
     */
    canAccessApartment(apartmentNumber: number): boolean {
        if (this.isAdmin()) return true;
        if (this.isResident()) {
            return this.getResidentApartment() === apartmentNumber;
        }
        return false;
    }
};

// Export convenience functions for backward compatibility
export const loginAdmin = AuthService.loginAdmin.bind(AuthService);
export const loginResident = AuthService.loginResident.bind(AuthService);
export const logout = AuthService.logout.bind(AuthService);
export const checkAuth = AuthService.checkAuth.bind(AuthService);

export default AuthService;
