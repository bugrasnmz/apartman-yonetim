/* =========================================
   Apartman Yönetim Sistemi - JavaScript
   Phase 2: Enhanced Dashboard
   ========================================= */

// ===== Constants =====
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const ADMIN_PASSWORD = 'admin123';
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
    currentPage: 'login',
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
    settings: { monthlyDueAmount: 500 },

    // Charts
    charts: {}
};

// ===== Local Storage =====
const Storage = {
    save(key, data) {
        try { localStorage.setItem(`apt_${key}`, JSON.stringify(data)); }
        catch (e) { console.error('Storage save error:', e); }
    },
    load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`apt_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    },
    remove(key) { localStorage.removeItem(`apt_${key}`); }
};

// ===== Initialize Data =====
function initializeData() {
    AppState.bills = Storage.load('bills', []);
    AppState.decisions = Storage.load('decisions', []);
    AppState.transactions = Storage.load('transactions', []);
    AppState.maintenance = Storage.load('maintenance', []);
    AppState.tasks = Storage.load('tasks', []);
    AppState.settings = Storage.load('settings', { monthlyDueAmount: 500 });

    const savedDues = Storage.load('dues', {});
    AppState.dues = savedDues;

    if (!AppState.dues[AppState.currentYear]) {
        AppState.dues[AppState.currentYear] = {};
        for (let apt = 1; apt <= TOTAL_APARTMENTS; apt++) {
            AppState.dues[AppState.currentYear][apt] = {};
            for (let month = 1; month <= 12; month++) {
                AppState.dues[AppState.currentYear][apt][month] = false;
            }
        }
        Storage.save('dues', AppState.dues);
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
        case 'resident-overview': updateResidentDashboard(); break;
        case 'resident-bills': renderResidentBills(); break;
        case 'resident-decisions': renderResidentDecisions(); break;
    }
}

// ===== Authentication =====
function loginAdmin(password) {
    if (password === ADMIN_PASSWORD) {
        AppState.currentUser = { role: 'admin' };
        Storage.save('currentUser', AppState.currentUser);
        showPage('admin-dashboard');
        showSection('overview');
        showToast('Hoş geldiniz, Yönetici!', 'success');
        return true;
    }
    showToast('Hatalı şifre!', 'error');
    return false;
}

function loginResident(apartmentNumber) {
    if (apartmentNumber >= 1 && apartmentNumber <= TOTAL_APARTMENTS) {
        AppState.currentUser = { role: 'resident', apartment: apartmentNumber };
        Storage.save('currentUser', AppState.currentUser);
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

function logout() {
    AppState.currentUser = null;
    Storage.remove('currentUser');
    destroyAllCharts();
    showPage('login-page');
    showToast('Çıkış yapıldı', 'success');
}

function checkAuth() {
    const savedUser = Storage.load('currentUser');
    if (savedUser) {
        AppState.currentUser = savedUser;
        if (savedUser.role === 'admin') {
            showPage('admin-dashboard');
            showSection('overview');
        } else {
            document.getElementById('resident-apartment-badge').textContent = `Daire ${savedUser.apartment}`;
            document.getElementById('resident-welcome-text').textContent = `Daire ${savedUser.apartment} - Apartman bilgileri ve durumu`;
            showPage('resident-dashboard');
            showSection('resident-overview');
        }
    }
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

    container.innerHTML = filtered.map(t => `
        <div class="transaction-card ${t.type}">
            <div class="transaction-info">
                <h4>${t.type === 'income' ? '💵' : '💸'} ${CATEGORY_LABELS[t.category] || t.category}</h4>
                <p>${escapeHtml(t.description || '-')}</p>
            </div>
            <div class="transaction-meta">
                <span class="transaction-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₺${formatNumber(t.amount)}</span>
                <span class="transaction-date">${formatDate(t.date)}</span>
            </div>
            <div class="transaction-actions">
                <button class="btn btn-secondary btn-sm" onclick="editTransaction('${t.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function addTransaction(data) {
    const transaction = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    AppState.transactions.push(transaction);
    Storage.save('transactions', AppState.transactions);
    showToast('Kayıt eklendi', 'success');
    return transaction;
}

