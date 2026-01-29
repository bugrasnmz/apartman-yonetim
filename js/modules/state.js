/* =========================================
   State Module - Application State Management
   ========================================= */

// Global Application State
export const AppState = {
    currentUser: null,
    currentPage: 'login-page',
    currentSection: 'overview',
    currentYear: new Date().getFullYear(),
    currentTaskFilter: 'all',

    // Data
    bills: [],
    dues: {},
    transactions: [],
    maintenance: [],
    tasks: [],
    apartments: [],
    settings: { monthlyDueAmount: 500 },

    // Charts
    charts: {}
};

