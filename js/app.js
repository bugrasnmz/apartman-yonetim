/* =========================================
   Apartman Yönetim Sistemi - JavaScript
   Phase 3: Firebase Integration
   ========================================= */

import {
    db, auth, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
    signInWithEmailAndPassword, signOut, onAuthStateChanged, COLLECTIONS
} from './firebase-config.js';

window.db = db; // Debug purposes


// ===== Constants =====
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const ADMIN_PASSWORD = 'Eb27092024';
const TOTAL_APARTMENTS = 12;

const CATEGORY_LABELS = {
    aidat: 'Aidat',
    kira: 'Kira Geliri',
    diger_gelir: 'Diğer Gelir',
    elektrik: 'Elektrik',
    su: 'Su',
    dogalgaz: 'Doğalgaz',
    temizlik: 'Temizlik',
    bakim: 'Bakım/Onarım',
    guvenlik: 'Güvenlik',
    sigorta: 'Sigorta',
    diger_gider: 'Diğer Gider'
};

const STATUS_LABELS = {
    pending: 'Bekliyor',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı'
};

const PRIORITY_LABELS = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek'
};

// ===== State Management =====
const AppState = {
    currentUser: null,
    currentPage: 'login-page',
    currentSection: 'overview',
    currentYear: new Date().getFullYear(),
    currentTaskFilter: 'all',

    // Data
    bills: [],
    dues: {},
    decisions: [],
    transactions: [],
    maintenance: [],
    tasks: [],
    apartments: [], // New Collection
    settings: { monthlyDueAmount: 500 },

    // Charts
    charts: {}
};

// ===== Firebase Data Service =====
// Replacing Local Storage with Firestore
const FirebaseService = {
    async loadCollection(colName) {
        try {
            const querySnapshot = await getDocs(collection(db, colName));
            if (querySnapshot.empty) return [];
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error(`Error loading ${colName}:`, e);
            throw e;
        }
    },

    // Wrapper to maintain similar API structure, but Async
    async save(colName, id, data) {
        try {
            await setDoc(doc(db, colName, id), data, { merge: true });
        } catch (e) {
            console.error(`Error saving to ${colName}:`, e);
            showToast('Kaydetme hatası!', 'error');
        }
    },

    async add(colName, data) {
        try {
            // Use setDoc if id is provided, else addDoc
            if (data.id) {
                await setDoc(doc(db, colName, data.id), data);
                return data.id;
            } else {
                const docRef = await addDoc(collection(db, colName), data);
                return docRef.id;
            }
        } catch (e) {
            console.error(`Error adding to ${colName}:`, e);
            throw e;
        }
    },

    async delete(colName, id) {
        try {
            await deleteDoc(doc(db, colName, id));
        } catch (e) {
            console.error(`Error deleting from ${colName}:`, e);
            showToast('Silme hatası!', 'error');
        }
    }
};

// Legacy Storage Adapter (for compatibility)
// We use this to persist local changes to Firestore asynchronously
const Storage = {
    save(key, data) {
        // 'data' here is usually the full array/object. 
        // For Firestore, we typically update individual items.
        // However, for parts of the app that rely on saving the *entire* state (like settings),
        // we can save to a single document or treat it differently.

        // Strategy: We won't use Storage.save for massive arrays anymore.
        // We will update individual items in the respective functions (addTransaction, etc).
        // Only 'settings' and 'dues' might need special handling.

        if (key === 'settings') {
            FirebaseService.save(COLLECTIONS.SETTINGS, 'config', data);
        } else if (key === 'dues') {
            // For dues, 'data' is the whole year structure.
            // We should save per year.
            const year = AppState.currentYear;
            if (data[year]) {
                FirebaseService.save(COLLECTIONS.DUES, year.toString(), data[year]);
            }
        }
    },
    load(key, defaultValue) { return defaultValue; }, // Deprecated for direct use
    remove(key) { }
};

// ===== Initialize Data =====
async function initializeData() {
    showToast('Veriler yükleniyor...', 'info');

    try {
        // Load in parallel
        const [
            bills, decisions, transactions, maintenance, tasks, settingsDoc, currentDuesDoc, apartments
        ] = await Promise.all([
            FirebaseService.loadCollection(COLLECTIONS.BILLS),
            FirebaseService.loadCollection(COLLECTIONS.DECISIONS),
            FirebaseService.loadCollection(COLLECTIONS.TRANSACTIONS),
            FirebaseService.loadCollection(COLLECTIONS.MAINTENANCE),
            FirebaseService.loadCollection(COLLECTIONS.TASKS),
            getDoc(doc(db, COLLECTIONS.SETTINGS, 'config')),
            getDoc(doc(db, COLLECTIONS.DUES, AppState.currentYear.toString())),
            FirebaseService.loadCollection(COLLECTIONS.APARTMENTS)
        ]);

        AppState.bills = bills;
        AppState.decisions = decisions;
        AppState.transactions = transactions;
        AppState.maintenance = maintenance;
        AppState.tasks = tasks;
        AppState.apartments = apartments;

        // Initialize settings if not exists
        if (settingsDoc.exists()) {
            AppState.settings = settingsDoc.data();
        } else {
            // Save default settings to Firebase
            AppState.settings = { monthlyDueAmount: 500 };
            await FirebaseService.save(COLLECTIONS.SETTINGS, 'config', AppState.settings);
        }

        // Initialize dues for current year
        AppState.dues = {};
        if (currentDuesDoc.exists()) {
            AppState.dues[AppState.currentYear] = currentDuesDoc.data();
        } else {
            // Initialize empty dues for current year and save to Firebase
            AppState.dues[AppState.currentYear] = {};
            for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
                AppState.dues[AppState.currentYear][apt] = {};
                for (let month = 1; month <= 12; month++) {
                    AppState.dues[AppState.currentYear][apt][month] = false;
                }
            }
            // Save initial dues to Firebase
            await FirebaseService.save(COLLECTIONS.DUES, AppState.currentYear.toString(), AppState.dues[AppState.currentYear]);
        }

        // Initialize missing apartments (ensure all 12 exist in Firebase)
        await initializeMissingApartments(apartments);

        refreshCurrentView();
        showToast('Veriler güncellendi', 'success');

    } catch (error) {
        console.error("Init Error:", error);
        showToast('Veri yükleme hatası: ' + error.message, 'error');
    }
}

// Initialize missing apartments in Firebase
async function initializeMissingApartments(existingApartments) {
    const existingNumbers = new Set(existingApartments.map(a => a.number));
    const missingApartments = [];

    for (let i = 1; i <= TOTAL_APARTMENTS; i++) {
        if (!existingNumbers.has(i)) {
            const aptData = {
                number: i,
                residentName: '',
                phone: '',
                status: 'empty',
                ownerName: '',
                residentCount: 0,
                moveInDate: '',
                createdAt: new Date().toISOString()
            };
            missingApartments.push(aptData);
        }
    }

    // Save missing apartments to Firebase in parallel
    if (missingApartments.length > 0) {
        console.log(`Initializing ${missingApartments.length} missing apartments...`);
        const savePromises = missingApartments.map(async (apt) => {
            const docId = `apt_${apt.number}`;
            apt.id = docId;
            await setDoc(doc(db, COLLECTIONS.APARTMENTS, docId), apt);
            return apt;
        });

        const savedApartments = await Promise.all(savePromises);
        AppState.apartments = [...existingApartments, ...savedApartments].sort((a, b) => a.number - b.number);
        console.log('All apartments initialized in Firebase');
    }
}

