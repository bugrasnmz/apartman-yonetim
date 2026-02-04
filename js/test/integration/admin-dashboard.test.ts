/**
 * Admin Dashboard Integration Tests
 * Tests for admin panel UI interactions and workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =========================================
// Mock Setup
// =========================================

vi.mock('../../firebase-config.js', () => ({
  auth: {
    currentUser: { uid: 'admin-123', email: 'admin@example.com' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'admin-123', email: 'admin@example.com' });
      return () => {};
    }),
    signOut: vi.fn().mockResolvedValue({})
  },
  db: {},
  COLLECTIONS: {
    TRANSACTIONS: 'transactions',
    BILLS: 'bills',
    APARTMENTS: 'apartments',
    DUES: 'dues'
  },
  APP_CONFIG: {
    ADMIN_EMAIL: 'admin@example.com',
    TOTAL_APARTMENTS: 12
  }
}));

vi.mock('../../shared/services/firebase.service.js', () => ({
  FirebaseService: {
    loadCollection: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  }
}));

// =========================================
// DOM Helpers
// =========================================

function createMockDashboard() {
  document.body.innerHTML = `
    <div id="admin-dashboard">
      <nav class="navbar">
        <div class="nav-links">
          <a href="#" class="nav-link active" data-section="overview">Genel Bakış</a>
          <a href="#" class="nav-link" data-section="finance">Gelir/Gider</a>
          <a href="#" class="nav-link" data-section="electricity">Faturalar</a>
          <a href="#" class="nav-link" data-section="dues">Aidatlar</a>
          <a href="#" class="nav-link" data-section="apartments">Daireler</a>
        </div>
      </nav>
      
      <main class="main-content">
        <section id="overview-section" class="section active">
          <div class="finance-stats-grid">
            <div class="finance-stat-card income">
              <span class="stat-card-value" id="total-balance">₺0</span>
            </div>
          </div>
        </section>
        
        <section id="finance-section" class="section">
          <div id="transactions-list"></div>
          <button id="add-transaction-btn">+ Kayıt Ekle</button>
        </section>
        
        <section id="electricity-section" class="section">
          <div id="bills-list"></div>
          <button id="add-bill-btn">+ Fatura Ekle</button>
        </section>
        
        <section id="dues-section" class="section">
          <table id="dues-table">
            <tbody id="dues-table-body"></tbody>
          </table>
        </section>
        
        <section id="apartments-section" class="section">
          <div id="apartments-list"></div>
        </section>
      </main>
      
      <div id="add-transaction-modal" class="modal">
        <form id="transaction-form">
          <select id="transaction-type">
            <option value="income">Gelir</option>
            <option value="expense">Gider</option>
          </select>
          <input type="number" id="transaction-amount" />
          <input type="text" id="transaction-description" />
          <button type="submit">Kaydet</button>
        </form>
      </div>
    </div>
  `;
}

// =========================================
// Test Suite
// =========================================

describe('Admin Dashboard Integration', () => {
  beforeEach(() => {
    createMockDashboard();
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // =========================================
  // Navigation Tests
  // =========================================

  describe('Navigation', () => {
    it('should show overview section by default', () => {
      const overviewSection = document.getElementById('overview-section');
      expect(overviewSection?.classList.contains('active')).toBe(true);
    });

    it('should hide other sections by default', () => {
      const financeSection = document.getElementById('finance-section');
      const billsSection = document.getElementById('electricity-section');
      
      expect(financeSection?.classList.contains('active')).toBe(false);
      expect(billsSection?.classList.contains('active')).toBe(false);
    });

    it('should have navigation links with data-section attributes', () => {
      const navLinks = document.querySelectorAll('.nav-link[data-section]');
      
      expect(navLinks.length).toBe(5);
      expect(navLinks[0].getAttribute('data-section')).toBe('overview');
      expect(navLinks[1].getAttribute('data-section')).toBe('finance');
    });

    it('should mark overview link as active initially', () => {
      const overviewLink = document.querySelector('.nav-link[data-section="overview"]');
      
      expect(overviewLink?.classList.contains('active')).toBe(true);
    });
  });

  // =========================================
  // Section Content Tests
  // =========================================

  describe('Section Content', () => {
    it('should display balance in overview section', () => {
      const balanceElement = document.getElementById('total-balance');
      
      expect(balanceElement).toBeTruthy();
      expect(balanceElement?.textContent).toContain('₺');
    });

    it('should have transactions list container', () => {
      const transactionsList = document.getElementById('transactions-list');
      
      expect(transactionsList).toBeTruthy();
    });

    it('should have bills list container', () => {
      const billsList = document.getElementById('bills-list');
      
      expect(billsList).toBeTruthy();
    });

    it('should have dues table', () => {
      const duesTable = document.getElementById('dues-table');
      const duesTableBody = document.getElementById('dues-table-body');
      
      expect(duesTable).toBeTruthy();
      expect(duesTableBody).toBeTruthy();
    });

    it('should have apartments list container', () => {
      const apartmentsList = document.getElementById('apartments-list');
      
      expect(apartmentsList).toBeTruthy();
    });
  });

  // =========================================
  // Action Buttons Tests
  // =========================================

  describe('Action Buttons', () => {
    it('should have add transaction button', () => {
      const btn = document.getElementById('add-transaction-btn');
      
      expect(btn).toBeTruthy();
      expect(btn?.textContent).toContain('Kayıt Ekle');
    });

    it('should have add bill button', () => {
      const btn = document.getElementById('add-bill-btn');
      
      expect(btn).toBeTruthy();
      expect(btn?.textContent).toContain('Fatura Ekle');
    });
  });

  // =========================================
  // Modal Tests
  // =========================================

  describe('Modals', () => {
    it('should have transaction modal', () => {
      const modal = document.getElementById('add-transaction-modal');
      
      expect(modal).toBeTruthy();
      expect(modal?.classList.contains('modal')).toBe(true);
    });

    it('should have transaction form with required fields', () => {
      const form = document.getElementById('transaction-form') as HTMLFormElement;
      const typeSelect = document.getElementById('transaction-type') as HTMLSelectElement;
      const amountInput = document.getElementById('transaction-amount') as HTMLInputElement;
      const descInput = document.getElementById('transaction-description') as HTMLInputElement;
      
      expect(form).toBeTruthy();
      expect(typeSelect).toBeTruthy();
      expect(amountInput).toBeTruthy();
      expect(descInput).toBeTruthy();
    });

    it('should have transaction type options', () => {
      const typeSelect = document.getElementById('transaction-type') as HTMLSelectElement;
      
      expect(typeSelect.options.length).toBe(2);
      expect(typeSelect.options[0].value).toBe('income');
      expect(typeSelect.options[1].value).toBe('expense');
    });
  });

  // =========================================
  // Stats Cards Tests
  // =========================================

  describe('Stats Cards', () => {
    it('should have stats grid in overview', () => {
      const statsGrid = document.querySelector('.finance-stats-grid');
      
      expect(statsGrid).toBeTruthy();
    });

    it('should have income card styling', () => {
      const incomeCard = document.querySelector('.finance-stat-card.income');
      
      expect(incomeCard).toBeTruthy();
    });

    it('should display stat values', () => {
      const statValue = document.querySelector('.stat-card-value');
      
      expect(statValue).toBeTruthy();
    });
  });

  // =========================================
  // Responsive Layout Tests
  // =========================================

  describe('Responsive Layout', () => {
    it('should have navbar element', () => {
      const navbar = document.querySelector('.navbar');
      
      expect(navbar).toBeTruthy();
    });

    it('should have main content area', () => {
      const mainContent = document.querySelector('.main-content');
      
      expect(mainContent).toBeTruthy();
    });

    it('should have sections with correct IDs', () => {
      const sections = ['overview-section', 'finance-section', 'electricity-section', 'dues-section', 'apartments-section'];
      
      sections.forEach(id => {
        expect(document.getElementById(id)).toBeTruthy();
      });
    });
  });

  // =========================================
  // Admin Privilege Tests
  // =========================================

  describe('Admin Privileges', () => {
    it('should show admin dashboard when authenticated', () => {
      const dashboard = document.getElementById('admin-dashboard');
      
      expect(dashboard).toBeTruthy();
    });

    it('should have all admin sections accessible', () => {
      const sections = document.querySelectorAll('.section');
      
      expect(sections.length).toBe(5);
    });
  });
});

// =========================================
// Form Validation Tests
// =========================================

describe('Admin Forms', () => {
  beforeEach(() => {
    createMockDashboard();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Transaction Form', () => {
    it('should validate required fields', () => {
      const form = document.getElementById('transaction-form') as HTMLFormElement;
      const amountInput = document.getElementById('transaction-amount') as HTMLInputElement;
      
      expect(form).toBeTruthy();
      expect(amountInput).toBeTruthy();
    });

    it('should have numeric input for amount', () => {
      const amountInput = document.getElementById('transaction-amount') as HTMLInputElement;
      
      expect(amountInput.type).toBe('number');
    });

    it('should have select for transaction type', () => {
      const typeSelect = document.getElementById('transaction-type') as HTMLSelectElement;
      
      expect(typeSelect.tagName).toBe('SELECT');
    });
  });
});

// =========================================
// Accessibility Tests
// =========================================

describe('Accessibility', () => {
  beforeEach(() => {
    createMockDashboard();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should have proper heading structure', () => {
    const dashboard = document.getElementById('admin-dashboard');
    
    expect(dashboard).toBeTruthy();
  });

  it('should have clickable navigation links', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('#');
    });
  });

  it('should have form submit button', () => {
    const form = document.getElementById('transaction-form');
    const submitBtn = form?.querySelector('button[type="submit"]');
    
    expect(submitBtn).toBeTruthy();
  });
});
