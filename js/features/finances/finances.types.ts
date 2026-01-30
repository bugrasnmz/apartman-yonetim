/**
 * Finances Types - Financial transaction related type definitions
 */

export type TransactionType = 'income' | 'expense';

export type IncomeCategory = 'aidat' | 'kira' | 'diger_gelir';
export type ExpenseCategory = 'elektrik' | 'su' | 'dogalgaz' | 'temizlik' | 'bakim' | 'guvenlik' | 'sigorta' | 'diger_gider';
export type TransactionCategory = IncomeCategory | ExpenseCategory;

export interface Transaction {
    id?: string;
    type: TransactionType;
    amount: number;
    description?: string;
    date: string; // ISO date string
    category: TransactionCategory;
    createdBy?: string;
    createdAt?: string;
}

export interface FinanceSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

export interface MonthlyData {
    income: number[];
    expense: number[];
}

export interface CategoryBreakdown {
    [category: string]: number;
}

// Category labels for display
export const CATEGORY_ICONS: Record<string, string> = {
    aidat: '🏠',
    kira: '🔑',
    diger_gelir: '💵',
    elektrik: '⚡',
    su: '💧',
    dogalgaz: '🔥',
    temizlik: '🧹',
    bakim: '🔧',
    guvenlik: '🛡️',
    sigorta: '📋',
    diger_gider: '📦'
};
