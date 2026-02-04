/**
 * Bills Types - Bill related type definitions
 */

export type BillType = 'elektrik' | 'su' | 'dogalgaz' | 'other';

export interface Bill {
    id?: string;
    type: BillType;
    amount: number;
    month: number;
    year: number;
    paid?: boolean;
    dueDate?: string;
    notes?: string;
    fileData?: string; // Base64 for small files
    fileType?: 'pdf' | 'image';
    createdAt?: string;
}

// Bill type icons
export const BILL_ICONS: Record<string, string> = {
    elektrik: '⚡',
    su: '💧',
    dogalgaz: '🔥',
    other: '📄'
};

// Bill type labels
export const BILL_LABELS: Record<string, string> = {
    elektrik: 'Elektrik Faturası',
    su: 'Su Faturası',
    dogalgaz: 'Doğalgaz Faturası',
    other: 'Diğer Fatura'
};
