/**
 * Audit Logger - Önemli işlemleri logla
 * Güvenlik ve debugging için kritik işlemlerin kaydını tutar
 */

import { db, collection, addDoc, getDocs, doc, query, orderBy, limit, where } from '../firebase-config.js';

// Log seviyeleri
export const LOG_LEVELS = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    SECURITY: 'security'
};

// Log kategorileri
export const LOG_CATEGORIES = {
    AUTH: 'auth',           // Giriş/çıkış işlemleri
    DATA: 'data',           // Veri ekleme/güncelleme/silme
    PAYMENT: 'payment',     // Ödeme işlemleri
    SETTINGS: 'settings',   // Ayar değişiklikleri
    SECURITY: 'security',   // Güvenlik olayları
    SYSTEM: 'system'        // Sistem olayları
};

// Firestore collection adı
const AUDIT_COLLECTION = 'audit_logs';

/**
 * Audit log entry oluştur
 * @param {string} action - İşlem adı
 * @param {string} category - Kategori (LOG_CATEGORIES)
 * @param {string} level - Seviye (LOG_LEVELS)
 * @param {Object} details - Ek detaylar
 * @param {string} userId - Kullanıcı ID (opsiyonel)
 */
export async function logAudit(action, category, level = LOG_LEVELS.INFO, details = {}, userId = null) {
    try {
        const logEntry = {
            action,
            category,
            level,
            details: sanitizeDetails(details),
            userId: userId || getCurrentUserId(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            url: window.location.pathname,
            sessionId: getSessionId()
        };

        // Firestore'a kaydet
        await addDoc(collection(db, AUDIT_COLLECTION), logEntry);

        // Console'a da yaz (development için)
        if (process.env?.NODE_ENV !== 'production') {
            console.log(`[AUDIT] ${level.toUpperCase()} - ${category}/${action}`, details);
        }

        return logEntry;
    } catch (error) {
        // Audit logging başarısız olsa bile uygulamayı durdurma
        console.error('Audit log hatası:', error);
        return null;
    }
}

/**
 * Hassas verileri temizle (şifre vs.)
 */
function sanitizeDetails(details) {
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'parola', 'sifre', 'token', 'key', 'secret'];

    for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some(f => key.toLowerCase().includes(f))) {
            sanitized[key] = '[REDACTED]';
        }
    }
    return sanitized;
}

/**
 * Mevcut kullanıcı ID'sini al
 */
function getCurrentUserId() {
    // SessionStorage'dan session bilgisini oku
    try {
        const session = sessionStorage.getItem('apt_resident_session');
        if (session) {
            const parsed = JSON.parse(session);
            return parsed.apartment ? `Daire ${parsed.apartment}` : 'Sakin';
        }
        // Firebase auth kontrolü
        return 'Admin';
    } catch {
        return 'Anonymous';
    }
}

/**
 * Session ID oluştur/al
 */
function getSessionId() {
    let sessionId = sessionStorage.getItem('audit_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('audit_session_id', sessionId);
    }
    return sessionId;
}

// ===== Convenience Functions =====

/**
 * Auth olaylarını logla
 */
export function logAuthEvent(action, success, details = {}) {
    const level = success ? LOG_LEVELS.INFO : LOG_LEVELS.WARNING;
    return logAudit(action, LOG_CATEGORIES.AUTH, level, { success, ...details });
}

/**
 * Veri değişikliklerini logla
 */
export function logDataChange(action, entityType, entityId, changes = {}) {
    return logAudit(action, LOG_CATEGORIES.DATA, LOG_LEVELS.INFO, {
        entityType,
        entityId,
        changes: Object.keys(changes)  // Sadece hangi alanların değiştiğini kaydet
    });
}

/**
 * Ödeme işlemlerini logla
 */
export function logPaymentEvent(action, apartmentNo, month, year, details = {}) {
    return logAudit(action, LOG_CATEGORIES.PAYMENT, LOG_LEVELS.INFO, {
        apartmentNo,
        month,
        year,
        ...details
    });
}

/**
 * Güvenlik olaylarını logla
 */
export function logSecurityEvent(action, details = {}) {
    return logAudit(action, LOG_CATEGORIES.SECURITY, LOG_LEVELS.SECURITY, details);
}

/**
 * Hata olaylarını logla
 */
export function logError(action, error, context = {}) {
    return logAudit(action, LOG_CATEGORIES.SYSTEM, LOG_LEVELS.ERROR, {
        errorMessage: error?.message || String(error),
        errorStack: error?.stack?.substring(0, 500), // Stack trace'in ilk 500 karakteri
        ...context
    });
}

// ===== Admin Functions =====

/**
 * Son audit loglarını getir (admin için)
 * @param {number} count - Kaç log getirilsin
 * @param {string} category - Filtrelenecek kategori (opsiyonel)
 */
export async function getRecentLogs(count = 50, category = null) {
    try {
        let q;
        if (category) {
            q = query(
                collection(db, AUDIT_COLLECTION),
                where('category', '==', category),
                orderBy('timestamp', 'desc'),
                limit(count)
            );
        } else {
            q = query(
                collection(db, AUDIT_COLLECTION),
                orderBy('timestamp', 'desc'),
                limit(count)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Audit log getirme hatası:', error);
        return [];
    }
}

/**
 * Belirli bir kullanıcının loglarını getir
 */
export async function getUserLogs(userId, count = 50) {
    try {
        const q = query(
            collection(db, AUDIT_COLLECTION),
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(count)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Kullanıcı logları getirme hatası:', error);
        return [];
    }
}

// ===== Pre-defined Events =====
export const AUDIT_EVENTS = {
    // Auth events
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILED: 'login_failed',
    LOGOUT: 'logout',
    PASSWORD_CHANGED: 'password_changed',
    PASSWORD_RESET: 'password_reset',

    // Data events
    TRANSACTION_CREATED: 'transaction_created',
    TRANSACTION_UPDATED: 'transaction_updated',
    TRANSACTION_DELETED: 'transaction_deleted',
    BILL_CREATED: 'bill_created',
    BILL_UPDATED: 'bill_updated',
    BILL_DELETED: 'bill_deleted',
    DECISION_CREATED: 'decision_created',
    DECISION_UPDATED: 'decision_updated',
    DECISION_DELETED: 'decision_deleted',
    APARTMENT_UPDATED: 'apartment_updated',

    // Payment events
    DUE_MARKED_PAID: 'due_marked_paid',
    DUE_MARKED_UNPAID: 'due_marked_unpaid',

    // Security events
    FAILED_AUTH_ATTEMPT: 'failed_auth_attempt',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',

    // System events
    APP_INITIALIZED: 'app_initialized',
    DATA_EXPORTED: 'data_exported',
    DATA_IMPORTED: 'data_imported',
    ERROR_OCCURRED: 'error_occurred'
};
