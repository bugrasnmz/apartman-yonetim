/**
 * Finances Service Tests
 * Unit tests for transaction management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancesService } from './finances.service.js';
import { AppState } from '../../modules/state.js';
import { createTransactionFixture } from '../../test/fixtures.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { eventBus, EVENTS } from '../../core/events.js';
import { toastSuccess } from '../../shared/ui/toast.js';
import type { Transaction } from './finances.types.js';

// =========================================
// Mock Setup
// =========================================

vi.mock('../../firebase-config.js', () => ({
  COLLECTIONS: { TRANSACTIONS: 'transactions' },
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
    TRANSACTION_ADDED: 'transaction:added',
    TRANSACTION_UPDATED: 'transaction:updated',
    TRANSACTION_DELETED: 'transaction:deleted'
  }
}));

// =========================================
// Test Suite
// =========================================

describe('FinancesService', () => {
  beforeEach(() => {
    AppState.transactions = [];
    vi.clearAllMocks();
  });

  // =========================================
  // Balance Calculation Tests
  // =========================================

  describe('calculateBalance', () => {
    it('should return 0 when no transactions exist', () => {
      expect(FinancesService.calculateBalance()).toBe(0);
    });

    it('should calculate balance correctly with income only', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000 }),
        createTransactionFixture({ type: 'income', amount: 2000 })
      ];

      expect(FinancesService.calculateBalance()).toBe(3000);
    });

    it('should calculate balance correctly with expense only', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'expense', amount: 500 }),
        createTransactionFixture({ type: 'expense', amount: 800 })
      ];

      expect(FinancesService.calculateBalance()).toBe(-1300);
    });

    it('should calculate balance correctly with mixed transactions', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 5000 }),
        createTransactionFixture({ type: 'expense', amount: 2000 }),
        createTransactionFixture({ type: 'income', amount: 1500 }),
        createTransactionFixture({ type: 'expense', amount: 1000 })
      ];

      expect(FinancesService.calculateBalance()).toBe(3500);
    });

    it('should handle zero amounts', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 0 }),
        createTransactionFixture({ type: 'expense', amount: 0 })
      ];

      expect(FinancesService.calculateBalance()).toBe(0);
    });
  });

  // =========================================
  // Summary Tests
  // =========================================

  describe('getSummary', () => {
    it('should return zero summary when no transactions', () => {
      const summary = FinancesService.getSummary();

      expect(summary).toEqual({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0
      });
    });

    it('should calculate summary correctly', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 5000 }),
        createTransactionFixture({ type: 'income', amount: 3000 }),
        createTransactionFixture({ type: 'expense', amount: 2000 }),
        createTransactionFixture({ type: 'expense', amount: 1500 })
      ];

      const summary = FinancesService.getSummary();

      expect(summary.totalIncome).toBe(8000);
      expect(summary.totalExpense).toBe(3500);
      expect(summary.balance).toBe(4500);
    });

    it('should return correct balance calculation', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 100 }),
        createTransactionFixture({ type: 'expense', amount: 50 })
      ];

      const summary = FinancesService.getSummary();

      expect(summary.balance).toBe(summary.totalIncome - summary.totalExpense);
    });
  });

  // =========================================
  // Monthly Data Tests
  // =========================================

  describe('getMonthlyData', () => {
    it('should return empty monthly data when no transactions', () => {
      const data = FinancesService.getMonthlyData(2026);

      expect(data.income).toEqual(Array(12).fill(0));
      expect(data.expense).toEqual(Array(12).fill(0));
    });

    it('should aggregate transactions by month correctly', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, date: '2026-01-15' }),
        createTransactionFixture({ type: 'income', amount: 2000, date: '2026-01-20' }),
        createTransactionFixture({ type: 'expense', amount: 500, date: '2026-01-10' }),
        createTransactionFixture({ type: 'income', amount: 3000, date: '2026-02-05' }),
        createTransactionFixture({ type: 'expense', amount: 1000, date: '2026-02-15' })
      ];

      const data = FinancesService.getMonthlyData(2026);

      expect(data.income[0]).toBe(3000);  // January
      expect(data.expense[0]).toBe(500);  // January
      expect(data.income[1]).toBe(3000);  // February
      expect(data.expense[1]).toBe(1000); // February
      expect(data.income[2]).toBe(0);     // March
    });

    it('should filter by year correctly', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, date: '2025-01-15' }),
        createTransactionFixture({ type: 'income', amount: 2000, date: '2026-01-15' })
      ];

      const data = FinancesService.getMonthlyData(2026);

      expect(data.income[0]).toBe(2000);
    });

    it('should handle all months', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, date: '2026-01-01' }),
        createTransactionFixture({ type: 'income', amount: 2000, date: '2026-06-15' }),
        createTransactionFixture({ type: 'income', amount: 3000, date: '2026-12-31' })
      ];

      const data = FinancesService.getMonthlyData(2026);

      expect(data.income[0]).toBe(1000);  // Jan
      expect(data.income[5]).toBe(2000);  // Jun
      expect(data.income[11]).toBe(3000); // Dec
    });
  });

  // =========================================
  // Category Breakdown Tests
  // =========================================

  describe('getCategoryBreakdown', () => {
    it('should return empty object when no transactions', () => {
      const breakdown = FinancesService.getCategoryBreakdown('income');
      expect(breakdown).toEqual({});
    });

    it('should aggregate income by category', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, category: 'aidat' as const }),
        createTransactionFixture({ type: 'income', amount: 2000, category: 'aidat' as const }),
        createTransactionFixture({ type: 'income', amount: 500, category: 'kira' }),
        createTransactionFixture({ type: 'expense', amount: 300, category: 'temizlik' })
      ];

      const breakdown = FinancesService.getCategoryBreakdown('income');

      expect(breakdown['aidat']).toBe(3000);
      expect(breakdown['kira']).toBe(500);
      expect(breakdown['temizlik']).toBeUndefined();
    });

    it('should aggregate expense by category', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'expense', amount: 1000, category: 'elektrik' }),
        createTransactionFixture({ type: 'expense', amount: 800, category: 'elektrik' }),
        createTransactionFixture({ type: 'expense', amount: 500, category: 'su' })
      ];

      const breakdown = FinancesService.getCategoryBreakdown('expense');

      expect(breakdown['elektrik']).toBe(1800);
      expect(breakdown['su']).toBe(500);
    });

    it('should handle multiple categories', () => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, category: 'cat1' }),
        createTransactionFixture({ type: 'income', amount: 2000, category: 'cat2' }),
        createTransactionFixture({ type: 'income', amount: 3000, category: 'cat3' })
      ];

      const breakdown = FinancesService.getCategoryBreakdown('income');

      expect(Object.keys(breakdown)).toHaveLength(3);
    });
  });

  // =========================================
  // Filtered Transactions Tests
  // =========================================

  describe('getFiltered', () => {
    beforeEach(() => {
      AppState.transactions = [
        createTransactionFixture({ type: 'income', amount: 1000, date: '2026-01-15' }),
        createTransactionFixture({ type: 'expense', amount: 500, date: '2026-02-10' }),
        createTransactionFixture({ type: 'income', amount: 2000, date: '2026-03-05' }),
        createTransactionFixture({ type: 'expense', amount: 800, date: '2025-12-20' })
      ];
    });

    it('should filter by year only', () => {
      const filtered = FinancesService.getFiltered(2026);

      expect(filtered).toHaveLength(3);
    });

    it('should filter by year and income type', () => {
      const filtered = FinancesService.getFiltered(2026, 'income');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.type === 'income')).toBe(true);
    });

    it('should filter by year and expense type', () => {
      const filtered = FinancesService.getFiltered(2026, 'expense');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('expense');
    });

    it('should return all types when type is "all"', () => {
      const filtered = FinancesService.getFiltered(2026, 'all');

      expect(filtered).toHaveLength(3);
    });

    it('should return empty array when type is undefined and year has no matches', () => {
      const filtered = FinancesService.getFiltered(2024);

      expect(filtered).toEqual([]);
    });

    it('should sort by date descending', () => {
      const filtered = FinancesService.getFiltered(2026);

      expect(new Date(filtered[0].date) >= new Date(filtered[1].date)).toBe(true);
    });
  });

  // =========================================
  // Add Transaction Tests (Async)
  // =========================================

  describe('add', () => {
    it('should add transaction to AppState', async () => {
      const transactionData = {
        type: 'income' as const,
        amount: 1000,
        description: 'Test income',
        date: '2026-01-15',
        category: 'aidat' as const
      };

      const transaction = await FinancesService.add(transactionData);

      expect(AppState.transactions).toHaveLength(1);
      expect(AppState.transactions[0]).toMatchObject(transactionData);
    });

    it('should generate unique ID', async () => {
      const transactionData = { type: 'income' as const, amount: 1000, description: 'Test', date: '2026-01-15', category: 'aidat' as const };

      const t1 = await FinancesService.add(transactionData);
      const t2 = await FinancesService.add(transactionData);

      expect(t1.id).toBeDefined();
      expect(t2.id).toBeDefined();
      expect(t1.id).not.toBe(t2.id);
    });

    it('should set createdAt timestamp', async () => {
      const before = new Date().toISOString();
      
      const transaction = await FinancesService.add({
        type: 'income',
        amount: 1000,
        description: 'Test',
        date: '2026-01-15',
        category: 'aidat' as const
      });

      expect(transaction.createdAt).toBeDefined();
      expect(transaction.createdAt >= before).toBe(true);
    });

    it('should call FirebaseService.add', async () => {
      const transactionData = { type: 'income' as const, amount: 1000, description: 'Test', date: '2026-01-15', category: 'aidat' as const };

      await FinancesService.add(transactionData);

      expect(FirebaseService.add).toHaveBeenCalledWith('transactions', expect.any(Object));
    });

    it('should emit TRANSACTION_ADDED event', async () => {
      const transactionData = { type: 'income' as const, amount: 1000, description: 'Test', date: '2026-01-15', category: 'aidat' as const };

      const transaction = await FinancesService.add(transactionData);

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.TRANSACTION_ADDED, transaction);
    });

    it('should show success toast', async () => {
      const transactionData = { type: 'income' as const, amount: 1000, description: 'Test', date: '2026-01-15', category: 'aidat' as const };

      await FinancesService.add(transactionData);

      expect(toastSuccess).toHaveBeenCalledWith('Kayıt eklendi');
    });
  });

  // =========================================
  // Update Transaction Tests (Async)
  // =========================================

  describe('update', () => {
    it('should update existing transaction', async () => {
      const transaction = createTransactionFixture({ id: 'test-123', amount: 1000 });
      AppState.transactions = [transaction];

      const result = await FinancesService.update('test-123', { amount: 1500 });

      expect(result).toBe(true);
      expect(AppState.transactions[0].amount).toBe(1500);
    });

    it('should merge partial updates', async () => {
      const transaction = createTransactionFixture({ id: 'test-123', type: 'income', amount: 1000 });
      AppState.transactions = [transaction];

      await FinancesService.update('test-123', { amount: 1500 });

      expect(AppState.transactions[0].type).toBe('income');
      expect(AppState.transactions[0].amount).toBe(1500);
    });

    it('should return false for non-existent transaction', async () => {
      const result = await FinancesService.update('non-existent', { amount: 1500 });

      expect(result).toBe(false);
    });

    it('should call FirebaseService.save', async () => {
      const transaction = createTransactionFixture({ id: 'test-123' });
      AppState.transactions = [transaction];

      await FinancesService.update('test-123', { amount: 1500 });

      expect(FirebaseService.save).toHaveBeenCalledWith('transactions', 'test-123', expect.any(Object));
    });

    it('should emit TRANSACTION_UPDATED event', async () => {
      const transaction = createTransactionFixture({ id: 'test-123' });
      AppState.transactions = [transaction];

      await FinancesService.update('test-123', { amount: 1500 });

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.TRANSACTION_UPDATED, expect.any(Object));
    });
  });

  // =========================================
  // Delete Transaction Tests (Async)
  // =========================================

  describe('delete', () => {
    it('should delete transaction from AppState', async () => {
      const transaction = createTransactionFixture({ id: 'test-123' });
      AppState.transactions = [transaction, createTransactionFixture({ id: 'test-456' })];

      await FinancesService.delete('test-123');

      expect(AppState.transactions).toHaveLength(1);
      expect(AppState.transactions[0].id).toBe('test-456');
    });

    it('should return true even for non-existent transaction', async () => {
      const result = await FinancesService.delete('non-existent');

      expect(result).toBe(true);
    });

    it('should call FirebaseService.delete', async () => {
      const transaction = createTransactionFixture({ id: 'test-123' });
      AppState.transactions = [transaction];

      await FinancesService.delete('test-123');

      expect(FirebaseService.delete).toHaveBeenCalledWith('transactions', 'test-123');
    });

    it('should emit TRANSACTION_DELETED event', async () => {
      const transaction = createTransactionFixture({ id: 'test-123', type: 'income' });
      AppState.transactions = [transaction];

      await FinancesService.delete('test-123');

      expect(eventBus.emit).toHaveBeenCalledWith(EVENTS.TRANSACTION_DELETED, expect.objectContaining({
        type: 'income'
      }));
    });
  });

  // =========================================
  // Get By ID Tests
  // =========================================

  describe('getById', () => {
    it('should return transaction by ID', () => {
      const transaction = createTransactionFixture({ id: 'test-id-123' });
      AppState.transactions = [transaction];

      const found = FinancesService.getById('test-id-123');

      expect(found).toEqual(transaction);
    });

    it('should return undefined for non-existent ID', () => {
      const found = FinancesService.getById('non-existent');

      expect(found).toBeUndefined();
    });
  });
});
