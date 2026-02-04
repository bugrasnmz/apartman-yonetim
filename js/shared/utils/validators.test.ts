/**
 * Validators Tests
 * Unit tests for input validation utilities
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateNumberRange,
  validateDate,
  validateFileType,
  validateFileSize,
  sanitizeHtml,
  sanitize
} from './validators.js';

// =========================================
// Test Suite
// =========================================

describe('Validators', () => {
  // =========================================
  // Email Validation Tests
  // =========================================

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toEqual({ valid: true });
      expect(validateEmail('user.name@domain.co')).toEqual({ valid: true });
      expect(validateEmail('user+tag@example.com')).toEqual({ valid: true });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('E-posta adresi gerekli');
    });

    it('should reject whitespace-only email', () => {
      const result = validateEmail('   ');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('test@').valid).toBe(false);
      expect(validateEmail('test@.com').valid).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateEmail(null as any).valid).toBe(false);
      expect(validateEmail(undefined as any).valid).toBe(false);
    });
  });

  // =========================================
  // Phone Validation Tests
  // =========================================

  describe('validatePhone', () => {
    it('should validate 10-digit mobile numbers starting with 5', () => {
      expect(validatePhone('5551234567')).toEqual({ valid: true });
    });

    it('should validate numbers with country code', () => {
      expect(validatePhone('+905551234567')).toEqual({ valid: true });
      expect(validatePhone('905551234567')).toEqual({ valid: true });
    });

    it('should validate numbers with formatting', () => {
      expect(validatePhone('555 123 45 67')).toEqual({ valid: true });
      expect(validatePhone('(555) 123 45 67')).toEqual({ valid: true });
    });

    it('should reject empty phone', () => {
      const result = validatePhone('');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Telefon numarası gerekli');
    });

    it('should reject too short numbers', () => {
      const result = validatePhone('555');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('10 haneli');
    });

    it('should reject too long numbers', () => {
      const result = validatePhone('5551234567890123');
      expect(result.valid).toBe(false);
    });

    it('should reject numbers not starting with 5', () => {
      const result = validatePhone('1234567890');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('cep telefonu');
    });
  });

  // =========================================
  // Required Field Tests
  // =========================================

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('test', 'Alan')).toEqual({ valid: true });
    });

    it('should validate numbers', () => {
      expect(validateRequired(0, 'Alan')).toEqual({ valid: true });
      expect(validateRequired(123, 'Alan')).toEqual({ valid: true });
    });

    it('should reject empty strings', () => {
      const result = validateRequired('', 'İsim');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('İsim gerekli');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateRequired('   ', 'Açıklama');
      expect(result.valid).toBe(false);
    });

    it('should reject null', () => {
      const result = validateRequired(null, 'Alan');
      expect(result.valid).toBe(false);
    });

    it('should reject undefined', () => {
      const result = validateRequired(undefined, 'Alan');
      expect(result.valid).toBe(false);
    });
  });

  // =========================================
  // Number Range Tests
  // =========================================

  describe('validateNumberRange', () => {
    it('should validate numbers within range', () => {
      expect(validateNumberRange(50, 0, 100)).toEqual({ valid: true });
      expect(validateNumberRange(0, 0, 100)).toEqual({ valid: true });
      expect(validateNumberRange(100, 0, 100)).toEqual({ valid: true });
    });

    it('should reject numbers below minimum', () => {
      const result = validateNumberRange(-5, 0, 100, 'Aidat');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Aidat en az 0 olmalı');
    });

    it('should reject numbers above maximum', () => {
      const result = validateNumberRange(150, 0, 100, 'Aidat');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Aidat en fazla 100 olmalı');
    });

    it('should reject non-numbers', () => {
      const result = validateNumberRange('abc' as any, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('sayı');
    });

    it('should reject NaN', () => {
      const result = validateNumberRange(NaN, 0, 100);
      expect(result.valid).toBe(false);
    });

    it('should work with only min constraint', () => {
      expect(validateNumberRange(10, 5)).toEqual({ valid: true });
      expect(validateNumberRange(3, 5).valid).toBe(false);
    });

    it('should work with only max constraint', () => {
      expect(validateNumberRange(10, undefined, 20)).toEqual({ valid: true });
      expect(validateNumberRange(25, undefined, 20).valid).toBe(false);
    });
  });

  // =========================================
  // Date Validation Tests
  // =========================================

  describe('validateDate', () => {
    it('should validate correct dates', () => {
      expect(validateDate('2026-02-15')).toEqual({ valid: true });
      expect(validateDate('2026-12-31')).toEqual({ valid: true });
    });

    it('should reject empty dates', () => {
      const result = validateDate('', 'Doğum Tarihi');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Doğum Tarihi gerekli');
    });

    it('should reject invalid dates', () => {
      const result = validateDate('invalid-date');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Geçerli');
    });

    it('should use default field name', () => {
      const result = validateDate('');
      expect(result.message).toBe('Tarih gerekli');
    });
  });

  // =========================================
  // File Type Tests
  // =========================================

  describe('validateFileType', () => {
    it('should validate allowed file types', () => {
      const file = { name: 'document.pdf' } as File;
      expect(validateFileType(file, ['pdf', 'doc', 'docx'])).toEqual({ valid: true });
    });

    it('should be case insensitive', () => {
      const file = { name: 'DOCUMENT.PDF' } as File;
      expect(validateFileType(file, ['pdf'])).toEqual({ valid: true });
    });

    it('should reject disallowed file types', () => {
      const file = { name: 'script.exe' } as File;
      const result = validateFileType(file, ['pdf', 'doc']);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('pdf');
      expect(result.message).toContain('doc');
    });

    it('should reject files without extension', () => {
      const file = { name: 'README' } as File;
      const result = validateFileType(file, ['pdf']);
      expect(result.valid).toBe(false);
    });
  });

  // =========================================
  // File Size Tests
  // =========================================

  describe('validateFileSize', () => {
    it('should validate files under max size', () => {
      const file = { size: 1024 * 1024 } as File; // 1 MB
      expect(validateFileSize(file, 5)).toEqual({ valid: true });
    });

    it('should reject files over max size', () => {
      const file = { size: 10 * 1024 * 1024 } as File; // 10 MB
      const result = validateFileSize(file, 5);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('5 MB');
    });

    it('should accept files at exact max size', () => {
      const file = { size: 5 * 1024 * 1024 } as File; // 5 MB
      expect(validateFileSize(file, 5)).toEqual({ valid: true });
    });
  });

  // =========================================
  // Sanitization Tests
  // =========================================

  describe('sanitizeHtml', () => {
    it('should escape HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      expect(sanitizeHtml(input)).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should handle regular text', () => {
      const input = 'Hello World';
      expect(sanitizeHtml(input)).toBe('Hello World');
    });

    it('should handle special characters', () => {
      const input = 'A & B < C > D';
      expect(sanitizeHtml(input)).toBe('A &amp; B &lt; C &gt; D');
    });
  });

  describe('sanitize', () => {
    it('should escape all dangerous characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
      expect(sanitize(input)).toBe(expected);
    });

    it('should escape single quotes', () => {
      const input = "'onclick='alert(1)";
      expect(sanitize(input)).toBe('&#x27;onclick=&#x27;alert(1)');
    });

    it('should handle ampersands', () => {
      const input = 'A & B';
      expect(sanitize(input)).toBe('A &amp; B');
    });

    it('should not modify safe text', () => {
      const input = 'Hello World 123';
      expect(sanitize(input)).toBe('Hello World 123');
    });
  });
});
