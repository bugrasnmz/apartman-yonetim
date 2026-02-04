/**
 * Bills Service Tests
 * Unit tests for bill management operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillsService } from './bills.service.js';
import { AppState } from '../../modules/state.js';
import { createBillFixture } from '../../test/fixtures.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { toastSuccess } from '../../shared/ui/toast.js';
import type { Bill } from './bills.types.js';

// =========================================
// Mock Setup
// =========================================

vi.mock('../../firebase-config.js', () => ({
  COLLECTIONS: { BILLS: 'bills' },
  logSecurityEvent: vi.fn()
}));

vi.mock('../../shared/services/firebase.service.js', () => ({
  FirebaseService: {
    add: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('../../shared/ui/toast.js', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}));

vi.mock('../../core/events.js', () => ({
  eventBus: {
    emit: vi.fn()
  },
  EVENTS: {
    BILL_ADDED: 'bill:added',
    BILL_UPDATED: 'bill:updated',
    BILL_DELETED: 'bill:deleted'
  }
}));

// =========================================
// Test Suite
// =========================================

describe('BillsService', () => {
  beforeEach(() => {
    AppState.bills = [];
    vi.clearAllMocks();
  });

  // =========================================
  // Get By Year Tests
  // =========================================

  describe('getByYear', () => {
    it('should return empty array when no bills for year', () => {
      const bills = BillsService.getByYear(2026);
      expect(bills).toEqual([]);
    });

    it('should return bills filtered by year', () => {
      AppState.bills = [
        createBillFixture({ year: 2026, month: 1, amount: 1000 }),
        createBillFixture({ year: 2026, month: 2, amount: 1500 }),
        createBillFixture({ year: 2025, month: 12, amount: 800 })
      ];

      const bills = BillsService.getByYear(2026);

      expect(bills).toHaveLength(2);
      expect(bills.every(b => b.year === 2026)).toBe(true);
    });

    it('should sort bills by month descending', () => {
      AppState.bills = [
        createBillFixture({ year: 2026, month: 3, amount: 1000 }),
        createBillFixture({ year: 2026, month: 1, amount: 1500 }),
        createBillFixture({ year: 2026, month: 5, amount: 800 })
      ];

      const bills = BillsService.getByYear(2026);

      expect(bills[0].month).toBe(5);
      expect(bills[1].month).toBe(3);
      expect(bills[2].month).toBe(1);
    });
  });

  // =========================================
  // Get All Tests
  // =========================================

  describe('getAll', () => {
    it('should return empty array when no bills exist', () => {
      const bills = BillsService.getAll();
      expect(bills).toEqual([]);
    });

    it('should return all bills sorted by year and month', () => {
      AppState.bills = [
        createBillFixture({ year: 2025, month: 12, amount: 1000 }),
        createBillFixture({ year: 2026, month: 1, amount: 1500 }),
        createBillFixture({ year: 2026, month: 3, amount: 800 }),
        createBillFixture({ year: 2025, month: 10, amount: 1200 })
      ];

      const bills = BillsService.getAll();

      expect(bills).toHaveLength(4);
      expect(bills[0].year).toBe(2026);
      expect(bills[0].month).toBe(3);
      expect(bills[3].year).toBe(2025);
      expect(bills[3].month).toBe(10);
    });

    it('should not mutate original array', () => {
      const original = [createBillFixture({ year: 2026, month: 1 })];
      AppState.bills = original;

      const bills = BillsService.getAll();
      bills.push(createBillFixture({ year: 2026, month: 2 }));

      expect(AppState.bills).toHaveLength(1);
    });
  });

  // =========================================
  // Get By ID Tests
  // =========================================

  describe('getById', () => {
    it('should return bill by ID', () => {
      const bill = createBillFixture({ id: 'bill-test-123' });
      AppState.bills = [bill];

      const found = BillsService.getById('bill-test-123');

      expect(found).toEqual(bill);
    });

    it('should return undefined for non-existent ID', () => {
      const found = BillsService.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  // =========================================
  // Add Bill Tests (Async)
  // =========================================

  describe('add', () => {
    it('should add bill to AppState', async () => {
      const billData = {
        type: 'electric',
        amount: 1000,
        month: 1,
        year: 2026,
        paid: false
      };

      const bill = await BillsService.add(billData);

      expect(AppState.bills).toHaveLength(1);
      expect(AppState.bills[0]).toMatchObject(billData);
    });

    it('should generate unique ID', async () => {
      const billData = { type: 'electric', amount: 1000, month: 1, year: 2026, paid: false };

      const bill1 = await BillsService.add(billData);
      const bill2 = await BillsService.add(billData);

      expect(bill1.id).toBeDefined();
      expect(bill2.id).toBeDefined();
      expect(bill1.id).not.toBe(bill2.id);
    });

    it('should set createdAt timestamp', async () => {
      const before = new Date().toISOString();
      
      const bill = await BillsService.add({
        type: 'electric',
        amount: 1000,
        month: 1,
        year: 2026,
        paid: false
      });

      expect(bill.createdAt).toBeDefined();
      expect(bill.createdAt >= before).toBe(true);
    });

    it('should call FirebaseService.add', async () => {
      const billData = { type: 'electric', amount: 1000, month: 1, year: 2026, paid: false };

      await BillsService.add(billData);

      expect(FirebaseService.add).toHaveBeenCalledWith('bills', expect.any(Object));
    });

    it('should emit BILL_ADDED event', async () => {
      const billData = { type: 'electric', amount: 1000, month: 1, year: 2026, paid: false };

      const bill = await BillsService.add(billData);

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.BILL_ADDED, bill);
    });

    it('should show success toast', async () => {
      const billData = { type: 'electric', amount: 1000, month: 1, year: 2026, paid: false };

      await BillsService.add(billData);

      expect(toastSuccess).toHaveBeenCalledWith('Fatura eklendi');
    });

    it('should return created bill', async () => {
      const billData = { type: 'water', amount: 500, month: 2, year: 2026, paid: true };

      const bill = await BillsService.add(billData);

      expect(bill).toMatchObject(billData);
      expect(bill.id).toBeDefined();
      expect(bill.createdAt).toBeDefined();
    });
  });

  // =========================================
  // Update Bill Tests (Async)
  // =========================================

  describe('update', () => {
    it('should update existing bill', async () => {
      const bill = createBillFixture({ id: 'test-123', amount: 1000 });
      AppState.bills = [bill];

      const result = await BillsService.update('test-123', { amount: 1500 });

      expect(result).toBe(true);
      expect(AppState.bills[0].amount).toBe(1500);
    });

    it('should merge partial updates', async () => {
      const bill = createBillFixture({ id: 'test-123', type: 'electric', amount: 1000 });
      AppState.bills = [bill];

      await BillsService.update('test-123', { amount: 1500 });

      expect(AppState.bills[0].type).toBe('electric');
      expect(AppState.bills[0].amount).toBe(1500);
    });

    it('should return false for non-existent bill', async () => {
      const result = await BillsService.update('non-existent', { amount: 1500 });

      expect(result).toBe(false);
    });

    it('should call FirebaseService.save', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill];

      await BillsService.update('test-123', { amount: 1500 });

      expect(FirebaseService.save).toHaveBeenCalledWith('bills', 'test-123', expect.any(Object));
    });

    it('should emit BILL_UPDATED event', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill];

      await BillsService.update('test-123', { amount: 1500 });

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.BILL_UPDATED, expect.any(Object));
    });

    it('should show success toast', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill];

      await BillsService.update('test-123', { amount: 1500 });

      expect(toastSuccess).toHaveBeenCalledWith('Fatura güncellendi');
    });
  });

  // =========================================
  // Delete Bill Tests (Async)
  // =========================================

  describe('delete', () => {
    it('should delete bill from AppState', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill, createBillFixture({ id: 'test-456' })];

      await BillsService.delete('test-123');

      expect(AppState.bills).toHaveLength(1);
      expect(AppState.bills[0].id).toBe('test-456');
    });

    it('should return true even for non-existent bill', async () => {
      const result = await BillsService.delete('non-existent');

      expect(result).toBe(true);
    });

    it('should call FirebaseService.delete', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill];

      await BillsService.delete('test-123');

      expect(FirebaseService.delete).toHaveBeenCalledWith('bills', 'test-123');
    });

    it('should emit BILL_DELETED event with bill data', async () => {
      const bill = createBillFixture({ id: 'test-123', type: 'electric' });
      AppState.bills = [bill];

      await BillsService.delete('test-123');

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.BILL_DELETED, expect.objectContaining({
        type: 'electric'
      }));
    });

    it('should show success toast', async () => {
      const bill = createBillFixture({ id: 'test-123' });
      AppState.bills = [bill];

      await BillsService.delete('test-123');

      expect(toastSuccess).toHaveBeenCalledWith('Fatura silindi');
    });
  });

  // =========================================
  // Yearly Total Tests
  // =========================================

  describe('getYearlyTotal', () => {
    it('should return 0 when no bills for year', () => {
      expect(BillsService.getYearlyTotal(2026)).toBe(0);
    });

    it('should calculate total correctly', () => {
      AppState.bills = [
        createBillFixture({ year: 2026, amount: 1000 }),
        createBillFixture({ year: 2026, amount: 2000 }),
        createBillFixture({ year: 2025, amount: 500 })
      ];

      expect(BillsService.getYearlyTotal(2026)).toBe(3000);
    });

    it('should handle multiple bill types', () => {
      AppState.bills = [
        createBillFixture({ year: 2026, amount: 1000, type: 'electric' }),
        createBillFixture({ year: 2026, amount: 500, type: 'water' }),
        createBillFixture({ year: 2026, amount: 1500, type: 'gas' })
      ];

      expect(BillsService.getYearlyTotal(2026)).toBe(3000);
    });

    it('should handle empty amounts', () => {
      AppState.bills = [
        createBillFixture({ year: 2026, amount: 0 }),
        createBillFixture({ year: 2026, amount: 100 })
      ];

      expect(BillsService.getYearlyTotal(2026)).toBe(100);
    });
  });

  // =========================================
  // Bill Type Tests
  // =========================================

  describe('bill types', () => {
    it('should handle all bill types', () => {
      const types = ['electric', 'water', 'gas', 'internet', 'other'];
      
      AppState.bills = types.map(type => 
        createBillFixture({ type, amount: 1000 })
      );

      const allBills = BillsService.getAll();

      expect(allBills).toHaveLength(5);
      types.forEach(type => {
        expect(allBills.some(b => b.type === type)).toBe(true);
      });
    });
  });

  // =========================================
  // Paid Status Tests
  // =========================================

  describe('paid status', () => {
    it('should track paid and unpaid bills', () => {
      AppState.bills = [
        createBillFixture({ paid: true, amount: 1000 }),
        createBillFixture({ paid: false, amount: 2000 }),
        createBillFixture({ paid: true, amount: 1500 })
      ];

      const paidBills = AppState.bills.filter(b => b.paid);
      const unpaidBills = AppState.bills.filter(b => !b.paid);

      expect(paidBills).toHaveLength(2);
      expect(unpaidBills).toHaveLength(1);
    });
  });
});
