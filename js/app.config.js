/* =========================================
   App Configuration - Centralized Settings
   ========================================= */

/**
 * Merkezi uygulama ayarları
 * Tüm "magic number"lar ve yapılandırılabilir değerler burada
 */
export const CONFIG = {
    // ===== Apartman Ayarları =====
    apartment: {
        totalUnits: 12,              // Toplam daire sayısı
        defaultDueAmount: 500,       // Varsayılan aylık aidat (TL)
        dueDayOfMonth: 10,           // Aidat son ödeme günü
    },

    // ===== Session Ayarları =====
    session: {
        storageKey: 'apt_resident_session',
        expiryHours: 24,             // Session geçerlilik süresi
    },

    // ===== UI Ayarları =====
    ui: {
        toast: {
            defaultDuration: 3000,   // Normal toast süresi (ms)
            errorDuration: 5000,     // Hata toast süresi (ms)
            loadingDuration: 0,      // Loading toast süresi (0 = manual dismiss)
        },
        animation: {
            fast: 150,               // Hızlı animasyon (ms)
            normal: 250,             // Normal animasyon (ms)
            slow: 400,               // Yavaş animasyon (ms)
        },
        pagination: {
            itemsPerPage: 20,        // Sayfa başına öğe sayısı
        },
    },

    // ===== Tarih Ayarları =====
    date: {
        defaultYear: new Date().getFullYear(),
        minYear: 2020,
        maxYear: new Date().getFullYear() + 5,
        months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
        monthsShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
            'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    },

    // ===== Kategori Etiketleri =====
    labels: {
        categories: {
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
        },
        status: {
            pending: 'Bekliyor',
            in_progress: 'Devam Ediyor',
            completed: 'Tamamlandı'
        },
        priority: {
            low: 'Düşük',
            medium: 'Orta',
            high: 'Yüksek'
        },
        billTypes: {
            elektrik: { label: 'Elektrik', icon: '⚡' },
            su: { label: 'Su', icon: '💧' },
            dogalgaz: { label: 'Doğalgaz', icon: '🔥' }
        }
    },

    // ===== Validasyon Kuralları =====
    validation: {
        password: {
            minLength: 4,
            maxLength: 50,
        },
        text: {
            maxLength: 5000,
        },
        phone: {
            pattern: /^(\+90|0)?[1-9][0-9]{9}$/,
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
    },

    // ===== API Ayarları =====
    api: {
        retryAttempts: 3,
        retryDelay: 1000,            // Retry bekleme süresi (ms)
        timeout: 30000,              // API timeout (ms)
    },

    // ===== Feature Flags =====
    features: {
        enableEmailNotifications: true,
        enablePasswordReset: true,
        enableDataExport: false,     // Henüz implement edilmedi
        enableDarkMode: true,
    },
};

// Kısayollar (sık kullanılanlar için)
export const TOTAL_APARTMENTS = CONFIG.apartment.totalUnits;
export const DEFAULT_DUE = CONFIG.apartment.defaultDueAmount;
export const MONTHS = CONFIG.date.months;
export const MONTHS_SHORT = CONFIG.date.monthsShort;
export const CATEGORY_LABELS = CONFIG.labels.categories;
export const STATUS_LABELS = CONFIG.labels.status;
export const PRIORITY_LABELS = CONFIG.labels.priority;

// Freeze config to prevent accidental mutations
Object.freeze(CONFIG);
