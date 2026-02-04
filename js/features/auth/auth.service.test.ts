/**
 * Auth Service Tests
 * Unit tests for authentication logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdminUser, ResidentUser } from './auth.types.js';

// =========================================
// Mock Setup
// =========================================

const mockAppState = {
  currentUser: null as AdminUser | ResidentUser | null
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// =========================================
// Simple Auth Service for Testing
// =========================================

const TestAuthService = {
  loginResident(apartmentNumber: number): boolean {
    if (apartmentNumber < 1 || apartmentNumber > 12) {
      return false;
    }

    const residentUser: ResidentUser = {
      role: 'resident',
      apartment: apartmentNumber,
      loginAt: new Date().toISOString()
    };

    mockAppState.currentUser = residentUser;
    mockSessionStorage.setItem('apt_resident_session', JSON.stringify(residentUser));
    return true;
  },

  logout(): void {
    mockAppState.currentUser = null;
    mockSessionStorage.removeItem('apt_resident_session');
  },

  isAdmin(): boolean {
    return mockAppState.currentUser?.role === 'admin';
  },

  isResident(): boolean {
    return mockAppState.currentUser?.role === 'resident';
  },

  getResidentApartment(): number | null {
    const user = mockAppState.currentUser;
    if (user?.role === 'resident') {
      return user.apartment;
    }
    return null;
  },

  canAccessApartment(apartmentNumber: number): boolean {
    if (this.isAdmin()) return true;
    if (this.isResident()) {
      return this.getResidentApartment() === apartmentNumber;
    }
    return false;
  }
};

// =========================================
// Test Suite
// =========================================

describe('AuthService', () => {
  beforeEach(() => {
    mockAppState.currentUser = null;
    vi.clearAllMocks();
  });

  // =========================================
  // Resident Login Tests
  // =========================================

  describe('loginResident', () => {
    it('should successfully login resident with valid apartment number', () => {
      const result = TestAuthService.loginResident(5);

      expect(result).toBe(true);
      expect(mockAppState.currentUser).toEqual({
        role: 'resident',
        apartment: 5,
        loginAt: expect.any(String)
      });
    });

    it('should fail login with invalid apartment number (less than 1)', () => {
      const result = TestAuthService.loginResident(0);

      expect(result).toBe(false);
      expect(mockAppState.currentUser).toBeNull();
    });

    it('should fail login with invalid apartment number (greater than 12)', () => {
      const result = TestAuthService.loginResident(13);

      expect(result).toBe(false);
      expect(mockAppState.currentUser).toBeNull();
    });

    it('should store resident session in sessionStorage', () => {
      TestAuthService.loginResident(7);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'apt_resident_session',
        expect.stringContaining('"apartment":7')
      );
    });
  });

  // =========================================
  // Logout Tests
  // =========================================

  describe('logout', () => {
    it('should successfully logout resident user', () => {
      TestAuthService.loginResident(5);
      
      TestAuthService.logout();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('apt_resident_session');
      expect(mockAppState.currentUser).toBeNull();
    });
  });

  // =========================================
  // Role Check Tests
  // =========================================

  describe('isAdmin', () => {
    it('should return true when current user is admin', () => {
      mockAppState.currentUser = {
        role: 'admin',
        uid: 'admin-123',
        email: 'admin@example.com'
      };

      expect(TestAuthService.isAdmin()).toBe(true);
    });

    it('should return false when current user is resident', () => {
      mockAppState.currentUser = {
        role: 'resident',
        apartment: 5
      };

      expect(TestAuthService.isAdmin()).toBe(false);
    });

    it('should return false when no user is logged in', () => {
      mockAppState.currentUser = null;

      expect(TestAuthService.isAdmin()).toBe(false);
    });
  });

  describe('isResident', () => {
    it('should return true when current user is resident', () => {
      mockAppState.currentUser = {
        role: 'resident',
        apartment: 5
      };

      expect(TestAuthService.isResident()).toBe(true);
    });

    it('should return false when current user is admin', () => {
      mockAppState.currentUser = {
        role: 'admin',
        uid: 'admin-123',
        email: 'admin@example.com'
      };

      expect(TestAuthService.isResident()).toBe(false);
    });
  });

  describe('getResidentApartment', () => {
    it('should return apartment number for resident user', () => {
      mockAppState.currentUser = {
        role: 'resident',
        apartment: 7
      };

      expect(TestAuthService.getResidentApartment()).toBe(7);
    });

    it('should return null for admin user', () => {
      mockAppState.currentUser = {
        role: 'admin',
        uid: 'admin-123',
        email: 'admin@example.com'
      };

      expect(TestAuthService.getResidentApartment()).toBeNull();
    });

    it('should return null when no user is logged in', () => {
      mockAppState.currentUser = null;

      expect(TestAuthService.getResidentApartment()).toBeNull();
    });
  });

  // =========================================
  // Access Control Tests
  // =========================================

  describe('canAccessApartment', () => {
    it('should return true for admin accessing any apartment', () => {
      mockAppState.currentUser = {
        role: 'admin',
        uid: 'admin-123',
        email: 'admin@example.com'
      };

      expect(TestAuthService.canAccessApartment(5)).toBe(true);
      expect(TestAuthService.canAccessApartment(10)).toBe(true);
    });

    it('should return true for resident accessing own apartment', () => {
      mockAppState.currentUser = {
        role: 'resident',
        apartment: 5
      };

      expect(TestAuthService.canAccessApartment(5)).toBe(true);
    });

    it('should return false for resident accessing other apartment', () => {
      mockAppState.currentUser = {
        role: 'resident',
        apartment: 5
      };

      expect(TestAuthService.canAccessApartment(7)).toBe(false);
    });

    it('should return false when no user is logged in', () => {
      mockAppState.currentUser = null;

      expect(TestAuthService.canAccessApartment(5)).toBe(false);
    });
  });
});
