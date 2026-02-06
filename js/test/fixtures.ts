/**
 * Test Fixtures
 * Factory functions for creating test data
 */

import type { 
  Apartment, 
  Transaction, 
  Decision, 
  Maintenance, 
  Task,
  DueRecord,
  Document,
  Notification
} from '../types.js';
import type { Bill, BillType } from '../features/bills/bills.types.js';
import type { AdminUser, ResidentUser } from '../features/auth/auth.types.js';

// =========================================
// ID Generators
// =========================================

let idCounter = 0;

export function generateId(): string {
  return `test-id-${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// =========================================
// Apartment Fixtures
// =========================================

export function createApartmentFixture(overrides?: Partial<Apartment>): Apartment {
  const id = generateId();
  const aptNumber = Math.floor(Math.random() * 12) + 1;
  
  return {
    id,
    apartmentNo: aptNumber,
    residentName: `Test Resident ${aptNumber}`,
    contactNumber: `+905551234${aptNumber.toString().padStart(2, '0')}`,
    email: `resident${aptNumber}@example.com`,
    residentCount: Math.floor(Math.random() * 4) + 1,
    isOwner: Math.random() > 0.5,
    moveInDate: '2024-01-01',
    balance: 0,
    ...overrides
  };
}

export function createApartmentsFixture(count: number = 12): Apartment[] {
  return Array.from({ length: count }, (_, i) => 
    createApartmentFixture({ apartmentNo: i + 1 })
  );
}

// =========================================
// Transaction Fixtures
// =========================================

export function createTransactionFixture(overrides?: Partial<Transaction>): Transaction {
  const isIncome = Math.random() > 0.5;
  
  return {
    id: generateId(),
    type: isIncome ? 'income' : 'expense',
    amount: Math.floor(Math.random() * 5000) + 100,
    description: `Test ${isIncome ? 'Income' : 'Expense'}`,
    date: new Date().toISOString().split('T')[0],
    category: isIncome ? 'aidat' : 'temizlik',
    createdBy: 'test-user',
    createdAt: new Date(),
    ...overrides
  };
}

export function createTransactionsFixture(count: number = 5): Transaction[] {
  return Array.from({ length: count }, () => createTransactionFixture());
}

// =========================================
// Bill Fixtures
// =========================================

export function createBillFixture(overrides?: Partial<Bill>): Bill {
  const types: BillType[] = ['elektrik', 'su', 'dogalgaz', 'other'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  return {
    id: generateId(),
    type,
    amount: Math.floor(Math.random() * 2000) + 100,
    month: Math.floor(Math.random() * 12) + 1,
    year: 2026,
    paid: Math.random() > 0.3,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ...overrides
  };
}

export function createBillsFixture(count: number = 5): Bill[] {
  return Array.from({ length: count }, () => createBillFixture());
}

// =========================================
// Decision Fixtures
// =========================================

export function createDecisionFixture(overrides?: Partial<Decision>): Decision {
  return {
    id: generateId(),
    title: `Test Decision ${generateId()}`,
    description: 'This is a test decision description',
    date: new Date().toISOString().split('T')[0],
    type: Math.random() > 0.7 ? 'urgent' : 'normal',
    ...overrides
  };
}

export function createDecisionsFixture(count: number = 5): Decision[] {
  return Array.from({ length: count }, () => createDecisionFixture());
}

// =========================================
// Maintenance Fixtures
// =========================================

export function createMaintenanceFixture(overrides?: Partial<Maintenance>): Maintenance {
  const statuses = ['pending', 'in-progress', 'completed'];
  const priorities = ['low', 'medium', 'high'];
  
  return {
    id: generateId(),
    title: `Test Maintenance ${generateId()}`,
    description: 'This is a test maintenance description',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: statuses[Math.floor(Math.random() * statuses.length)] as any,
    priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
    cost: Math.floor(Math.random() * 5000) + 100,
    ...overrides
  };
}

export function createMaintenancesFixture(count: number = 5): Maintenance[] {
  return Array.from({ length: count }, () => createMaintenanceFixture());
}

// =========================================
// Task Fixtures
// =========================================

export function createTaskFixture(overrides?: Partial<Task>): Task {
  const statuses = ['pending', 'in_progress', 'completed'];
  const priorities = ['low', 'medium', 'high'];
  
  return {
    id: generateId(),
    title: `Test Task ${generateId()}`,
    description: 'This is a test task description',
    assignedTo: `Person ${Math.floor(Math.random() * 5) + 1}`,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: statuses[Math.floor(Math.random() * statuses.length)] as any,
    priority: priorities[Math.floor(Math.random() * priorities.length)] as any,
    ...overrides
  };
}

export function createTasksFixture(count: number = 5): Task[] {
  return Array.from({ length: count }, () => createTaskFixture());
}

// =========================================
// Due Record Fixtures
// =========================================

export function createDueRecordFixture(overrides?: Partial<DueRecord>): DueRecord {
  return {
    id: generateId(),
    apartmentNo: Math.floor(Math.random() * 12) + 1,
    year: 2026,
    month: Math.floor(Math.random() * 12) + 1,
    paid: Math.random() > 0.3,
    paidDate: Math.random() > 0.3 ? new Date().toISOString().split('T')[0] : undefined,
    amount: 500,
    ...overrides
  };
}

// =========================================
// Document Fixtures
// =========================================

export function createDocumentFixture(overrides?: Partial<Document>): Document {
  const categories = ['financial', 'legal', 'maintenance', 'meeting', 'insurance', 'general', 'other'];
  const types = ['pdf', 'excel', 'word', 'image', 'other'];
  
  return {
    id: generateId(),
    title: `Test Document ${generateId()}`,
    description: 'This is a test document',
    fileName: `document-${generateId()}.pdf`,
    fileType: types[Math.floor(Math.random() * types.length)] as any,
    fileSize: Math.floor(Math.random() * 10000000),
    fileUrl: `https://storage.example.com/doc-${generateId()}.pdf`,
    category: categories[Math.floor(Math.random() * categories.length)] as any,
    uploadedBy: 'test-user',
    uploadedAt: new Date().toISOString(),
    isPublic: Math.random() > 0.5,
    allowedApartments: [],
    tags: ['test', 'document'],
    ...overrides
  };
}