function refreshCurrentView() {
    if (AppState.currentPage) {
        showSection(AppState.currentSection);
    }
}

// ===== Page Navigation =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    AppState.currentPage = pageId;
}

function showSection(sectionId) {
    const dashboard = AppState.currentUser?.role === 'admin' ? 'admin-dashboard' : 'resident-dashboard';
    const container = document.getElementById(dashboard);

    container.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const section = document.getElementById(`${sectionId}-section`);
    if (section) section.classList.add('active');

    container.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) link.classList.add('active');
    });

    AppState.currentSection = sectionId;
    refreshSection(sectionId);
}

function refreshSection(sectionId) {
    switch (sectionId) {
        case 'overview': updateOverviewStats(); renderUpcomingMaintenance(); renderRecentDecisions(); break;
        case 'finance': renderTransactions(); updateFinanceSummary(); break;
        case 'electricity': renderBills(); break;
        case 'dues': renderDuesTable(); break;
        case 'maintenance': renderMaintenance(); break;
        case 'tasks': renderTasks(); break;
        case 'decisions': renderDecisions(); break;
        case 'apartments': renderApartments(); break;
        case 'resident-overview': updateResidentDashboard(); break;
        case 'resident-bills': renderResidentBills(); break;
        case 'resident-decisions': renderResidentDecisions(); break;
    }
}

// ===== Authentication =====
// ===== Authentication =====
async function loginAdmin(password) {
    // Hardcoded email for admin convenience
    const email = "admin@apartman.com";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        AppState.currentUser = { role: 'admin', uid: user.uid, email: user.email };

        showPage('admin-dashboard');
        await initializeData(); // Load data after successful login
        showSection('overview');
        showToast('Hoş geldiniz, Yönetici!', 'success');
        return true;
    } catch (error) {
        console.error("Login error:", error);
        showToast('Giriş başarısız! Parolayı kontrol edin.', 'error');
        return false;
    }
}

function loginResident(apartmentNumber) {
    if (apartmentNumber >= 1 && apartmentNumber <= TOTAL_APARTMENTS) {
        AppState.currentUser = { role: 'resident', apartment: apartmentNumber };
        localStorage.setItem('localResident', JSON.stringify(AppState.currentUser));
        document.getElementById('resident-apartment-badge').textContent = `Daire ${apartmentNumber}`;
        document.getElementById('resident-welcome-text').textContent = `Daire ${apartmentNumber} - Apartman bilgileri ve durumu`;
        showPage('resident-dashboard');
        showSection('resident-overview');
        showToast(`Hoş geldiniz, Daire ${apartmentNumber}!`, 'success');
        return true;
    }
    showToast('Geçersiz daire numarası!', 'error');
    return false;
}

async function logout() {
    try {
        await signOut(auth);
        localStorage.removeItem('localResident');
        AppState.currentUser = null;
        destroyAllCharts();
        showPage('login-page');
        showToast('Çıkış yapıldı', 'success');
    } catch (error) {
        console.error("Logout error", error);
    }
}

function checkAuth() {
    // Listen to Firebase Auth State (Async)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Admin is logged in
            AppState.currentUser = { role: 'admin', uid: user.uid, email: user.email };
            // If on login page, redirect
            if (AppState.currentPage === 'login-page') {
                showPage('admin-dashboard');
                showSection('overview');
            }
        }
        // If resident, it's client-side state, kept in memory (or re-login needed)
        // We can check if we have a resident set manually if we want persistence
        // For now, simpler to require re-selection for residents on refresh or use local storage for resident ID.
        else {
            const localResident = localStorage.getItem('localResident');
            if (localResident) {
                const residentData = JSON.parse(localResident);
                loginResident(residentData.apartment);
            }
        }
    });
}


// ===== Overview Stats =====
function updateOverviewStats() {
    const year = AppState.currentYear;
    const currentMonth = new Date().getMonth() + 1;
    let paidCount = 0, unpaidCount = 0;

    if (AppState.dues[year]) {
        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            if (AppState.dues[year][apt]?.[currentMonth]) paidCount++;
            else unpaidCount++;
        }
    } else { unpaidCount = TOTAL_APARTMENTS; }

    const balance = calculateBalance();

    document.getElementById('total-apartments').textContent = TOTAL_APARTMENTS;
    document.getElementById('paid-dues').textContent = paidCount;
    document.getElementById('unpaid-dues').textContent = unpaidCount;
    document.getElementById('total-balance').textContent = `₺${formatNumber(balance)}`;
}

function renderUpcomingMaintenance() {
    const container = document.getElementById('upcoming-maintenance');
    const upcoming = AppState.maintenance
        .filter(m => m.status === 'pending' && new Date(m.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">Yaklaşan bakım yok</p>';
        return;
    }

    container.innerHTML = upcoming.map(m => `
        <div class="recent-item">
            <h4>🔧 ${escapeHtml(m.title)}</h4>
            <p>${formatDate(m.date)}</p>
        </div>
    `).join('');
}

// ===== Financial Calculations =====
function calculateBalance() {
    const income = AppState.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = AppState.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return income - expense;
}

function getMonthlyData(year) {
    const data = { income: Array(12).fill(0), expense: Array(12).fill(0) };
    AppState.transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year) {
            const month = d.getMonth();
            if (t.type === 'income') data.income[month] += t.amount;
            else data.expense[month] += t.amount;
        }
    });
    return data;
}

function getCategoryBreakdown(type) {
    const breakdown = {};
    AppState.transactions.filter(t => t.type === type).forEach(t => {
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });
    return breakdown;
}

function getDuesCollectionData(year) {
    const data = { collected: Array(12).fill(0), total: Array(12).fill(0), rate: Array(12).fill(0) };
    const amount = AppState.settings.monthlyDueAmount;

    for (let month = 1; month <= 12; month++) {
        let paid = 0;
        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            if (AppState.dues[year]?.[apt]?.[month]) paid++;
        }
        data.collected[month - 1] = paid * amount;
        data.total[month - 1] = TOTAL_APARTMENTS * amount;
        data.rate[month - 1] = TOTAL_APARTMENTS > 0 ? Math.round((paid / TOTAL_APARTMENTS) * 100) : 0;
    }
    return data;
}

// ===== Transactions Management =====
function updateFinanceSummary() {
    const income = AppState.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = AppState.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    document.getElementById('admin-total-income').textContent = `₺${formatNumber(income)}`;
    document.getElementById('admin-total-expense').textContent = `₺${formatNumber(expense)}`;
    const balanceEl = document.getElementById('admin-net-balance');
    balanceEl.textContent = `₺${formatNumber(balance)}`;
    balanceEl.className = `summary-value ${balance >= 0 ? 'success' : 'warning'}`;
}

