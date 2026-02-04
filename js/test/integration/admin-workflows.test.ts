/**
 * Admin Workflow Tests
 * End-to-end workflow tests for admin operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../features/auth/auth.service.js';
import { FinancesService } from '../../features/finances/finances.service.js';
import { BillsService } from '../../features/bills/bills.service.js';
import { AppState } from '../../modules/state.js';

// =========================================
// Mock Setup
// =========================================

vi.mock('../../firebase-config.js', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn().mockResolvedValue({})
  },
  db: {},
  COLLECTIONS: {
    TRANSACTIONS: 'transactions',
    BILLS: 'bills',
    APARTMENTS: 'apartments',
    DUES: 'dues',
    SETTINGS: 'settings'
  },
  APP_CONFIG: {
    ADMIN_EMAIL: 'admin@example.com',
    TOTAL_APARTMENTS: 12,
    SESSION_STORAGE_KEY: 'apt_resident_session',
    SECURITY: {
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30
    }
  },
  logSecurityEvent: vi.fn(),
  verifyAdminRole: vi.fn(),
  getUserClaims: vi.fn()
}));

vi.mock('../../shared/services/firebase.service.js', () => ({
  FirebaseService: {
    loadCollection: vi.fn().mockResolvedValue([]),
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
    AUTH_LOGIN: 'auth:login',
    AUTH_LOGOUT: 'auth:logout',
    TRANSACTION_ADDED: 'transaction:added',
    BILL_ADDED: 'bill:added'
  }
}));

// =========================================
// Test Suite
// =========================================

describe('Admin Workflows', () => {
  beforeEach(() => {
    AppState.currentUser = null;
    AppState.transactions = [];
    AppState.bills = [];
    AppState.apartments = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================
  // Login Workflow
  // =========================================

  describe('Login Workflow', () => {
    it('should allow admin to login', async () => {
      const result = await AuthService.loginAdmin('correct-password');
      
      expect(result).toBe(true);
      expect(AuthService.isAdmin()).toBe(true);
    });

    it('should reject invalid admin credentials', async () => {
      const result = await AuthService.loginAdmin('wrong-password');
      
      expect(result).toBe(false);
      expect(AuthService.isAdmin()).toBe(false);
    });

    it('should track login attempts', async () => {
      await AuthService.loginAdmin('wrong-password');
      await AuthService.loginAdmin('wrong-password');
      
      const result = await AuthService.loginAdmin('wrong-password');
      expect(result).toBe(false);
    });
  });

  // =========================================
  // Finance Management Workflow
  // =========================================

  describe('Finance Management Workflow', () => {
    beforeEach(() => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    });

    it('should complete full transaction lifecycle', async () => {
      // Add transaction
      const transaction = await FinancesService.add({
        type: 'income',
        amount: 5000,
        description: 'Aidat ödemesi',
        date: '2026-02-15',
        category: 'aidat'
      });

      expect(transaction.id).toBeDefined();
      expect(AppState.transactions).toHaveLength(1);

      // Update transaction
      const updated = await FinancesService.update(transaction.id, { amount: 5500 });
      expect(updated).toBe(true);
      expect(AppState.transactions[0].amount).toBe(5500);

      // Delete transaction
      const deleted = await FinancesService.delete(transaction.id);
      expect(deleted).toBe(true);
      expect(AppState.transactions).toHaveLength(0);
    });

    it('should calculate balance after multiple transactions', async () => {
      await FinancesService.add({
        type: 'income',
        amount: 10000,
        description: 'Aylık gelir',
        date: '2026-02-01',
        category: 'aidat'
      });

      await FinancesService.add({
        type: 'expense',
        amount: 3000,
        description: 'Elektrik faturası',
        date: '2026-02-05',
        category: 'elektrik'
      });

      await FinancesService.add({
        type: 'expense',
        amount: 2000,
        description: 'Su faturası',
        date: '2026-02-10',
        category: 'su'
      });

      const balance = FinancesService.calculateBalance();
      expect(balance).toBe(5000);
    });

    it('should filter transactions by year', async () => {
      await FinancesService.add({
        type: 'income',
        amount: 1000,
        description: '2025 gelir',
        date: '2025-12-01',
        category: 'aidat'
      });

      await FinancesService.add({
        type: 'income',
        amount: 2000,
        description: '2026 gelir',
        date: '2026-01-01',
        category: 'aidat'
      });

      const filtered2026 = FinancesService.getFiltered(2026);
      expect(filtered2026).toHaveLength(1);
      expect(filtered2026[0].amount).toBe(2000);
    });

    it('should generate monthly data for charts', async () => {
      await FinancesService.add({
        type: 'income',
        amount: 5000,
        description: 'Ocak gelir',
        date: '2026-01-15',
        category: 'aidat'
      });

      await FinancesService.add({
        type: 'income',
        amount: 6000,
        description: 'Şubat gelir',
        date: '2026-02-15',
        category: 'aidat'
      });

      const monthlyData = FinancesService.getMonthlyData(2026);
      
      expect(monthlyData.income[0]).toBe(5000); // January
      expect(monthlyData.income[1]).toBe(6000); // February
    });

    it('should generate category breakdown', async () => {
      await FinancesService.add({
        type: 'expense',
        amount: 1000,
        description: 'Elektrik 1',
        date: '2026-02-01',
        category: 'elektrik'
      });

      await FinancesService.add({
        type: 'expense',
        amount: 1500,
        description: 'Elektrik 2',
        date: '2026-02-15',
        category: 'elektrik'
      });

      await FinancesService.add({
        type: 'expense',
        amount: 800,
        description: 'Su',
        date: '2026-02-20',
        category: 'su'
      });

      const breakdown = FinancesService.getCategoryBreakdown('expense');
      
      expect(breakdown['elektrik']).toBe(2500);
      expect(breakdown['su']).toBe(800);
    });
  });

  // =========================================
  // Bill Management Workflow
  // =========================================

  describe('Bill Management Workflow', () => {
    beforeEach(() => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    });

    it('should complete full bill lifecycle', async () => {
      // Add bill
      const bill = await BillsService.add({
        type: 'electric',
        amount: 1500,
        month: 1,
        year: 2026,
        paid: false
      });

      expect(bill.id).toBeDefined();
      expect(AppState.bills).toHaveLength(1);

      // Update bill
      const updated = await BillsService.update(bill.id, { paid: true });
      expect(updated).toBe(true);
      expect(AppState.bills[0].paid).toBe(true);

      // Delete bill
      const deleted = await BillsService.delete(bill.id);
      expect(deleted).toBe(true);
      expect(AppState.bills).toHaveLength(0);
    });

    it('should calculate yearly total correctly', async () => {
      await BillsService.add({ type: 'electric', amount: 1000, month: 1, year: 2026, paid: true });
      await BillsService.add({ type: 'water', amount: 500, month: 1, year: 2026, paid: true });
      await BillsService.add({ type: 'gas', amount: 1500, month: 2, year: 2026, paid: false });
      await BillsService.add({ type: 'electric', amount: 800, month: 12, year: 2025, paid: true });

      const total2026 = BillsService.getYearlyTotal(2026);
      expect(total2026).toBe(3000);
    });

    it('should filter bills by year', () => {
      AppState.bills = [
        { id: '1', type: 'electric', amount: 1000, month: 1, year: 2025, paid: true },
        { id: '2', type: 'water', amount: 500, month: 2, year: 2026, paid: true },
        { id: '3', type: 'gas', amount: 1500, month: 3, year: 2026, paid: false }
      ];

      const bills2026 = BillsService.getByYear(2026);
      
      expect(bills2026).toHaveLength(2);
      expect(bills2026.every(b => b.year === 2026)).toBe(true);
    });

    it('should sort bills by month descending', () => {
      AppState.bills = [
        { id: '1', type: 'electric', amount: 1000, month: 1, year: 2026, paid: true },
        { id: '2', type: 'water', amount: 500, month: 5, year: 2026, paid: true },
        { id: '3', type: 'gas', amount: 1500, month: 3, year: 2026, paid: false }
      ];

      const bills = BillsService.getByYear(2026);
      
      expect(bills[0].month).toBe(5);
      expect(bills[1].month).toBe(3);
      expect(bills[2].month).toBe(1);
    });
  });

  // =========================================
  // Logout Workflow
  // =========================================

  describe('Logout Workflow', () => {
    beforeEach(() => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    });

    it('should allow admin to logout', async () => {
      await AuthService.logout();
      
      expect(AuthService.isAdmin()).toBe(false);
      expect(AppState.currentUser).toBeNull();
    });

    it('should clear session on logout', async () => {
      await AuthService.logout();
      
      expect(AppState.currentUser).toBeNull();
    });
  });

  // =========================================
  // Error Handling Workflow
  // =========================================

  describe('Error Handling', () => {
    beforeEach(() => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    });

    it('should handle update of non-existent transaction', async () => {
      const result = await FinancesService.update('non-existent', { amount: 1000 });
      
      expect(result).toBe(false);
    });

    it('should handle update of non-existent bill', async () => {
      const result = await BillsService.update('non-existent', { amount: 1000 });
      
      expect(result).toBe(false);
    });

    it('should return undefined for non-existent transaction', () => {
      const found = FinancesService.getById('non-existent');
      
      expect(found).toBeUndefined();
    });

    it('should return undefined for non-existent bill', () => {
      const found = BillsService.getById('non-existent');
      
      expect(found).toBeUndefined();
    });
  });

  // =========================================
  // Access Control Workflow
  // =========================================

  describe('Access Control', () => {
    it('should not allow resident to access admin functions', () => {
      AppState.currentUser = { role: 'resident', apartment: 5 };
      
      expect(AuthService.isAdmin()).toBe(false);
    });

    it('should verify admin role', () => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
      
      expect(AuthService.isAdmin()).toBe(true);
    });

    it('should get resident apartment number', () => {
      AppState.currentUser = { role: 'resident', apartment: 7 };
      
      expect(AuthService.getResidentApartment()).toBe(7);
    });

    it('should check apartment access for admin', () => {
      AppState.currentUser = { role: 'admin', uid: 'admin-123' };
      
      expect(AuthService.canAccessApartment(5)).toBe(true);
      expect(AuthService.canAccessApartment(10)).toBe(true);
    });

    it('should check apartment access for resident', () => {
      AppState.currentUser = { role: 'resident', apartment: 5 };
      
      expect(AuthService.canAccessApartment(5)).toBe(true);
      expect(AuthService.canAccessApartment(3)).toBe(false);
    });
  });
});

// =========================================
// Data Integrity Tests
// =========================================

describe('Data Integrity', () => {
  beforeEach(() => {
    AppState.currentUser = { role: 'admin', uid: 'admin-123' };
    AppState.transactions = [];
    AppState.bills = [];
  });

  it('should maintain data consistency after multiple operations', async () => {
    // Add multiple transactions
    const t1 = await FinancesService.add({
      type: 'income', amount: 1000, description: 'Test 1', date: '2026-02-01', category: 'aidat'
    });
    
    const t2 = await FinancesService.add({
      type: 'expense', amount: 500, description: 'Test 2', date: '2026-02-02', category: 'temizlik'
    });

    expect(AppState.transactions).toHaveLength(2);

    // Update one
    await FinancesService.update(t1.id, { amount: 1500 });
    
    // Delete another
    await FinancesService.delete(t2.id);

    expect(AppState.transactions).toHaveLength(1);
    expect(AppState.transactions[0].amount).toBe(1500);
  });

  it('should handle concurrent modifications gracefully', async () => {
    const bill = await BillsService.add({
      type: 'electric', amount: 1000, month: 1, year: 2026, paid: false
    });

    // Multiple updates
    await BillsService.update(bill.id, { amount: 1200 });
    await BillsService.update(bill.id, { paid: true });
    await BillsService.update(bill.id, { amount: 1500 });

    const updated = BillsService.getById(bill.id);
    expect(updated?.amount).toBe(1500);
    expect(updated?.paid).toBe(true);
  });
});
