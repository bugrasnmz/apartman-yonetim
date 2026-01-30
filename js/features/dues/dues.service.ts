/**
 * Dues Service - Monthly dues management operations
 */

import { AppState } from '../../modules/state.js';
import { COLLECTIONS, APP_CONFIG } from '../../firebase-config.js';
import { FirebaseService } from '../../shared/services/firebase.service.js';
import { toastSuccess } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type { DuesCollectionData, DuesSummary } from './dues.types.js';

const TOTAL_APARTMENTS = APP_CONFIG.TOTAL_APARTMENTS;

/**
 * Dues Service - Operations for monthly dues
 */
export const DuesService = {
    /**
     * Initialize dues for a year if not exists
     */
    initYear(year: number): void {
        if (!AppState.dues[year]) {
            AppState.dues[year] = {};
            for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
                AppState.dues[year][apt] = {};
                for (let month = 1; month <= 12; month++) {
                    AppState.dues[year][apt][month] = false;
                }
            }
        }
    },

    /**
     * Toggle due payment status
     */
    async toggle(year: number, apartment: number, month: number): Promise<boolean> {
        this.initYear(year);

        const currentStatus = AppState.dues[year]?.[apartment]?.[month] || false;
        const newStatus = !currentStatus;

        AppState.dues[year][apartment][month] = newStatus;

        // Save to Firebase
        await FirebaseService.save(COLLECTIONS.DUES, `${year}`, AppState.dues[year]);

        eventBus.emit(EVENTS.DUE_TOGGLED, { year, apartment, month, paid: newStatus });
        toastSuccess(newStatus ? 'Aidat ödendi olarak işaretlendi' : 'Aidat ödenmedi olarak işaretlendi');

        return newStatus;
    },

    /**
     * Get due status for a specific apartment/month
     */
    getStatus(year: number, apartment: number, month: number): boolean {
        return AppState.dues[year]?.[apartment]?.[month] || false;
    },

    /**
     * Get dues collection data for charts
     */
    getCollectionData(year: number): DuesCollectionData {
        const amount = AppState.settings.monthlyDueAmount;
        const data: DuesCollectionData = {
            collected: Array(12).fill(0),
            total: Array(12).fill(0),
            rate: Array(12).fill(0)
        };

        for (let month = 1; month <= 12; month++) {
            let paid = 0;
            for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
                if (AppState.dues[year]?.[apt]?.[month]) paid++;
            }
            data.collected[month - 1] = paid * amount;
            data.total[month - 1] = TOTAL_APARTMENTS * amount;
            data.rate[month - 1] = TOTAL_APARTMENTS > 0
                ? Math.round((paid / TOTAL_APARTMENTS) * 100)
                : 0;
        }

        return data;
    },

    /**
     * Get summary for current month
     */
    getSummary(year: number, month?: number): DuesSummary {
        const currentMonth = month || new Date().getMonth() + 1;
        const amount = AppState.settings.monthlyDueAmount;
        let paidCount = 0;
        let unpaidCount = 0;

        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            if (AppState.dues[year]?.[apt]?.[currentMonth]) {
                paidCount++;
            } else {
                unpaidCount++;
            }
        }

        return {
            totalPaid: paidCount * amount,
            totalPending: unpaidCount * amount,
            paidCount,
            unpaidCount
        };
    },

    /**
     * Get yearly totals
     */
    getYearlyTotals(year: number): { paid: number; pending: number } {
        const amount = AppState.settings.monthlyDueAmount;
        let totalPaid = 0;
        let totalPending = 0;

        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            for (let month = 1; month <= 12; month++) {
                if (AppState.dues[year]?.[apt]?.[month]) {
                    totalPaid += amount;
                } else {
                    totalPending += amount;
                }
            }
        }

        return { paid: totalPaid, pending: totalPending };
    },

    /**
     * Update monthly due amount
     */
    async updateAmount(amount: number): Promise<void> {
        AppState.settings.monthlyDueAmount = amount;
        await FirebaseService.save(COLLECTIONS.SETTINGS, 'config', AppState.settings);
        toastSuccess('Aidat tutarı güncellendi');
    }
};

export default DuesService;