function renderTransactions() {
    const container = document.getElementById('transactions-list');
    const typeFilter = document.getElementById('transaction-type-filter').value;
    const yearFilter = parseInt(document.getElementById('transaction-year-filter').value);

    let filtered = AppState.transactions.filter(t => {
        const d = new Date(t.date);
        if (d.getFullYear() !== yearFilter) return false;
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Bu kriterlere uygun kayıt bulunamadı</p>';
        return;
    }

    // Category icons mapping
    const categoryIcons = {
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

    container.innerHTML = filtered.map(t => `
        <div class="transaction-card ${t.type}">
            <div class="transaction-icon">
                ${categoryIcons[t.category] || (t.type === 'income' ? '💰' : '💸')}
            </div>
            <div class="transaction-info">
                <div class="transaction-category">${CATEGORY_LABELS[t.category] || t.category}</div>
                <div class="transaction-description">${escapeHtml(t.description || '-')}</div>
            </div>
            <div class="transaction-meta">
                <div class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₺${formatNumber(t.amount)}</div>
                <div class="transaction-date">📅 ${formatDate(t.date)}</div>
            </div>
            <div class="transaction-actions">
                <button class="btn btn-secondary btn-sm" onclick="editTransaction('${t.id}')" title="Düzenle">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')" title="Sil">🗑️</button>
            </div>
        </div>
    `).join('');
}

function addTransaction(data) {
    const transaction = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.transactions.push(transaction); // Optimistic UI
    FirebaseService.add(COLLECTIONS.TRANSACTIONS, transaction);
    showToast('Kayıt eklendi', 'success');
    return transaction;
}

function updateTransaction(id, data) {
    const index = AppState.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        const updated = { ...AppState.transactions[index], ...data };
        AppState.transactions[index] = updated;
        FirebaseService.save(COLLECTIONS.TRANSACTIONS, id, updated);
        showToast('Kayıt güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteTransaction(id) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    AppState.transactions = AppState.transactions.filter(t => t.id !== id);
    FirebaseService.delete(COLLECTIONS.TRANSACTIONS, id);
    renderTransactions();
    updateFinanceSummary();
    showToast('Kayıt silindi', 'success');
}

function editTransaction(id) {
    const t = AppState.transactions.find(x => x.id === id);
    if (!t) return;
    document.getElementById('transaction-modal-title').textContent = 'Kayıt Düzenle';
    document.getElementById('transaction-id').value = t.id;
    document.getElementById('transaction-type').value = t.type;
    document.getElementById('transaction-category').value = t.category;
    document.getElementById('transaction-amount').value = t.amount;
    document.getElementById('transaction-date').value = t.date;
    document.getElementById('transaction-description').value = t.description || '';
    openModal('transaction-modal');
}

// ===== Maintenance Management =====
function renderMaintenance() {
    const container = document.getElementById('maintenance-list');
    if (AppState.maintenance.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz bakım kaydı eklenmemiş</p>';
        return;
    }

    const sorted = [...AppState.maintenance].sort((a, b) => new Date(a.date) - new Date(b.date));
    container.innerHTML = sorted.map(m => `
        <div class="maintenance-card">
            <div class="maintenance-icon">${m.status === 'completed' ? '✅' : '🔧'}</div>
            <div class="maintenance-info">
                <h4>${escapeHtml(m.title)}</h4>
                <p>${escapeHtml(m.description || '-')}</p>
                <span class="maintenance-date">📅 ${formatDate(m.date)}</span>
                <span class="status-badge-sm ${m.status}">${STATUS_LABELS[m.status]}</span>
            </div>
            <div class="maintenance-actions">
                <button class="btn btn-secondary btn-sm" onclick="editMaintenance('${m.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteMaintenance('${m.id}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function addMaintenance(data) {
    const m = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.maintenance.push(m);
    FirebaseService.add(COLLECTIONS.MAINTENANCE, m);
    showToast('Bakım kaydı eklendi', 'success');
    return m;
}

function updateMaintenance(id, data) {
    const index = AppState.maintenance.findIndex(m => m.id === id);
    if (index !== -1) {
        const updated = { ...AppState.maintenance[index], ...data };
        AppState.maintenance[index] = updated;
        FirebaseService.save(COLLECTIONS.MAINTENANCE, id, updated);
        showToast('Bakım kaydı güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteMaintenance(id) {
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz?')) return;
    AppState.maintenance = AppState.maintenance.filter(m => m.id !== id);
    FirebaseService.delete(COLLECTIONS.MAINTENANCE, id);
    renderMaintenance();
    showToast('Bakım kaydı silindi', 'success');
}

function editMaintenance(id) {
    const m = AppState.maintenance.find(x => x.id === id);
    if (!m) return;
    document.getElementById('maintenance-modal-title').textContent = 'Bakım Düzenle';
    document.getElementById('maintenance-id').value = m.id;
    document.getElementById('maintenance-title').value = m.title;
    document.getElementById('maintenance-date').value = m.date;
    document.getElementById('maintenance-description').value = m.description || '';
    document.getElementById('maintenance-status').value = m.status;
    openModal('maintenance-modal');
}

// ===== Tasks Management =====
function renderTasks() {
    const container = document.getElementById('tasks-list');
    let filtered = AppState.tasks;

    if (AppState.currentTaskFilter !== 'all') {
        filtered = filtered.filter(t => t.status === AppState.currentTaskFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Bu filtreye uygun iş bulunamadı</p>';
        return;
    }

    const sorted = [...filtered].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const statusIcons = { pending: '⏳', in_progress: '🔄', completed: '✅' };

    container.innerHTML = sorted.map(t => `
        <div class="task-card">
            <div class="task-status-icon ${t.status}">${statusIcons[t.status]}</div>
            <div class="task-info">
                <h4>${escapeHtml(t.title)} <span class="priority-badge ${t.priority}">${PRIORITY_LABELS[t.priority]}</span></h4>
                <p>${escapeHtml(t.description)}</p>
            </div>
            <div class="task-meta">
                <span class="status-badge-sm ${t.status}">${STATUS_LABELS[t.status]}</span>
                <div class="task-actions">
                    ${t.detail ? `<button class="btn btn-secondary btn-sm" onclick="viewTaskDetail('${t.id}')">👁</button>` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="editTask('${t.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">🗑</button>
                </div>
            </div>
        </div>
    `).join('');
}

function addTask(data) {
    const task = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.tasks.push(task);
    FirebaseService.add(COLLECTIONS.TASKS, task);
    showToast('İş kaydı eklendi', 'success');
    return task;
}

function updateTask(id, data) {
    const index = AppState.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        const updated = { ...AppState.tasks[index], ...data };
        AppState.tasks[index] = updated;
        FirebaseService.save(COLLECTIONS.TASKS, id, updated);
        showToast('İş kaydı güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteTask(id) {
    if (!confirm('Bu iş kaydını silmek istediğinizden emin misiniz?')) return;
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    FirebaseService.delete(COLLECTIONS.TASKS, id);
    renderTasks();
    showToast('İş kaydı silindi', 'success');
}

function editTask(id) {
    const t = AppState.tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('task-modal-title').textContent = 'İş Düzenle';
    document.getElementById('task-id').value = t.id;
    document.getElementById('task-title').value = t.title;
    document.getElementById('task-description').value = t.description;
    document.getElementById('task-detail').value = t.detail || '';
    document.getElementById('task-status').value = t.status;
    document.getElementById('task-priority').value = t.priority;
    openModal('task-modal');
}

function viewTaskDetail(id) {
    const t = AppState.tasks.find(x => x.id === id);
    if (!t) return;

    const content = document.getElementById('task-detail-content');
    content.innerHTML = `
        <div class="task-detail-header">
            <h4>${escapeHtml(t.title)}</h4>
            <div class="task-detail-badges">
                <span class="status-badge-sm ${t.status}">${STATUS_LABELS[t.status]}</span>
                <span class="priority-badge ${t.priority}">${PRIORITY_LABELS[t.priority]}</span>
            </div>
        </div>
        <div class="task-detail-content">
            <h5>Açıklama</h5>
            <p>${escapeHtml(t.description)}</p>
        </div>
        ${t.detail ? `
            <div class="task-detail-content">
                <h5>Detaylı Bilgi</h5>
                <p>${escapeHtml(t.detail)}</p>
            </div>
        ` : ''}
    `;
    openModal('task-detail-modal');
}

// ===== Bills Management =====
function renderBills() {
    const container = document.getElementById('bills-list');
    const yearFilter = document.getElementById('bill-year-filter').value;
    const filtered = AppState.bills.filter(b => b.year == yearFilter).sort((a, b) => b.month - a.month);

    if (filtered.length === 0) {
        container.innerHTML = '<p class="empty-state">Bu yıla ait fatura bulunamadı</p>';
        return;
    }

    // Bill type icons
    const billIcons = {
        elektrik: '⚡',
        su: '💧',
        dogalgaz: '🔥',
        default: '📄'
    };

    const billLabels = {
        elektrik: 'Elektrik Faturası',
        su: 'Su Faturası',
        dogalgaz: 'Doğalgaz Faturası',
        default: 'Fatura'
    };

    container.innerHTML = filtered.map(bill => `
        <div class="transaction-card expense">
            <div class="transaction-icon">
                ${billIcons[bill.type] || billIcons.default}
            </div>
            <div class="transaction-info">
                <div class="transaction-category">${billLabels[bill.type] || billLabels.default}</div>
                <div class="transaction-description">${bill.notes ? escapeHtml(bill.notes) : `${MONTHS[bill.month - 1]} ${bill.year}`}</div>
            </div>
            <div class="transaction-meta">
                <div class="transaction-amount expense">₺${formatNumber(bill.amount)}</div>
                <div class="transaction-date">📅 ${MONTHS[bill.month - 1]} ${bill.year}</div>
            </div>
            <div class="transaction-actions">
                ${bill.fileData ? `<button class="btn btn-secondary btn-sm" onclick="viewBill('${bill.id}')" title="Görüntüle">👁️</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="editBill('${bill.id}')" title="Düzenle">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBill('${bill.id}')" title="Sil">🗑️</button>
            </div>
        </div>
    `).join('');
}

function renderResidentBills() {
    const container = document.getElementById('resident-bills-list');
    if (AppState.bills.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz fatura eklenmemiş</p>';
        return;
    }
    const sorted = [...AppState.bills].sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
    container.innerHTML = sorted.map(bill => `
        <div class="bill-card glass-card">
            <div class="bill-header">
                <span class="bill-month">${MONTHS[bill.month - 1]}</span>
                <span class="bill-year">${bill.year}</span>
            </div>
            <div class="bill-amount">₺${formatNumber(bill.amount)}</div>
            ${bill.fileData ? `<div class="bill-actions"><button class="btn btn-secondary btn-sm btn-full" onclick="viewBill('${bill.id}')">👁 Görüntüle</button></div>` : ''}
        </div>
    `).join('');
}

function addBill(data) {
    const bill = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.bills.push(bill);
    FirebaseService.add(COLLECTIONS.BILLS, bill);
    showToast('Fatura eklendi', 'success');
    return bill;
}

function updateBill(id, data) {
    const index = AppState.bills.findIndex(b => b.id === id);
    if (index !== -1) {
        const updated = { ...AppState.bills[index], ...data };
        AppState.bills[index] = updated;
        FirebaseService.save(COLLECTIONS.BILLS, id, updated);
        showToast('Fatura güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteBill(id) {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return;
    AppState.bills = AppState.bills.filter(b => b.id !== id);
    FirebaseService.delete(COLLECTIONS.BILLS, id);
    renderBills();
    showToast('Fatura silindi', 'success');
}

function editBill(id) {
    const bill = AppState.bills.find(b => b.id === id);
    if (!bill) return;
    document.getElementById('bill-modal-title').textContent = 'Fatura Düzenle';
    document.getElementById('bill-id').value = bill.id;
    document.getElementById('bill-type').value = bill.type || 'elektrik';
    document.getElementById('bill-month').value = bill.month;
    document.getElementById('bill-year').value = bill.year;
    document.getElementById('bill-amount').value = bill.amount;
    document.getElementById('bill-notes').value = bill.notes || '';
    openModal('bill-modal');
}

function viewBill(id) {
    const bill = AppState.bills.find(b => b.id === id);
    if (!bill || !bill.fileData) return;
    const viewer = document.getElementById('bill-viewer');
    viewer.innerHTML = `
        <div class="bill-info">
            <p><strong>Dönem:</strong> ${MONTHS[bill.month - 1]} ${bill.year}</p>
            <p><strong>Tutar:</strong> ₺${formatNumber(bill.amount)}</p>
        </div>
        ${bill.fileType === 'pdf' ? `<iframe src="${bill.fileData}" title="Fatura"></iframe>` : `<img src="${bill.fileData}" alt="Fatura" />`}
    `;
    openModal('view-bill-modal');
}

// ===== Dues Management =====
function renderDuesTable() {
    const tbody = document.getElementById('dues-table-body');
    const year = document.getElementById('dues-year-select').value;
    const amount = AppState.settings.monthlyDueAmount;
    document.getElementById('monthly-due-amount').value = amount;

    if (!AppState.dues[year]) {
        AppState.dues[year] = {};
        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            AppState.dues[year][apt] = {};
            for (let month = 1; month <= 12; month++) AppState.dues[year][apt][month] = false;
        }
    }

    let totalPaid = 0, totalPending = 0;
    let html = '';
    for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
        html += `<tr><td>Daire ${apt}</td>`;
        for (let month = 1; month <= 12; month++) {
            const isPaid = AppState.dues[year]?.[apt]?.[month] || false;
            if (isPaid) totalPaid += amount; else totalPending += amount;
            html += `<td><button class="due-toggle ${isPaid ? 'paid' : 'unpaid'}" onclick="toggleDue(${year}, ${apt}, ${month})">${isPaid ? '✓' : '✗'}</button></td>`;
        }
        html += '</tr>';
    }
    tbody.innerHTML = html;
    document.getElementById('total-collected').textContent = `₺${formatNumber(totalPaid)}`;
    document.getElementById('total-pending').textContent = `₺${formatNumber(totalPending)}`;
}

async function toggleDue(year, apartment, month) {
    if (!AppState.dues[year]) AppState.dues[year] = {};
    if (!AppState.dues[year][apartment]) AppState.dues[year][apartment] = {};

    const wasPaid = AppState.dues[year][apartment][month];
    AppState.dues[year][apartment][month] = !wasPaid;
    const isNowPaid = AppState.dues[year][apartment][month];

    // Save dues to Firebase
    try {
        await FirebaseService.save(COLLECTIONS.DUES, year.toString(), AppState.dues[year]);
    } catch (error) {
        console.error('Error saving dues:', error);
    }

    // Sync with transactions - update monthly aidat income record
    await syncAidatTransaction(year, month);

    renderDuesTable();
    showToast(`Daire ${apartment} - ${MONTHS[month - 1]} ${isNowPaid ? 'ödendi' : 'ödenmedi'}`, 'success');
}

// Sync aidat payments with transactions table
async function syncAidatTransaction(year, month) {
    const monthlyDue = AppState.settings.monthlyDueAmount || 0;

    // Count how many apartments paid for this month
    let paidCount = 0;
    for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
        if (AppState.dues[year] && AppState.dues[year][apt] && AppState.dues[year][apt][month]) {
            paidCount++;
        }
    }

    const totalAmount = paidCount * monthlyDue;
    const monthName = MONTHS[month - 1];
    const transactionId = `aidat_${year}_${month}`; // Unique ID per year/month
    const transactionDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // Check if transaction already exists
    const existingTransaction = AppState.transactions.find(t => t.id === transactionId);

    if (totalAmount > 0) {
        // Create or update transaction
        const transactionData = {
            id: transactionId,
            type: 'income',
            category: 'aidat',
            amount: totalAmount,
            date: transactionDate,
            description: `${monthName} ${year} Aidat Gelirleri (${paidCount} daire)`,
            isAutoGenerated: true, // Mark as auto-generated
            createdAt: existingTransaction ? existingTransaction.createdAt : new Date().toISOString()
        };

        if (existingTransaction) {
            // Update existing
            const index = AppState.transactions.findIndex(t => t.id === transactionId);
            AppState.transactions[index] = transactionData;
            await FirebaseService.save(COLLECTIONS.TRANSACTIONS, transactionId, transactionData);
        } else {
            // Create new
            AppState.transactions.push(transactionData);
            await FirebaseService.save(COLLECTIONS.TRANSACTIONS, transactionId, transactionData);
        }
    } else {
        // No payments for this month - remove transaction if exists
        if (existingTransaction) {
            AppState.transactions = AppState.transactions.filter(t => t.id !== transactionId);
            await FirebaseService.delete(COLLECTIONS.TRANSACTIONS, transactionId);
        }
    }

    // Refresh finance view if visible
    if (document.getElementById('finance-section')?.classList.contains('active')) {
        renderTransactions();
        updateFinanceSummary();
    }
}

async function updateMonthlyDueAmount() {
    AppState.settings.monthlyDueAmount = parseInt(document.getElementById('monthly-due-amount').value) || 0;

    // Save directly to Firebase
    try {
        await FirebaseService.save(COLLECTIONS.SETTINGS, 'config', AppState.settings);
    } catch (error) {
        console.error('Error saving settings:', error);
    }

    renderDuesTable();
}

// ===== Decisions Management =====
function renderDecisions() {
    const container = document.getElementById('decisions-list');
    if (AppState.decisions.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz karar eklenmemiş</p>';
        return;
    }
    const sorted = [...AppState.decisions].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(d => `
        <div class="decision-card glass-card">
            <div class="decision-header">
                <h3 class="decision-title">${escapeHtml(d.title)}</h3>
                <span class="decision-date">📅 ${formatDate(d.date)}</span>
            </div>
            <p class="decision-content">${escapeHtml(d.content)}</p>
            <div class="decision-actions">
                <button class="btn btn-secondary btn-sm" onclick="editDecision('${d.id}')">✏️ Düzenle</button>
                <button class="btn btn-danger btn-sm" onclick="deleteDecision('${d.id}')">🗑 Sil</button>
            </div>
        </div>
    `).join('');
}

function renderRecentDecisions() {
    const container = document.getElementById('recent-decisions');
    const recent = [...AppState.decisions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz karar eklenmemiş</p>';
        return;
    }
    container.innerHTML = recent.map(d => `<div class="recent-item"><h4>📋 ${escapeHtml(d.title)}</h4><p>${formatDate(d.date)}</p></div>`).join('');
}

function renderResidentDecisions() {
    const container = document.getElementById('resident-decisions-list');
    if (AppState.decisions.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz karar eklenmemiş</p>';
        return;
    }
    const sorted = [...AppState.decisions].sort((a, b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = sorted.map(d => `
        <div class="decision-card glass-card">
            <div class="decision-header">
                <h3 class="decision-title">${escapeHtml(d.title)}</h3>
                <span class="decision-date">📅 ${formatDate(d.date)}</span>
            </div>
            <p class="decision-content">${escapeHtml(d.content)}</p>
        </div>
    `).join('');
}

function addDecision(data) {
    const decision = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.decisions.push(decision);
    FirebaseService.add(COLLECTIONS.DECISIONS, decision);
    showToast('Karar eklendi', 'success');
    return decision;
}

function updateDecision(id, data) {
    const index = AppState.decisions.findIndex(d => d.id === id);
    if (index !== -1) {
        const updated = { ...AppState.decisions[index], ...data };
        AppState.decisions[index] = updated;
        FirebaseService.save(COLLECTIONS.DECISIONS, id, updated);
        showToast('Karar güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteDecision(id) {
    if (!confirm('Bu kararı silmek istediğinizden emin misiniz?')) return;
    AppState.decisions = AppState.decisions.filter(d => d.id !== id);
    FirebaseService.delete(COLLECTIONS.DECISIONS, id);
    renderDecisions();
    showToast('Karar silindi', 'success');
}

function editDecision(id) {
    const d = AppState.decisions.find(x => x.id === id);
    if (!d) return;
    document.getElementById('decision-modal-title').textContent = 'Karar Düzenle';
    document.getElementById('decision-id').value = d.id;
    document.getElementById('decision-title').value = d.title;
    document.getElementById('decision-date').value = d.date;
    document.getElementById('decision-content').value = d.content;
    openModal('decision-modal');
}

// ===== Apartments Management (NEW) =====
function renderApartments() {
    const container = document.getElementById('apartments-list');

    // Sort apartments by number
    const apartments = (AppState.apartments || []).sort((a, b) => a.number - b.number);

    // If empty and not initialized, we could show placeholder or initialize 12 apts
    // But assuming we migrate data or start fresh, let's show cards for 1-12

    let html = '';

    // Create map for easy lookup
    const aptMap = {};
    apartments.forEach(a => aptMap[a.number] = a);

    for (let i = 1; i <= TOTAL_APARTMENTS; i++) {
        const apt = aptMap[i] || { number: i, residentName: '-', status: 'empty' };

        const statusClass = { 'owner': 'success', 'tenant': 'warning', 'empty': 'secondary' };
        const statusLabel = { 'owner': 'Ev Sahibi', 'tenant': 'Kiracı', 'empty': 'Boş' };

        html += `
        <div class="apartment-card glass-card">
            <div class="apt-header">
                <div class="apt-number">No: ${apt.number}</div>
                <div class="apt-status badge ${statusClass[apt.status] || 'secondary'}">${statusLabel[apt.status] || apt.status}</div>
            </div>
            <div class="apt-details">
                <p><strong>Sakin:</strong> ${escapeHtml(apt.residentName || '-')}</p>
                <p><strong>Telefon:</strong> ${escapeHtml(apt.phone || '-')}</p>
                <p><strong>Kişi:</strong> ${apt.residentCount || 0}</p>
            </div>
            <div class="apt-actions">
                <button class="btn btn-secondary btn-sm btn-full" onclick="editApartment('${apt.id || i}')">Düzenle</button>
            </div>
        </div>
        `;
    }

    container.innerHTML = html;
}

function editApartment(id) {
    // If id is numeric (1-12), it's virtual. If string, it's document id?
    // Let's rely on apartment number conceptually.
    // If we passed ID, find by ID. If ID is number, find by number.

    let apt;
    if (AppState.apartments) {
        apt = AppState.apartments.find(a => a.id === id || a.number == id);
    }

    if (!apt && !isNaN(id)) {
        // Virtual apartment
        apt = { number: parseInt(id), residentName: '', phone: '', status: 'empty', ownerName: '', residentCount: 0 };
    }

    document.getElementById('apartment-modal-title').textContent = `Daire ${apt.number} Düzenle`;
    document.getElementById('apartment-id').value = apt.id || apt.number; // Store ID or Number if new
    document.getElementById('apartment-resident').value = apt.residentName || '';
    document.getElementById('apartment-status').value = apt.status || 'empty';
    document.getElementById('apartment-owner').value = apt.ownerName || '';
    document.getElementById('apartment-phone').value = apt.phone || '';
    document.getElementById('apartment-count').value = apt.residentCount || 0;
    document.getElementById('apartment-move-in').value = apt.moveInDate || '';

    // Store number distinctly if it's a new record
    document.getElementById('apartment-form').dataset.aptNumber = apt.number;

    openModal('apartment-modal');
}

async function saveApartment(data) {
    const number = parseInt(document.getElementById('apartment-form').dataset.aptNumber);

    // Check if exists
    let existing = (AppState.apartments || []).find(a => a.number === number);

    // If exists, use its ID. If not, create new.
    // ID from hidden field might be "7" (just number) or "firebase_doc_id"
    // If existing found, prefer existing.id

    const id = existing ? existing.id : null;

    const aptData = { ...data, number };

    if (id) {
        // Update
        const index = AppState.apartments.findIndex(a => a.id === id);
        AppState.apartments[index] = { ...AppState.apartments[index], ...aptData };
        await FirebaseService.save(COLLECTIONS.APARTMENTS, id, aptData);
    } else {
        // Add
        // Use custom ID "apt_1" for cleaner DB or auto ID. Auto ID is fine.
        const newId = await FirebaseService.add(COLLECTIONS.APARTMENTS, aptData);
        aptData.id = newId;
        if (!AppState.apartments) AppState.apartments = [];
        AppState.apartments.push(aptData);
    }

    renderApartments();
    showToast('Daire bilgileri güncellendi', 'success');
}

// ===== Migration Utility =====
async function migrateData() {
    if (!confirm("Mevcut tarayıcı verileri Firebase'e aklatılacak. Emin misiniz?")) return;

    showToast('Veriler aktarılıyor...', 'info');

    try {
        // 1. Transactions
        const transactions = JSON.parse(localStorage.getItem('apt_transactions') || '[]');
        for (const t of transactions) {
            await FirebaseService.save(COLLECTIONS.TRANSACTIONS, t.id, t);
        }

        // 2. Bills
        const bills = JSON.parse(localStorage.getItem('apt_bills') || '[]');
        for (const b of bills) {
            await FirebaseService.save(COLLECTIONS.BILLS, b.id, b);
        }

        // 3. Decisions
        const decisions = JSON.parse(localStorage.getItem('apt_decisions') || '[]');
        for (const d of decisions) {
            await FirebaseService.save(COLLECTIONS.DECISIONS, d.id, d);
        }

        // 4. Maintenance
        const maintenance = JSON.parse(localStorage.getItem('apt_maintenance') || '[]');
        for (const m of maintenance) {
            await FirebaseService.save(COLLECTIONS.MAINTENANCE, m.id, m);
        }

        // 5. Tasks
        const tasks = JSON.parse(localStorage.getItem('apt_tasks') || '[]');
        for (const t of tasks) {
            await FirebaseService.save(COLLECTIONS.TASKS, t.id, t);
        }

        showToast('Aktarım tamamlandı! Sayfa yenileniyor...', 'success');
        setTimeout(() => location.reload(), 1500);

    } catch (e) {
        console.error("Migration failed", e);
        showToast('Aktarım sırasında hata oluştu', 'error');
    }
}

// ===== Resident Dashboard =====
// ===== Resident Overview - Enhanced Dashboard (Updates)
function updateResidentDashboard() {
    const apt = AppState.currentUser?.apartment;
    if (!apt) return;

    // --- Update Welcome Text with Data from DB if available ---
    let welcomeText = `Daire ${apt} - Apartman bilgileri ve durumu`;
    if (AppState.apartments) {
        const aptData = AppState.apartments.find(a => a.number === apt);
        if (aptData && aptData.residentName) {
            welcomeText = `Sn. ${aptData.residentName} (Daire ${apt})`;
        }
    }
    document.getElementById('resident-welcome-text').textContent = welcomeText;
    // -----------------------------------------------------

    const year = AppState.currentYear;
    const currentMonth = new Date().getMonth() + 1;
    const isPaidThisMonth = AppState.dues[year]?.[apt]?.[currentMonth] || false;

    document.getElementById('resident-due-status').innerHTML = isPaidThisMonth
        ? '<span class="status-badge paid">Bu Ay Ödendi ✓</span>'
        : '<span class="status-badge unpaid">Bu Ay Ödenmedi ✗</span>';

    document.getElementById('resident-year').textContent = year;

    const grid = document.getElementById('resident-dues-grid');
    let html = '';
    for (let month = 1; month <= 12; month++) {
        const isPaid = AppState.dues[year]?.[apt]?.[month] || false;
        html += `<div class="month-status ${isPaid ? 'paid' : 'unpaid'}"><div class="month-name">${MONTHS_SHORT[month - 1]}</div><div class="month-icon">${isPaid ? '✓' : '✗'}</div></div>`;
    }
    grid.innerHTML = html;

    renderResidentMaintenance();
    renderResidentTasks();
    renderResidentRecentDecisions();
    initResidentCharts();
}

function renderResidentMaintenance() {
    const container = document.getElementById('resident-maintenance-list');
    const upcoming = AppState.maintenance.filter(m => m.status === 'pending').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">Yaklaşan bakım yok</p>';
        return;
    }
    container.innerHTML = upcoming.map(m => `
        <div class="compact-item">
            <h4>🔧 ${escapeHtml(m.title)}</h4>
            <p>${formatDate(m.date)}</p>
        </div>
    `).join('');
}

function renderResidentTasks() {
    const container = document.getElementById('resident-tasks-list');
    const active = AppState.tasks.filter(t => t.status !== 'completed').slice(0, 5);
    if (active.length === 0) {
        container.innerHTML = '<p class="empty-state">Aktif iş yok</p>';
        return;
    }
    const statusIcons = { pending: '⏳', in_progress: '🔄' };
    container.innerHTML = active.map(t => `
        <div class="compact-item" onclick="viewTaskDetail('${t.id}')">
            <h4>${statusIcons[t.status] || '📋'} ${escapeHtml(t.title)}</h4>
            <p>${escapeHtml(t.description)}</p>
        </div>
    `).join('');
}

function renderResidentRecentDecisions() {
    const container = document.getElementById('resident-recent-decisions');
    const recent = [...AppState.decisions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (recent.length === 0) {
        container.innerHTML = '<p class="empty-state">Henüz karar eklenmemiş</p>';
        return;
    }
    container.innerHTML = recent.map(d => `
        <div class="compact-item">
            <h4>📝 ${escapeHtml(d.title)}</h4>
            <p>${formatDate(d.date)}</p>
        </div>
    `).join('');
}

// ===== Charts =====
function destroyAllCharts() {
    Object.values(AppState.charts).forEach(chart => { if (chart) chart.destroy(); });
    AppState.charts = {};
}

function initResidentCharts() {
    destroyAllCharts();
    setTimeout(() => {
        initDuesCollectionChart();
        initFinancialStatusChart();
        initIncomePieChart();
        initExpensePieChart();
    }, 100);
}

function initDuesCollectionChart() {
    const ctx = document.getElementById('dues-collection-chart');
    if (!ctx) return;

    const data = getDuesCollectionData(AppState.currentYear);

    AppState.charts.duesCollection = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: MONTHS_SHORT,
            datasets: [{
                label: 'Tahsilat Oranı (%)',
                data: data.rate,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: 'rgba(255,255,255,0.7)', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } }
            }
        }
    });
}

function initFinancialStatusChart() {
    const ctx = document.getElementById('financial-status-chart');
    if (!ctx) return;

    const data = getMonthlyData(AppState.currentYear);
    const balance = calculateBalance();

    document.getElementById('current-balance').textContent = `₺${formatNumber(balance)}`;
    document.getElementById('current-balance').className = `balance-value ${balance < 0 ? 'negative' : ''}`;

    AppState.charts.financialStatus = new Chart(ctx, {
        type: 'line',
        data: {
            labels: MONTHS_SHORT,
            datasets: [
                { label: 'Gelir', data: data.income, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.4 },
                { label: 'Gider', data: data.expense, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)' } } },
            scales: {
                y: { beginAtZero: true, ticks: { color: 'rgba(255,255,255,0.7)', callback: v => '₺' + v }, grid: { color: 'rgba(255,255,255,0.1)' } },
                x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } }
            }
        }
    });
}

function initIncomePieChart() {
    const ctx = document.getElementById('income-pie-chart');
    if (!ctx) return;

    const container = ctx.parentElement;
    const breakdown = getCategoryBreakdown('income');
    const labels = Object.keys(breakdown).map(k => CATEGORY_LABELS[k] || k);
    const values = Object.values(breakdown);

    // Destroy existing chart if any
    if (AppState.charts.incomePie) {
        AppState.charts.incomePie.destroy();
        AppState.charts.incomePie = null;
    }

    if (values.length === 0) {
        ctx.style.display = 'none';
        let emptyMsg = container.querySelector('.chart-empty-state');
        if (!emptyMsg) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-state chart-empty-state';
            emptyMsg.textContent = 'Gelir verisi yok';
            container.appendChild(emptyMsg);
        }
        return;
    }

    // Remove empty message if exists and show canvas
    const emptyMsg = container.querySelector('.chart-empty-state');
    if (emptyMsg) emptyMsg.remove();
    ctx.style.display = 'block';

    AppState.charts.incomePie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: ['#22c55e', '#14b8a6', '#10b981', '#059669'], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', padding: 15 } } }
        }
    });
}

