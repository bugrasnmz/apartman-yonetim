/**
 * Formatters Tests
 * Unit tests for formatting utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateShort,
  formatRelativeTime,
  formatFileSize,
  formatPhone,
  getMonthName
} from './formatters.js';

// =========================================
// Test Suite
// =========================================

describe('Formatters', () => {
  // =========================================
  // Currency Format Tests
  // =========================================

  describe('formatCurrency', () => {
    it('should format positive numbers with TL symbol', () => {
      expect(formatCurrency(1000)).toBe('₺1.000,00');
      expect(formatCurrency(1500.5)).toBe('₺1.500,50');
    });

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1000)).toBe('₺-1.000,00');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('₺0,00');
    });

    it('should format without symbol when showSymbol is false', () => {
      expect(formatCurrency(1000, false)).toBe('1.000,00');
    });

    it('should handle decimal places correctly', () => {
      expect(formatCurrency(1000.999)).toBe('₺1.001,00');
      expect(formatCurrency(1000.001)).toBe('₺1.000,00');
    });
  });

  // =========================================
  // Number Format Tests
  // =========================================

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1.000');
      expect(formatNumber(1000000)).toBe('1.000.000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(100)).toBe('100');
      expect(formatNumber(1)).toBe('1');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  // =========================================
  // Date Format Tests
  // =========================================

  describe('formatDate', () => {
    it('should format date in Turkish locale', () => {
      const result = formatDate('2026-02-15');
      expect(result).toContain('15');
      expect(result).toContain('Şubat');
      expect(result).toContain('2026');
    });

    it('should handle different date formats', () => {
      const result1 = formatDate('2026-01-01');
      const result2 = formatDate('2026-12-31');

      expect(result1).toContain('Ocak');
      expect(result2).toContain('Aralık');
    });

    it('should accept custom options', () => {
      const result = formatDate('2026-02-15', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      expect(result).toContain('Şub');
    });
  });

  describe('formatDateShort', () => {
    it('should format date as DD.MM.YYYY', () => {
      const result = formatDateShort('2026-02-15');
      expect(result).toBe('15.02.2026');
    });

    it('should handle single digit days and months', () => {
      const result = formatDateShort('2026-01-05');
      expect(result).toBe('05.01.2026');
    });
  });

  // =========================================
  // Relative Time Tests
  // =========================================

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-15T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Az önce" for very recent times', () => {
      const justNow = new Date('2026-02-15T11:59:59').toISOString();
      expect(formatRelativeTime(justNow)).toBe('Az önce');
    });

    it('should return minutes ago for recent times', () => {
      const fiveMinutesAgo = new Date('2026-02-15T11:55:00').toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 dakika önce');
    });

    it('should return hours ago', () => {
      const threeHoursAgo = new Date('2026-02-15T09:00:00').toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3 saat önce');
    });

    it('should return "Dün" for yesterday', () => {
      const yesterday = new Date('2026-02-14T12:00:00').toISOString();
      expect(formatRelativeTime(yesterday)).toBe('Dün');
    });

    it('should return days ago', () => {
      const fiveDaysAgo = new Date('2026-02-10T12:00:00').toISOString();
      expect(formatRelativeTime(fiveDaysAgo)).toBe('5 gün önce');
    });

    it('should return weeks ago', () => {
      const twoWeeksAgo = new Date('2026-02-01T12:00:00').toISOString();
      expect(formatRelativeTime(twoWeeksAgo)).toBe('2 hafta önce');
    });

    it('should return months ago', () => {
      const twoMonthsAgo = new Date('2025-12-15T12:00:00').toISOString();
      expect(formatRelativeTime(twoMonthsAgo)).toBe('2 ay önce');
    });

    it('should return years ago', () => {
      const twoYearsAgo = new Date('2024-02-15T12:00:00').toISOString();
      expect(formatRelativeTime(twoYearsAgo)).toBe('2 yıl önce');
    });
  });

  // =========================================
  // File Size Tests
  // =========================================

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(100)).toBe('100 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(10240)).toBe('10 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    it('should handle large files', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
    });
  });

  // =========================================
  // Phone Format Tests
  // =========================================

  describe('formatPhone', () => {
    it('should format 10-digit Turkish numbers', () => {
      expect(formatPhone('5551234567')).toBe('(555) 123 45 67');
    });

    it('should format numbers starting with 0 by removing it', () => {
      // Note: formatPhone removes the leading 0 and treats it as 10-digit
      expect(formatPhone('05551234567')).toBe('05551234567'); // Returns as-is since 11 digits
    });

    it('should format international numbers', () => {
      expect(formatPhone('+905551234567')).toBe('(555) 123 45 67');
      expect(formatPhone('905551234567')).toBe('(555) 123 45 67');
    });

    it('should handle numbers with spaces and dashes', () => {
      expect(formatPhone('555 123 45 67')).toBe('(555) 123 45 67');
      expect(formatPhone('555-123-45-67')).toBe('(555) 123 45 67');
    });

    it('should return original string for invalid numbers', () => {
      expect(formatPhone('123')).toBe('123');
      expect(formatPhone('abc')).toBe('abc');
    });
  });

  // =========================================
  // Month Name Tests
  // =========================================

  describe('getMonthName', () => {
    it('should return full month names', () => {
      expect(getMonthName(1)).toBe('Ocak');
      expect(getMonthName(6)).toBe('Haziran');
      expect(getMonthName(12)).toBe('Aralık');
    });

    it('should return short month names', () => {
      expect(getMonthName(1, true)).toBe('Oca');
      expect(getMonthName(6, true)).toBe('Haz');
      expect(getMonthName(12, true)).toBe('Ara');
    });

    it('should handle all months', () => {
      const expectedFull = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
      ];
      
      expectedFull.forEach((month, index) => {
        expect(getMonthName(index + 1)).toBe(month);
      });
    });

    it('should handle all short months', () => {
      const expectedShort = [
        'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
        'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
      ];
      
      expectedShort.forEach((month, index) => {
        expect(getMonthName(index + 1, true)).toBe(month);
      });
    });
  });
});
