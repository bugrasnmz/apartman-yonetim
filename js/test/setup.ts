/**
 * Vitest Test Setup
 * Global test configuration and utilities
 */

import { vi, afterEach } from 'vitest';

// =========================================
// Global Mocks
// =========================================

// Mock Firebase
vi.mock('../firebase-config.js', () => ({
  db: {},
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn()
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  storage: {},
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
  COLLECTIONS: {
    APARTMENTS: 'apartments',
    TRANSACTIONS: 'transactions',
    BILLS: 'bills',
    DECISIONS: 'decisions',
    MAINTENANCE: 'maintenance',
    TASKS: 'tasks',
    DUES: 'dues',
    SETTINGS: 'settings',
    DOCUMENTS: 'documents',
    ADMINS: 'admins',
    AUDIT_LOGS: 'audit_logs'
  },
  APP_CONFIG: {
    ADMIN_EMAIL: 'test@example.com',
    TOTAL_APARTMENTS: 12,
    SESSION_STORAGE_KEY: 'test_session',
    SECURITY: {
      enableAuditLogs: true,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 30
    }
  },
  CONFIG: {
    apartment: {
      totalUnits: 12,
      defaultDueAmount: 500
    },
    session: {
      storageKey: 'test_session',
      expiryHours: 24
    },
    ui: {
      toast: {
        defaultDuration: 3000,
        errorDuration: 5000
      }
    },
    date: {
      months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
    }
  },
  TOTAL_APARTMENTS: 12,
  MONTHS: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  logSecurityEvent: vi.fn(),
  verifyAdminRole: vi.fn(),
  getUserClaims: vi.fn()
}));

// Mock AppState
vi.mock('../modules/state.js', () => ({
  AppState: {
    currentUser: null,
    currentPage: 'login-page',
    currentSection: 'overview',
    currentYear: 2026,
    currentTaskFilter: 'all',
    bills: [],
    dues: {},
    transactions: [],
    maintenance: [],
    tasks: [],
    apartments: [],
    decisions: [],
    settings: { monthlyDueAmount: 500 },
    charts: {}
  }
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:5173',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock Chart.js
vi.mock('chart.js/auto', () => ({
  default: class Chart {
    constructor() {}
    destroy() {}
    update() {}
    static register() {}
  }
}));

// Mock emailjs
vi.mock('@emailjs/browser', () => ({
  default: {
    init: vi.fn(),
    send: vi.fn().mockResolvedValue({ status: 200 })
  }
}));

// =========================================
// Global Test Utilities
// =========================================

// Silence console during tests (optional)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   warn: vi.fn(),
//   error: vi.fn()
// };

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