function initExpensePieChart() {
    const ctx = document.getElementById('expense-pie-chart');
    if (!ctx) return;

    const container = ctx.parentElement;
    const breakdown = getCategoryBreakdown('expense');
    const labels = Object.keys(breakdown).map(k => CATEGORY_LABELS[k] || k);
    const values = Object.values(breakdown);

    // Destroy existing chart if any
    if (AppState.charts.expensePie) {
        AppState.charts.expensePie.destroy();
        AppState.charts.expensePie = null;
    }

    if (values.length === 0) {
        ctx.style.display = 'none';
        let emptyMsg = container.querySelector('.chart-empty-state');
        if (!emptyMsg) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-state chart-empty-state';
            emptyMsg.textContent = 'Gider verisi yok';
            container.appendChild(emptyMsg);
        }
        return;
    }

    // Remove empty message if exists and show canvas
    const emptyMsg = container.querySelector('.chart-empty-state');
    if (emptyMsg) emptyMsg.remove();
    ctx.style.display = 'block';

    AppState.charts.expensePie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: values, backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#ec4899', '#a855f7', '#6366f1', '#3b82f6'], borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.7)', padding: 15 } } }
        }
    });
}

// ===== Modal Management =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id));
}

// ===== Toast =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ===== Utilities =====
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function formatNumber(num) { return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num); }
function formatDate(dateStr) { return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr)); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = reject; }); }

