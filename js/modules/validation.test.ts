/**
 * Validation Module Tests
 * Unit tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import { CONFIG } from '../app.config.js';

// =========================================
// Validation Helpers (inline for testing)
// =========================================

const validation = {
  isValidEmail: (email: string): boolean => {
    return CONFIG.validation.email.pattern.test(email);
  },

  isValidPhone: (phone: string): boolean => {
    return CONFIG.validation.phone.pattern.test(phone);
  },

  isValidPassword: (password: string): boolean => {
    const { minLength, maxLength } = CONFIG.validation.password;
    return password.length >= minLength && password.length <= maxLength;
  },

  isValidText: (text: string): boolean => {
    return text.length > 0 && text.length <= CONFIG.validation.text.maxLength;
  },

  isPositiveNumber: (value: number): boolean => {
    return typeof value === 'number' && value >= 0;
  },

  isValidApartmentNumber: (num: number): boolean => {
    return num >= 1 && num <= CONFIG.apartment.totalUnits;
  },

  isValidYear: (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    return year >= CONFIG.date.minYear && year <= currentYear + 5;
  },

  isValidMonth: (month: number): boolean => {
    return month >= 1 && month <= 12;
  }
};

// =========================================
// Test Suite
// =========================================

describe('Validation Module', () => {
  // =========================================
  // Email Validation Tests
  // =========================================

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(validation.isValidEmail('test@example.com')).toBe(true);
      expect(validation.isValidEmail('user.name@domain.co')).toBe(true);
      expect(validation.isValidEmail('user+tag@example.com')).toBe(true);
      expect(validation.isValidEmail('test123@test-domain.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(validation.isValidEmail('')).toBe(false);
      expect(validation.isValidEmail('invalid')).toBe(false);
      expect(validation.isValidEmail('@example.com')).toBe(false);
      expect(validation.isValidEmail('test@')).toBe(false);
    });
  });

  // =========================================
  // Phone Validation Tests
  // =========================================

  describe('isValidPhone', () => {
    it('should return true for valid Turkish phone numbers', () => {
      expect(validation.isValidPhone('+905551234567')).toBe(true);
      expect(validation.isValidPhone('05551234567')).toBe(true);
      expect(validation.isValidPhone('5551234567')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(validation.isValidPhone('')).toBe(false);
      expect(validation.isValidPhone('123')).toBe(false);
      expect(validation.isValidPhone('abc')).toBe(false);
    });
  });

  // =========================================
  // Password Validation Tests
  // =========================================

  describe('isValidPassword', () => {
    it('should return true for valid password lengths', () => {
      expect(validation.isValidPassword('1234')).toBe(true);     // min length
      expect(validation.isValidPassword('12345')).toBe(true);    // > min length
      expect(validation.isValidPassword('a'.repeat(50))).toBe(true); // max length
    });

    it('should return false for too short passwords', () => {
      expect(validation.isValidPassword('')).toBe(false);
      expect(validation.isValidPassword('123')).toBe(false);
      expect(validation.isValidPassword('a')).toBe(false);
    });

    it('should return false for too long passwords', () => {
      expect(validation.isValidPassword('a'.repeat(51))).toBe(false);
      expect(validation.isValidPassword('a'.repeat(100))).toBe(false);
    });
  });

  // =========================================
  // Text Validation Tests
  // =========================================

  describe('isValidText', () => {
    it('should return true for valid text', () => {
      expect(validation.isValidText('Hello')).toBe(true);
      expect(validation.isValidText('a')).toBe(true);
      expect(validation.isValidText(' '.repeat(100))).toBe(true);
    });

    it('should return false for empty text', () => {
      expect(validation.isValidText('')).toBe(false);
    });

    it('should return false for text exceeding max length', () => {
      expect(validation.isValidText('a'.repeat(5001))).toBe(false);
    });
  });

  // =========================================
  // Number Validation Tests
  // =========================================

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(validation.isPositiveNumber(0)).toBe(true);
      expect(validation.isPositiveNumber(1)).toBe(true);
      expect(validation.isPositiveNumber(100.5)).toBe(true);
      expect(validation.isPositiveNumber(999999)).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(validation.isPositiveNumber(-1)).toBe(false);
      expect(validation.isPositiveNumber(-100.5)).toBe(false);
    });

    it('should return false for non-numbers', () => {
      expect(validation.isPositiveNumber('123' as any)).toBe(false);
      expect(validation.isPositiveNumber(null as any)).toBe(false);
      expect(validation.isPositiveNumber(undefined as any)).toBe(false);
      expect(validation.isPositiveNumber(NaN)).toBe(false);
    });
  });

  // =========================================
  // Apartment Number Validation Tests
  // =========================================

  describe('isValidApartmentNumber', () => {
    it('should return true for valid apartment numbers (1-12)', () => {
      expect(validation.isValidApartmentNumber(1)).toBe(true);
      expect(validation.isValidApartmentNumber(6)).toBe(true);
      expect(validation.isValidApartmentNumber(12)).toBe(true);
    });

    it('should return false for invalid apartment numbers', () => {
      expect(validation.isValidApartmentNumber(0)).toBe(false);
      expect(validation.isValidApartmentNumber(13)).toBe(false);
      expect(validation.isValidApartmentNumber(-1)).toBe(false);
      expect(validation.isValidApartmentNumber(100)).toBe(false);
    });
  });

  // =========================================
  // Year Validation Tests
  // =========================================

  describe('isValidYear', () => {
    it('should return true for valid years', () => {
      expect(validation.isValidYear(2020)).toBe(true);
      expect(validation.isValidYear(2026)).toBe(true);
      expect(validation.isValidYear(2031)).toBe(true); // current year + 5
    });

    it('should return false for years before min year', () => {
      expect(validation.isValidYear(2019)).toBe(false);
      expect(validation.isValidYear(2000)).toBe(false);
    });

    it('should return false for years too far in future', () => {
      expect(validation.isValidYear(2032)).toBe(false);
      expect(validation.isValidYear(2050)).toBe(false);
    });
  });

  // =========================================
  // Month Validation Tests
  // =========================================

  describe('isValidMonth', () => {
    it('should return true for valid months (1-12)', () => {
      expect(validation.isValidMonth(1)).toBe(true);
      expect(validation.isValidMonth(6)).toBe(true);
      expect(validation.isValidMonth(12)).toBe(true);
    });

    it('should return false for invalid months', () => {
      expect(validation.isValidMonth(0)).toBe(false);
      expect(validation.isValidMonth(13)).toBe(false);
      expect(validation.isValidMonth(-1)).toBe(false);
    });
  });
});
