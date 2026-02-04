/**
 * Notifications Service Tests
 * Unit tests for GREEN-API WhatsApp integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationsService } from './notifications.service.js';
import { AppState } from '../../modules/state.js';
import { MESSAGE_TEMPLATES, NOTIFICATION_TEMPLATE_LABELS } from './notifications.types.js';

// =========================================
// Mock Setup
// =========================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('../../firebase-config.js', () => ({
  db: {},
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: vi.fn().mockResolvedValue({ id: 'test-doc-id' }),
  setDoc: vi.fn().mockResolvedValue({}),
  doc: vi.fn(),
  serverTimestamp: vi.fn().mockReturnValue('2026-02-04T00:00:00Z'),
  logSecurityEvent: vi.fn()
}));

vi.mock('../../shared/ui/toast.js', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn()
}));

vi.mock('../../core/events.js', () => ({
  eventBus: {
    emit: vi.fn()
  },
  EVENTS: {
    NOTIFICATION_SENT: 'notification:sent'
  }
}));

// =========================================
// Test Suite
// =========================================

describe('NotificationsService', () => {
  beforeEach(() => {
    AppState.apartments = [];
    AppState.dues = {};
    AppState.settings = {
      greenApiIdInstance: '',
      greenApiToken: ''
    };
    AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    
    NotificationsService.history = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================
  // Phone Number Formatting Tests
  // =========================================

  describe('formatPhoneNumber (via sendMessage)', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ idMessage: 'msg-123' })
      });
    });

    it('should format phone with 0 prefix', async () => {
      await NotificationsService.sendMessage(
        '05551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chatId).toBe('905551234567@c.us');
    });

    it('should format phone without prefix', async () => {
      await NotificationsService.sendMessage(
        '5551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chatId).toBe('905551234567@c.us');
    });

    it('should format phone with +90 prefix', async () => {
      await NotificationsService.sendMessage(
        '+905551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chatId).toBe('905551234567@c.us');
    });

    it('should handle phone with spaces and dashes', async () => {
      await NotificationsService.sendMessage(
        '0555 123 45 67',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );
      
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.chatId).toBe('905551234567@c.us');
    });

    it('should reject too short phone numbers', async () => {
      const result = await NotificationsService.sendMessage(
        '123',
        'Test',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('en az 10 haneli');
    });
  });

  // =========================================
  // Send Message Tests
  // =========================================

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ idMessage: 'msg-123456' })
      });

      const result = await NotificationsService.sendMessage(
        '5551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(result.success).toBe(true);
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid phone number' })
      });

      const result = await NotificationsService.sendMessage(
        '5551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
    });

    it('should handle rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit' })
      });

      const result = await NotificationsService.sendMessage(
        '5551234567',
        'Test',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle server error with retry', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ idMessage: '1' }) });

      const result = await NotificationsService.sendMessage(
        '5551234567',
        'Test',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await NotificationsService.sendMessage(
        '5551234567',
        'Test message',
        { idInstance: '123', apiTokenInstance: 'token' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('İnternet bağlantısı');
      expect(result.retryable).toBe(true);
    });
  });

  // =========================================
  // Send Bulk Tests (Optimized)
  // =========================================

  describe('sendBulk', () => {
    const mockConfig = { idInstance: '123', apiTokenInstance: 'token' };
    
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ idMessage: 'msg-123' })
      });
    });

    it('should send to multiple recipients quickly', async () => {
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '5551111111', status: 'pending' },
        { apartmentNo: 2, residentName: 'Mehmet', phoneNumber: '5552222222', status: 'pending' }
      ];

      const result = await NotificationsService.sendBulk(
        recipients,
        'Merhaba {residentName}',
        'general_message',
        mockConfig
      );

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
    }, 10000); // 10 second timeout

    it('should personalize messages with placeholders', async () => {
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '5551111111', status: 'pending' }
      ];

      await NotificationsService.sendBulk(
        recipients,
        'Sayın {residentName}, Daire {apartmentNo}',
        'custom',
        mockConfig
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.message).toBe('Sayın Ahmet, Daire 1');
    }, 10000);

    it('should handle missing phone numbers', async () => {
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '', status: 'pending' },
        { apartmentNo: 2, residentName: 'Mehmet', phoneNumber: '5552222222', status: 'pending' }
      ];

      const result = await NotificationsService.sendBulk(
        recipients,
        'Test message',
        'general_message',
        mockConfig
      );

      // Empty phone counts as failed
      expect(result.successCount + result.failedCount).toBe(2);
      expect(result.recipientCount).toBe(2);
    }, 10000);

    it('should call progress callback', async () => {
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '5551111111', status: 'pending' },
        { apartmentNo: 2, residentName: 'Mehmet', phoneNumber: '5552222222', status: 'pending' }
      ];
      const onProgress = vi.fn();

      await NotificationsService.sendBulk(
        recipients,
        'Test',
        'general_message',
        mockConfig,
        onProgress
      );

      expect(onProgress).toHaveBeenCalled();
    }, 10000);

    it('should show success toast when all successful', async () => {
      const { toastSuccess } = await import('../../shared/ui/toast.js');
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '5551111111', status: 'pending' }
      ];

      await NotificationsService.sendBulk(
        recipients,
        'Test',
        'general_message',
        mockConfig
      );

      expect(toastSuccess).toHaveBeenCalledWith('1 mesaj başarıyla gönderildi');
    }, 10000);

    it('should show error toast when all failed', async () => {
      const { toastError } = await import('../../shared/ui/toast.js');
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const recipients = [
        { apartmentNo: 1, residentName: 'Ahmet', phoneNumber: '5551111111', status: 'pending' }
      ];

      await NotificationsService.sendBulk(
        recipients,
        'Test',
        'general_message',
        mockConfig
      );

      expect(toastError).toHaveBeenCalledWith('Hiçbir mesaj gönderilemedi');
    }, 10000);
  });

  // =========================================
  // Get Recipients Tests
  // =========================================

  describe('getRecipients', () => {
    it('should return recipients with phone numbers', () => {
      AppState.apartments = [
        { number: 1, residentName: 'Ahmet', phone: '5551111111' },
        { number: 2, residentName: 'Mehmet', phone: '5552222222' },
        { number: 3, residentName: 'Ayşe', phone: '' }
      ];

      const recipients = NotificationsService.getRecipients();

      expect(recipients).toHaveLength(2);
    });

    it('should return empty array when no phones', () => {
      AppState.apartments = [
        { number: 1, residentName: 'Ahmet', phone: '' }
      ];
      const recipients = NotificationsService.getRecipients();
      expect(recipients).toEqual([]);
    });
  });

  // =========================================
  // Get Unpaid Dues Recipients Tests (FIXED)
  // =========================================

  describe('getUnpaidDuesRecipients', () => {
    beforeEach(() => {
      AppState.apartments = [
        { number: 1, residentName: 'Ahmet', phone: '5551111111' },
        { number: 2, residentName: 'Mehmet', phone: '5552222222' },
        { number: 3, residentName: 'Ayşe', phone: '5553333333' }
      ];
    });

    it('should return recipients with unpaid dues', () => {
      AppState.dues = {
        2026: {
          1: { 1: true, 2: false, 3: false }  // Apt 1 paid, 2&3 unpaid
        }
      };

      const recipients = NotificationsService.getUnpaidDuesRecipients(2026, 1);

      expect(recipients).toHaveLength(2);
      expect(recipients.map(r => r.apartmentNo)).toContain(2);
      expect(recipients.map(r => r.apartmentNo)).toContain(3);
      expect(recipients.map(r => r.apartmentNo)).not.toContain(1);
    });

    it('should return empty when all dues paid', () => {
      // All apartments paid
      AppState.dues = {
        2026: {
          1: { 
            1: true,  // Ahmet paid
            2: true,  // Mehmet paid
            3: true   // Ayşe paid
          }
        }
      };

      const recipients = NotificationsService.getUnpaidDuesRecipients(2026, 1);

      expect(recipients).toEqual([]);
    });

    it('should return all when no dues data for year', () => {
      // No dues data at all - all considered unpaid
      AppState.dues = {};

      const recipients = NotificationsService.getUnpaidDuesRecipients(2026, 1);

      expect(recipients.length).toBeGreaterThan(0);
    });
  });

  // =========================================
  // Template Tests
  // =========================================

  describe('getTemplate', () => {
    it('should return due reminder template', () => {
      const template = NotificationsService.getTemplate('due_reminder');
      expect(template).toContain('aidat');
    });

    it('should return empty for invalid template', () => {
      const template = NotificationsService.getTemplate('invalid' as any);
      expect(template).toBe('');
    });
  });

  // =========================================
  // Configuration Tests
  // =========================================

  describe('isConfigured', () => {
    it('should return true when both config values set', () => {
      AppState.settings.greenApiIdInstance = '123456';
      AppState.settings.greenApiToken = 'abc123';
      expect(NotificationsService.isConfigured()).toBe(true);
    });

    it('should return false when idInstance missing', () => {
      AppState.settings.greenApiIdInstance = '';
      AppState.settings.greenApiToken = 'abc123';
      expect(NotificationsService.isConfigured()).toBe(false);
    });
  });

  describe('saveConfig', () => {
    it('should save config to AppState and Firestore', async () => {
      const result = await NotificationsService.saveConfig('123456', 'abc123');

      expect(result).toBe(true);
      expect(AppState.settings.greenApiIdInstance).toBe('123456');
    });

    it('should reject empty idInstance', async () => {
      const { toastError } = await import('../../shared/ui/toast.js');
      
      const result = await NotificationsService.saveConfig('', 'abc123');

      expect(result).toBe(false);
      expect(toastError).toHaveBeenCalledWith('Instance ID gerekli');
    });
  });

  // =========================================
  // Test Connection Tests
  // =========================================

  describe('testConnection', () => {
    it('should return true when authorized', async () => {
      const { toastSuccess } = await import('../../shared/ui/toast.js');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stateInstance: 'authorized' })
      });

      const result = await NotificationsService.testConnection({
        idInstance: '123',
        apiTokenInstance: 'token'
      });

      expect(result).toBe(true);
      expect(toastSuccess).toHaveBeenCalledWith('GREEN-API bağlantısı başarılı!');
    });

    it('should return false when not authorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stateInstance: 'notAuthorized' })
      });

      const result = await NotificationsService.testConnection({
        idInstance: '123',
        apiTokenInstance: 'token'
      });

      expect(result).toBe(false);
    });

    it('should return false on 401 unauthorized', async () => {
      const { toastError } = await import('../../shared/ui/toast.js');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({})
      });

      const result = await NotificationsService.testConnection({
        idInstance: '123',
        apiTokenInstance: 'token'
      });

      expect(result).toBe(false);
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Geçersiz API'));
    });
  });
});