// ===== Global Window Exports (Required for modules) =====
window.loginAdmin = loginAdmin;
window.loginResident = loginResident;
window.logout = logout;
window.showSection = showSection;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.editBill = editBill;
window.viewBill = viewBill;
window.deleteBill = deleteBill;
window.toggleDue = toggleDue;
window.editDecision = editDecision;
window.deleteDecision = deleteDecision;
window.editMaintenance = editMaintenance;
window.deleteMaintenance = deleteMaintenance;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.viewTaskDetail = viewTaskDetail;
window.editApartment = editApartment; // New
window.renderBills = renderBills;
window.renderDuesTable = renderDuesTable;
window.updateMonthlyDueAmount = updateMonthlyDueAmount;
window.renderTransactions = renderTransactions;
window.updateFinanceSummary = updateFinanceSummary;
window.renderMaintenance = renderMaintenance;
window.renderDecisions = renderDecisions;
window.renderRecentDecisions = renderRecentDecisions;
window.renderTasks = renderTasks;
window.closeAllModals = closeAllModals;
window.migrateData = migrateData; // New

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    checkAuth();

    // Login Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-login-form`).classList.add('active');
        });
    });

    // Login Forms
    document.getElementById('admin-login-form').addEventListener('submit', async e => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span class="spinner-sm"></span> Giriş Yapılıyor...`;
        btn.disabled = true;

        await loginAdmin(document.getElementById('admin-password').value);

        btn.innerHTML = originalText;
        btn.disabled = false;
    });
    document.getElementById('resident-login-form').addEventListener('submit', e => { e.preventDefault(); loginResident(parseInt(document.getElementById('apartment-number').value)); });

    // Logout
    document.getElementById('admin-logout').addEventListener('click', e => { e.preventDefault(); logout(); });
    document.getElementById('resident-logout').addEventListener('click', e => { e.preventDefault(); logout(); });

    // Navigation
    document.querySelectorAll('#admin-dashboard .nav-link[data-section]').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); showSection(link.dataset.section); document.getElementById('nav-links').classList.remove('active'); });
    });
    document.querySelectorAll('#resident-dashboard .nav-link[data-section]').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); showSection(link.dataset.section); document.getElementById('resident-nav-links').classList.remove('active'); });
    });

    // Mobile Menu
    document.getElementById('mobile-menu-toggle').addEventListener('click', () => document.getElementById('nav-links').classList.toggle('active'));
    document.getElementById('resident-mobile-menu-toggle').addEventListener('click', () => document.getElementById('resident-nav-links').classList.toggle('active'));

    // Task Filters
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.currentTaskFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Add Buttons
    document.getElementById('add-bill-btn').addEventListener('click', () => { document.getElementById('bill-modal-title').textContent = 'Fatura Ekle'; document.getElementById('bill-id').value = ''; openModal('bill-modal'); });
    document.getElementById('add-decision-btn').addEventListener('click', () => { document.getElementById('decision-modal-title').textContent = 'Karar Ekle'; document.getElementById('decision-id').value = ''; document.getElementById('decision-date').value = new Date().toISOString().split('T')[0]; openModal('decision-modal'); });
    document.getElementById('add-transaction-btn').addEventListener('click', () => { document.getElementById('transaction-modal-title').textContent = 'Gelir/Gider Ekle'; document.getElementById('transaction-id').value = ''; document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0]; openModal('transaction-modal'); });
    document.getElementById('add-maintenance-btn').addEventListener('click', () => { document.getElementById('maintenance-modal-title').textContent = 'Bakım Ekle'; document.getElementById('maintenance-id').value = ''; document.getElementById('maintenance-date').value = new Date().toISOString().split('T')[0]; openModal('maintenance-modal'); });
    document.getElementById('add-task-btn').addEventListener('click', () => { document.getElementById('task-modal-title').textContent = 'İş Ekle'; document.getElementById('task-id').value = ''; openModal('task-modal'); });

    // Migration Button
    const migrateBtn = document.getElementById('migrate-data-btn');
    if (migrateBtn) migrateBtn.addEventListener('click', migrateData);

    // Filters
    document.getElementById('bill-year-filter').addEventListener('change', renderBills);
    document.getElementById('dues-year-select').addEventListener('change', renderDuesTable);
    document.getElementById('monthly-due-amount').addEventListener('change', updateMonthlyDueAmount);
    document.getElementById('transaction-type-filter').addEventListener('change', () => { renderTransactions(); updateFinanceSummary(); });
    document.getElementById('transaction-year-filter').addEventListener('change', () => { renderTransactions(); updateFinanceSummary(); });

    // Apartment Form
    document.getElementById('apartment-form').addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            residentName: document.getElementById('apartment-resident').value,
            status: document.getElementById('apartment-status').value,
            ownerName: document.getElementById('apartment-owner').value,
            phone: document.getElementById('apartment-phone').value,
            residentCount: parseInt(document.getElementById('apartment-count').value),
            moveInDate: document.getElementById('apartment-move-in').value
        };
        await saveApartment(data);
        closeModal('apartment-modal');
    });

    // Form Submissions
    document.getElementById('bill-form').addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('bill-id').value;
        const data = {
            type: document.getElementById('bill-type').value,
            month: parseInt(document.getElementById('bill-month').value),
            year: parseInt(document.getElementById('bill-year').value),
            amount: parseFloat(document.getElementById('bill-amount').value),
            notes: document.getElementById('bill-notes').value
        };
        const fileInput = document.getElementById('bill-file');
        if (fileInput.files.length > 0) { const file = fileInput.files[0]; data.fileData = await fileToBase64(file); data.fileType = file.type.includes('pdf') ? 'pdf' : 'image'; }
        if (id) updateBill(id, data); else addBill(data);
        closeModal('bill-modal'); renderBills();
    });

    document.getElementById('decision-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('decision-id').value;
        const data = { title: document.getElementById('decision-title').value, date: document.getElementById('decision-date').value, content: document.getElementById('decision-content').value };
        if (id) updateDecision(id, data); else addDecision(data);
        closeModal('decision-modal'); renderDecisions(); renderRecentDecisions();
    });

    document.getElementById('transaction-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('transaction-id').value;
        const data = { type: document.getElementById('transaction-type').value, category: document.getElementById('transaction-category').value, amount: parseFloat(document.getElementById('transaction-amount').value), date: document.getElementById('transaction-date').value, description: document.getElementById('transaction-description').value };
        if (id) updateTransaction(id, data); else addTransaction(data);
        closeModal('transaction-modal'); renderTransactions(); updateFinanceSummary();
    });

    document.getElementById('maintenance-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('maintenance-id').value;
        const data = { title: document.getElementById('maintenance-title').value, date: document.getElementById('maintenance-date').value, description: document.getElementById('maintenance-description').value, status: document.getElementById('maintenance-status').value };
        if (id) updateMaintenance(id, data); else addMaintenance(data);
        closeModal('maintenance-modal'); renderMaintenance();
    });

    document.getElementById('task-form').addEventListener('submit', e => {
        e.preventDefault();
        const id = document.getElementById('task-id').value;
        const data = { title: document.getElementById('task-title').value, description: document.getElementById('task-description').value, detail: document.getElementById('task-detail').value, status: document.getElementById('task-status').value, priority: document.getElementById('task-priority').value };
        if (id) updateTask(id, data); else addTask(data);
        closeModal('task-modal'); renderTasks();
    });

    // Modal Close
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => btn.addEventListener('click', closeAllModals));
    document.querySelectorAll('.modal-overlay').forEach(overlay => overlay.addEventListener('click', closeAllModals));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
});
