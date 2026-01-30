/**
 * Dashboard Service - Overview and summary operations
 */

import { AppState } from '../../modules/state.js';
import { APP_CONFIG } from '../../firebase-config.js';
import { FinancesService } from '../finances/finances.service.js';
import { DuesService } from '../dues/dues.service.js';
import type { OverviewStats, MaintenancePreview } from './dashboard.types.js';

const TOTAL_APARTMENTS = APP_CONFIG.TOTAL_APARTMENTS;

/**
 * Dashboard Service - Aggregated data for dashboard views
 */
export const DashboardService = {
    /**
     * Get overview statistics for admin dashboard
     */
    getOverviewStats(): OverviewStats {
        const year = AppState.currentYear;
        const currentMonth = new Date().getMonth() + 1;

        const duesSummary = DuesService.getSummary(year, currentMonth);
        const balance = FinancesService.calculateBalance();

        return {
            totalApartments: TOTAL_APARTMENTS,
            paidDues: duesSummary.paidCount,
            unpaidDues: duesSummary.unpaidCount,
            totalBalance: balance
        };
    },

    /**
     * Get upcoming maintenance items
     */
    getUpcomingMaintenance(limit = 3): MaintenancePreview[] {
        const now = new Date().getTime();

        return AppState.maintenance
            .filter(m => m.status === 'pending' && new Date(m.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, limit)
            .map(m => ({
                id: m.id,
                title: m.title,
                date: m.date,
                status: m.status
            }));
    },

    /**
     * Get recent transactions for dashboard
     */
    getRecentTransactions(limit = 5): any[] {
        return [...AppState.transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
    },

    /**
     * Get recent decisions for dashboard
     */
    getRecentDecisions(limit = 3): any[] {
        return [...AppState.decisions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);
    },

    /**
     * Get resident dashboard data
     */
    getResidentDashboard(apartmentNo: number) {
        const apartment = AppState.apartments.find(a => a.apartmentNo === apartmentNo);
        const year = AppState.currentYear;

        // Calculate paid/unpaid dues for this apartment
        let paidMonths = 0;
        let unpaidMonths = 0;

        for (let month = 1; month <= 12; month++) {
            if (AppState.dues[year]?.[apartmentNo]?.[month]) {
                paidMonths++;
            } else {
                unpaidMonths++;
            }
        }

        const amount = AppState.settings.monthlyDueAmount;

        return {
            apartment,
            paidAmount: paidMonths * amount,
            unpaidAmount: unpaidMonths * amount,
            paidMonths,
            unpaidMonths,
            recentMaintenance: this.getUpcomingMaintenance(3),
            recentDecisions: this.getRecentDecisions(3)
        };
    }
};

export default DashboardService;
