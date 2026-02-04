/**
 * Bills Service - Bill management operations
 */

import { AppState } from '../../modules/state.js';
import { COLLECTIONS } from '../../firebase-config.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { toastSuccess } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type { Bill } from './bills.types.js';

// Generate unique ID
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Bills Service - CRUD operations for bills
 */
export const BillsService = {
    /**
     * Get bills filtered by year
     */
    getByYear(year: number): Bill[] {
        return AppState.bills
            .filter(b => b.year === year)
            .sort((a, b) => b.month - a.month);
    },

    /**
     * Get all bills sorted by date
     */
    getAll(): Bill[] {
        return [...AppState.bills].sort((a, b) =>
            b.year !== a.year ? b.year - a.year : b.month - a.month
        );
    },

    /**
     * Get bill by ID
     */
    getById(id: string): Bill | undefined {
        return AppState.bills.find(b => b.id === id);
    },

    /**
     * Add a new bill
     */
    async add(data: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> {
        const bill: Bill = {
            id: generateId(),
            ...data,
            createdAt: new Date().toISOString()
        };

        AppState.bills.push(bill);
        await FirebaseService.add(COLLECTIONS.BILLS, bill);

        eventBus.emit(EVENTS.BILL_ADDED, bill);
        toastSuccess('Fatura eklendi');

        return bill;
    },

    /**
     * Update an existing bill
     */
    async update(id: string, data: Partial<Bill>): Promise<boolean> {
        const index = AppState.bills.findIndex(b => b.id === id);

        if (index !== -1) {
            const updated = { ...AppState.bills[index], ...data };
            AppState.bills[index] = updated;
            await FirebaseService.save(COLLECTIONS.BILLS, id, updated);

            eventBus.emit(EVENTS.BILL_UPDATED, updated);
            toastSuccess('Fatura güncellendi');

            return true;
        }

        return false;
    },

    /**
     * Delete a bill
     */
    async delete(id: string): Promise<boolean> {
        const bill = AppState.bills.find(b => b.id === id);

        AppState.bills = AppState.bills.filter(b => b.id !== id);
        await FirebaseService.delete(COLLECTIONS.BILLS, id);

        eventBus.emit(EVENTS.BILL_DELETED, bill);
        toastSuccess('Fatura silindi');

        return true;
    },

    /**
     * Get total bills amount for a year
     */
    getYearlyTotal(year: number): number {
        return AppState.bills
            .filter(b => b.year === year)
            .reduce((sum, b) => sum + b.amount, 0);
    }
};

export default BillsService;