// =========================================
// User Fixtures
// =========================================

export function createAdminUserFixture(overrides?: Partial<AdminUser>): AdminUser {
  return {
    role: 'admin',
    uid: generateId(),
    email: 'admin@example.com',
    isVerified: true,
    lastLoginAt: new Date().toISOString(),
    ...overrides
  };
}

export function createResidentUserFixture(overrides?: Partial<ResidentUser>): ResidentUser {
  return {
    role: 'resident',
    apartment: Math.floor(Math.random() * 12) + 1,
    loginAt: new Date().toISOString(),
    ...overrides
  };
}

// =========================================
// Dues Structure Fixture
// =========================================

export function createDuesStructure(year: number = 2026): Record<string, Record<number, boolean>> {
  const dues: Record<string, Record<number, boolean>> = {};
  
  for (let apt = 1; apt <= 12; apt++) {
    dues[apt] = {};
    for (let month = 1; month <= 12; month++) {
      dues[apt][month] = Math.random() > 0.5;
    }
  }
  
  return dues;
}

// =========================================
// DOM Helpers
// =========================================

export function createMockElement(tagName: string = 'div', attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

export function createMockInput(type: string = 'text', value: string = ''): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  return input;
}

export function createMockSelect(options: string[] = []): HTMLSelectElement {
  const select = document.createElement('select');
  options.forEach(optionText => {
    const option = document.createElement('option');
    option.value = optionText.toLowerCase();
    option.textContent = optionText;
    select.appendChild(option);
  });
  return select;
}

// =========================================
// Async Helpers
// =========================================

export function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function waitFor(callback: () => void, timeout: number = 1000): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      callback();
      return;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  throw new Error('waitFor timeout');
}

// =========================================
// Mock Response Helpers
// =========================================

export function createMockFirebaseDoc(data: any) {
  return {
    id: generateId(),
    data: () => data,
    exists: () => true
  };
}

export function createMockFirebaseQuerySnapshot(docs: any[]) {
  return {
    docs: docs.map(data => createMockFirebaseDoc(data)),
    empty: docs.length === 0,
    size: docs.length
  };
}
