export interface Apartment {
    id?: string;
    apartmentNo: number;
    residentName: string;
    contactNumber: string;
    email?: string;
    residentCount: number;
    isOwner: boolean;
    moveInDate: string; // ISO date string
    balance: number;
}

export interface Transaction {
    id?: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string; // ISO date string
    category: string;
    createdBy?: string;
    createdAt?: any; // Firestore Timestamp
}

export interface Bill {
    id?: string;
    type: string; // 'electric', 'water', 'gas', 'internet', 'other'
    amount: number;
    month: string;
    year: number;
    paid: boolean;
    dueDate?: string;
}

export interface Decision {
    id?: string;
    title: string;
    description: string;
    date: string;
    type: 'normal' | 'urgent';
}

export interface AppConfig {
    apartment: {
        totalUnits: number;
        defaultDueAmount: number;
        dueDayOfMonth: number;
    };
    // ... add other config sections as needed
}

// Extend global Window interface
declare global {
    interface Window {
        db: any;
        Chart: any;
        emailjs: any;
    }

}