function updateTransaction(id, data) {
    const index = AppState.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        AppState.transactions[index] = { ...AppState.transactions[index], ...data };
        Storage.save('transactions', AppState.transactions);
        showToast('Kayıt güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteTransaction(id) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
    AppState.transactions = AppState.transactions.filter(t => t.id !== id);
    Storage.save('transactions', AppState.transactions);
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
    Storage.save('maintenance', AppState.maintenance);
    showToast('Bakım kaydı eklendi', 'success');
    return m;
}

function updateMaintenance(id, data) {
    const index = AppState.maintenance.findIndex(m => m.id === id);
    if (index !== -1) {
        AppState.maintenance[index] = { ...AppState.maintenance[index], ...data };
        Storage.save('maintenance', AppState.maintenance);
        showToast('Bakım kaydı güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteMaintenance(id) {
    if (!confirm('Bu bakım kaydını silmek istediğinizden emin misiniz?')) return;
    AppState.maintenance = AppState.maintenance.filter(m => m.id !== id);
    Storage.save('maintenance', AppState.maintenance);
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
    Storage.save('tasks', AppState.tasks);
    showToast('İş kaydı eklendi', 'success');
    return task;
}

function updateTask(id, data) {
    const index = AppState.tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        AppState.tasks[index] = { ...AppState.tasks[index], ...data };
        Storage.save('tasks', AppState.tasks);
        showToast('İş kaydı güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteTask(id) {
    if (!confirm('Bu iş kaydını silmek istediğinizden emin misiniz?')) return;
    AppState.tasks = AppState.tasks.filter(t => t.id !== id);
    Storage.save('tasks', AppState.tasks);
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

    container.innerHTML = filtered.map(bill => `
        <div class="bill-card glass-card">
            <div class="bill-header">
                <span class="bill-month">${MONTHS[bill.month - 1]}</span>
                <span class="bill-year">${bill.year}</span>
            </div>
            <div class="bill-amount">₺${formatNumber(bill.amount)}</div>
            ${bill.notes ? `<p style="color: var(--text-secondary); font-size: var(--font-size-sm);">${escapeHtml(bill.notes)}</p>` : ''}
            <div class="bill-actions">
                ${bill.fileData ? `<button class="btn btn-secondary btn-sm" onclick="viewBill('${bill.id}')">👁</button>` : ''}
                <button class="btn btn-secondary btn-sm" onclick="editBill('${bill.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="deleteBill('${bill.id}')">🗑</button>
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
    Storage.save('bills', AppState.bills);
    showToast('Fatura eklendi', 'success');
    return bill;
}

function updateBill(id, data) {
    const index = AppState.bills.findIndex(b => b.id === id);
    if (index !== -1) {
        AppState.bills[index] = { ...AppState.bills[index], ...data };
        Storage.save('bills', AppState.bills);
        showToast('Fatura güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteBill(id) {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return;
    AppState.bills = AppState.bills.filter(b => b.id !== id);
    Storage.save('bills', AppState.bills);
    renderBills();
    showToast('Fatura silindi', 'success');
}

function editBill(id) {
    const bill = AppState.bills.find(b => b.id === id);
    if (!bill) return;
    document.getElementById('bill-modal-title').textContent = 'Fatura Düzenle';
    document.getElementById('bill-id').value = bill.id;
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

function toggleDue(year, apartment, month) {
    if (!AppState.dues[year]) AppState.dues[year] = {};
    if (!AppState.dues[year][apartment]) AppState.dues[year][apartment] = {};
    AppState.dues[year][apartment][month] = !AppState.dues[year][apartment][month];
    Storage.save('dues', AppState.dues);
    renderDuesTable();
    showToast(`Daire ${apartment} - ${MONTHS[month - 1]} ${AppState.dues[year][apartment][month] ? 'ödendi' : 'ödenmedi'}`, 'success');
}

function updateMonthlyDueAmount() {
    AppState.settings.monthlyDueAmount = parseInt(document.getElementById('monthly-due-amount').value) || 0;
    Storage.save('settings', AppState.settings);
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
    Storage.save('decisions', AppState.decisions);
    showToast('Karar eklendi', 'success');
    return decision;
}

function updateDecision(id, data) {
    const index = AppState.decisions.findIndex(d => d.id === id);
    if (index !== -1) {
        AppState.decisions[index] = { ...AppState.decisions[index], ...data };
        Storage.save('decisions', AppState.decisions);
        showToast('Karar güncellendi', 'success');
        return true;
    }
    return false;
}

function deleteDecision(id) {
    if (!confirm('Bu kararı silmek istediğinizden emin misiniz?')) return;
    AppState.decisions = AppState.decisions.filter(d => d.id !== id);
    Storage.save('decisions', AppState.decisions);
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

// ===== Resident Dashboard =====
function updateResidentDashboard() {
    const apt = AppState.currentUser?.apartment;
    if (!apt) return;

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
    document.getElementById('admin-login-form').addEventListener('submit', e => { e.preventDefault(); loginAdmin(document.getElementById('admin-password').value); });
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

    // Filters
    document.getElementById('bill-year-filter').addEventListener('change', renderBills);
    document.getElementById('dues-year-select').addEventListener('change', renderDuesTable);
    document.getElementById('monthly-due-amount').addEventListener('change', updateMonthlyDueAmount);
    document.getElementById('transaction-type-filter').addEventListener('change', () => { renderTransactions(); updateFinanceSummary(); });
    document.getElementById('transaction-year-filter').addEventListener('change', () => { renderTransactions(); updateFinanceSummary(); });

    // Form Submissions
    document.getElementById('bill-form').addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('bill-id').value;
        const data = { month: parseInt(document.getElementById('bill-month').value), year: parseInt(document.getElementById('bill-year').value), amount: parseFloat(document.getElementById('bill-amount').value), notes: document.getElementById('bill-notes').value };
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
