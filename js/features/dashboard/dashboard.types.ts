/**
 * Dashboard Types - Dashboard related type definitions
 */

export interface OverviewStats {
    totalApartments: number;
    paidDues: number;
    unpaidDues: number;
    totalBalance: number;
}

export interface MaintenancePreview {
    id: string;
    title: string;
    date: string;
    status: string;
}
