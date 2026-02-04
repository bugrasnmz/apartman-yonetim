/**
 * Dues Types - Monthly dues related type definitions
 */

export interface DueRecord {
    apartmentNo: number;
    month: number;
    year: number;
    paid: boolean;
    paidDate?: string;
}

export interface YearlyDues {
    [apartmentNo: number]: {
        [month: number]: boolean;
    };
}

export interface DuesState {
    [year: number]: YearlyDues;
}

export interface DuesCollectionData {
    collected: number[];
    total: number[];
    rate: number[];
}

export interface DuesSummary {
    totalPaid: number;
    totalPending: number;
    paidCount: number;
    unpaidCount: number;
}
