/**
 * Finances Service - Transaction management operations
 */

import { AppState } from '../../modules/state.js';
import { COLLECTIONS } from '../../firebase-config.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { toastSuccess, toastError } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type { Transaction, FinanceSummary, MonthlyData, CategoryBreakdown } from './finances.types.js';

// Generate unique ID
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Finances Service - CRUD operations for transactions
 */
export const FinancesService = {
    /**
     * Calculate current balance
     */
    calculateBalance(): number {
        const income = AppState.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = AppState.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return income - expense;
    },

    /**
     * Get finance summary
     */
    getSummary(): FinanceSummary {
        const income = AppState.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = AppState.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome: income,
            totalExpense: expense,
            balance: income - expense
        };
    },

    /**
     * Get monthly data for charts
     */
    getMonthlyData(year: number): MonthlyData {
        const data: MonthlyData = {
            income: Array(12).fill(0),
            expense: Array(12).fill(0)
        };

        AppState.transactions.forEach(t => {
            const d = new Date(t.date);
            if (d.getFullYear() === year) {
                const month = d.getMonth();
                if (t.type === 'income') data.income[month] += t.amount;
                else data.expense[month] += t.amount;
            }
        });

        return data;
    },

    /**
     * Get category breakdown for pie charts
     */
    getCategoryBreakdown(type: 'income' | 'expense'): CategoryBreakdown {
        const breakdown: CategoryBreakdown = {};

        AppState.transactions
            .filter(t => t.type === type)
            .forEach(t => {
                breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
            });

        return breakdown;
    },

    /**
     * Get filtered transactions
     */
    getFiltered(year: number, type?: 'income' | 'expense' | 'all'): Transaction[] {
        return AppState.transactions
            .filter(t => {
                const d = new Date(t.date);
                if (d.getFullYear() !== year) return false;
                if (type && type !== 'all' && t.type !== type) return false;
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    /**
     * Add a new transaction
     */
    async add(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
        const transaction: Transaction = {
            id: generateId(),
            ...data,
            createdAt: new Date().toISOString()
        };

        AppState.transactions.push(transaction); // Optimistic UI
        await FirebaseService.add(COLLECTIONS.TRANSACTIONS, transaction);

        eventBus.emit(EVENTS.TRANSACTION_ADDED, transaction);
        toastSuccess('Kayıt eklendi');

        return transaction;
    },

    /**
     * Update an existing transaction
     */
    async update(id: string, data: Partial<Transaction>): Promise<boolean> {
        const index = AppState.transactions.findIndex(t => t.id === id);

        if (index !== -1) {
            const updated = { ...AppState.transactions[index], ...data };
            AppState.transactions[index] = updated;
            await FirebaseService.save(COLLECTIONS.TRANSACTIONS, id, updated);

            eventBus.emit(EVENTS.TRANSACTION_UPDATED, updated);
            toastSuccess('Kayıt güncellendi');

            return true;
        }

        return false;
    },

    /**
     * Delete a transaction
     */
    async delete(id: string): Promise<boolean> {
        const transaction = AppState.transactions.find(t => t.id === id);

        AppState.transactions = AppState.transactions.filter(t => t.id !== id);
        await FirebaseService.delete(COLLECTIONS.TRANSACTIONS, id);

        eventBus.emit(EVENTS.TRANSACTION_DELETED, transaction);
        toastSuccess('Kayıt silindi');

        return true;
    },

    /**
     * Get transaction by ID
     */
    getById(id: string): Transaction | undefined {
        return AppState.transactions.find(t => t.id === id);
    }
};

export default FinancesService;
