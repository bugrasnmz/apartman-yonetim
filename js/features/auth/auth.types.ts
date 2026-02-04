/**
 * Auth Types - Authentication related type definitions
 */

export type UserRole = 'admin' | 'resident';

export interface AdminUser {
    role: 'admin';
    uid: string;
    email: string | null;
    isVerified?: boolean;
    lastLoginAt?: string;
    lastLoginIp?: string;
}

export interface ResidentUser {
    role: 'resident';
    apartment: number;
    loginAt?: string;
    sessionExpiry?: string;
}

export type CurrentUser = AdminUser | ResidentUser | null;

export interface AuthState {
    currentUser: CurrentUser;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isResident: boolean;
}

/**
 * Login attempt tracking for rate limiting
 */
export interface LoginAttempt {
    count: number;
    lastAttempt: number;
    locked: boolean;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
    id?: string;
    eventType: 'login_attempt' | 'login_success' | 'login_failure' | 'unauthorized_access' | 'data_access' | 'data_modify';
    userId: string;
    timestamp: string;
    userAgent: string;
    ip: string;
    details: Record<string, any>;
}

/**
 * Admin record in Firestore
 */
export interface AdminRecord {
    uid: string;
    email: string;
    role: 'admin';
    createdAt: string;
    createdBy?: string;
    lastLoginAt?: any; // Firestore Timestamp
    lastLoginIp?: string;
    loginCount: number;
    isActive: boolean;
}

/**
 * Firebase Auth Custom Claims
 */
export interface AuthCustomClaims {
    admin?: boolean;
    apartmentNumber?: number;
    role?: UserRole;
}

/**
 * Session configuration
 */
export interface SessionConfig {
    storageKey: string;
    expiryHours: number;
}

/**
 * Password validation rules
 */
export interface PasswordRules {
    minLength: number;
    maxLength: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
}

/**
 * Authentication result
 */
export interface AuthResult {
    success: boolean;
    user?: CurrentUser;
    error?: string;
    errorCode?: string;
    remainingAttempts?: number;
    locked?: boolean;
    lockoutMinutes?: number;
}
