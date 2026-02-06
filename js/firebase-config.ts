import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, query, orderBy, limit, where, serverTimestamp } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";

// Import centralized config
import { CONFIG, TOTAL_APARTMENTS, MONTHS, MONTHS_SHORT, CATEGORY_LABELS, STATUS_LABELS, PRIORITY_LABELS } from './app.config.js';

// =========================================
// Firebase Configuration - Environment Variables
// =========================================
// NOTE: In production, these values should be set in your hosting platform
// Firebase config is safe to expose client-side, but we use env vars for flexibility

const getFirebaseConfig = () => {
    // GitHub Pages build ortamında .env değişkenleri gelmeyebildiği için
    // production fallback değerleri eklenmiştir.
    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBxn6PXq7CjQGklvI8prNMIJiai2t5916w',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'apartman-yonetim-18730.firebaseapp.com',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'apartman-yonetim-18730',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'apartman-yonetim-18730.firebasestorage.app',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '894085676637',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:894085676637:web:c869c1f38f7e720c8a17b4',
    };

    // Validate config
    const missingKeys = Object.entries(config)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingKeys.length > 0) {
        console.error('❌ Missing Firebase configuration:', missingKeys.join(', '));
        console.error('Please ensure .env.local file exists with all required VITE_FIREBASE_* variables');
        throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
    }

    // Fallback kullanıldığında uyarı ver
    const hasEnvConfig = Boolean(
        import.meta.env.VITE_FIREBASE_API_KEY &&
        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_STORAGE_BUCKET &&
        import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
        import.meta.env.VITE_FIREBASE_APP_ID
    );

    if (!hasEnvConfig) {
        console.warn('⚠️ Firebase config fallback değerleri kullanılıyor (.env değişkenleri eksik).');
    }

    return config;
};

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Security: Enable App Check in production
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// if (import.meta.env.PROD) {
//     initializeAppCheck(app, {
//         provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
//         isTokenAutoRefreshEnabled: true
//     });
// }

// Collection References
const COLLECTIONS = {
    APARTMENTS: 'apartments',
    TRANSACTIONS: 'transactions',
    BILLS: 'bills',
    DECISIONS: 'decisions',
    MAINTENANCE: 'maintenance',
    TASKS: 'tasks',
    DUES: 'dues',
    SETTINGS: 'settings',
    DOCUMENTS: 'documents',
    ADMINS: 'admins',           // Admin users collection
    AUDIT_LOGS: 'audit_logs'    // Security audit logs
} as const;

// App Configuration - Environment variables first, fallback to config
const APP_CONFIG = {
    ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL || 'dogaaptyonetim@gmail.com',
    TOTAL_APARTMENTS: CONFIG.apartment.totalUnits,
    SESSION_STORAGE_KEY: CONFIG.session.storageKey,
    // Security flags
    SECURITY: {
        enableAuditLogs: true,
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 30,
    }
} as const;

// =========================================
// Security Helpers
// =========================================

/**
 * Log security event for audit
 */
async function logSecurityEvent(
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'unauthorized_access' | 'data_access',
    details: Record<string, any>,
    userId?: string
): Promise<void> {
    if (!APP_CONFIG.SECURITY.enableAuditLogs) return;

    try {
        await addDoc(collection(db, COLLECTIONS.AUDIT_LOGS), {
            eventType,
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: 'client-side', // Server-side functions would log real IP
            details
        });
    } catch (e) {
        console.error('Failed to log security event:', e);
    }
}

/**
 * Check if user has admin role (verified against Firestore)
 */
async function verifyAdminRole(uid: string): Promise<boolean> {
    try {
        const adminDoc = await getDoc(doc(db, COLLECTIONS.ADMINS, uid));
        return adminDoc.exists() && adminDoc.data()?.role === 'admin';
    } catch (e) {
        console.error('Error verifying admin role:', e);
        return false;
    }
}

/**
 * Get auth token result with claims
 */
async function getUserClaims(user: any): Promise<{ admin?: boolean; [key: string]: any }> {
    if (!user) return {};
    try {
        const tokenResult = await user.getIdTokenResult(true);
        return tokenResult.claims;
    } catch (e) {
        console.error('Error getting user claims:', e);
        return {};
    }
}

export {
    app, db, auth, storage,
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
    query, orderBy, limit, where, serverTimestamp,
    signInWithEmailAndPassword, signOut, onAuthStateChanged,
    // Storage exports
    ref, uploadBytes, getDownloadURL, deleteObject, listAll,
    // Security exports
    logSecurityEvent, verifyAdminRole, getUserClaims,
    COLLECTIONS,
    APP_CONFIG,
    // Re-export from app.config.js for convenience
    CONFIG,
    TOTAL_APARTMENTS,
    MONTHS,
    MONTHS_SHORT,
    CATEGORY_LABELS,
    STATUS_LABELS,
    PRIORITY_LABELS
};
