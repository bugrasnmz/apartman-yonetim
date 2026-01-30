/**
 * Auth Types - Authentication related type definitions
 */

export type UserRole = 'admin' | 'resident';

export interface AdminUser {
    role: 'admin';
    uid: string;
    email: string | null;
}

export interface ResidentUser {
    role: 'resident';
    apartment: number;
}

export type CurrentUser = AdminUser | ResidentUser | null;

export interface AuthState {
    currentUser: CurrentUser;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isResident: boolean;
}
