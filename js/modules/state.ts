/* =========================================
   State Module - Application State Management
   ========================================= */

// Global Application State
export const AppState = {
    currentUser: null as any,
    currentPage: 'login-page',
    currentSection: 'overview',
    currentYear: new Date().getFullYear(),
    currentTaskFilter: 'all',

    // Data
    bills: [] as any[],
    dues: {} as any,
    transactions: [] as any[],
    maintenance: [] as any[],
    tasks: [] as any[],
    apartments: [] as any[],
    decisions: [] as any[],
    settings: { monthlyDueAmount: 500 } as any,

    // Charts
    charts: {} as any
};
