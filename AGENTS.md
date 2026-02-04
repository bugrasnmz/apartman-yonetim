# Apartman Yönetim Sistemi - Agent Configuration

> **Son Güncelleme:** 2026-02-04  
> **Versiyon:** 1.1.0 (Security Update)  
> **Dil:** Türkçe (Proje dili Türkçe'dir, tüm yorumlar ve dokümantasyon Türkçe olarak yazılmalıdır)

---

## Proje Özeti

Bu proje, 12 daireli apartmanlar için tasarlanmış kapsamlı bir yönetim uygulamasıdır. Yöneticiler ve sakinler için farklı erişim seviyeleri sunar.

### Temel Özellikler
- 📊 **Genel Bakış Dashboard** - Apartman durumu özeti
- 💵 **Gelir/Gider Yönetimi** - Finansal takip
- ⚡ **Fatura Takibi** - Elektrik ve diğer faturalar
- 💰 **Aidat Yönetimi** - Aylık aidat takibi
- 🔧 **Periyodik Bakımlar** - Bakım planlaması
- 📋 **İş Takibi** - Yapılacak işlerin yönetimi
- 📝 **Kararlar** - Apartman kararları kaydı
- 📄 **Döküman Yönetimi** - Firebase Storage ile dosya saklama
- 📱 **WhatsApp Bildirimleri** - GREEN-API entegrasyonu

---

## Teknoloji Yığını

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern Glassmorphism tasarım, CSS Variables, Fluid Typography
- **TypeScript / Vanilla JavaScript** - ES2020+ modül sistemi
- **Chart.js** - Grafikler için (Pie, Line, Bar grafikleri)

### Build & Development
- **Vite** v5.0.0 - Build tool ve development server
- **TypeScript** v5.9.3 - Tip güvenliği
- **Node.js** - ES Modules (`"type": "module"`)

### Backend & Database
- **Firebase** v10.7.1:
  - **Firestore** - NoSQL veritabanı
  - **Authentication** - Admin giriş yönetimi
  - **Storage** - Döküman dosya saklama

### Third-party Servisler
- **EmailJS** v4.0.0 - E-posta gönderimi
- **GREEN-API** - WhatsApp mesaj bildirimleri

### Deployment
- **Firebase Hosting** - Production deployment

---

## Proje Yapısı

```
/Users/bugrasonmez/Desktop/YönetimV1/
├── index.html              # Ana HTML (SPA yapısı, ~1826 satır)
├── css/
│   └── style.css           # Tüm stiller (Glassmorphism, Responsive)
├── js/
│   ├── app.ts              # Ana uygulama dosyası (entry point)
│   ├── app.config.ts       # Merkezi yapılandırma (CONFIG objesi)
│   ├── firebase-config.ts  # Firebase bağlantı ve yapılandırma
│   ├── types.ts            # Global TypeScript interface'leri
│   ├── core/               # Çekirdek modüller
│   │   ├── events.ts       # Event Bus (pub/sub pattern)
│   │   ├── router.ts       # SPA routing yönetimi
│   │   └── index.ts        # Core modül export'ları
│   ├── modules/            # Alt modüller
│   │   ├── state.ts        # Global state (AppState)
│   │   ├── ui.ts           # UI utilities
│   │   ├── utils.ts        # Genel yardımcı fonksiyonlar
│   │   ├── validation.ts   # Validasyon kuralları
│   │   ├── firebase-service.ts  # Firebase CRUD wrapper
│   │   └── audit-logger.ts # Audit log yönetimi
│   ├── features/           # Feature-based modüller
│   │   ├── auth/           # Kimlik doğrulama
│   │   ├── apartments/     # Daire yönetimi
│   │   ├── bills/          # Fatura yönetimi
│   │   ├── dues/           # Aidat yönetimi
│   │   ├── finances/       # Gelir/gider yönetimi
│   │   ├── maintenance/    # Bakım yönetimi
│   │   ├── tasks/          # İş takibi
│   │   ├── decisions/      # Kararlar
│   │   ├── documents/      # Döküman yönetimi
│   │   ├── notifications/  # Bildirim servisi
│   │   └── dashboard/      # Dashboard servisi
│   └── shared/             # Paylaşılan kod
│       ├── services/       # Firebase service wrapper
│       ├── ui/             # UI component'leri (toast, modal)
│       └── utils/          # Formatters, validators
├── dist/                   # Build çıktısı (Vite)
├── firestore.rules         # Firestore güvenlik kuralları (✅ Sıkılaştırıldı)
├── storage.rules           # Firebase Storage kuralları
├── firebase.json           # Firebase yapılandırması
├── vite.config.js          # Vite yapılandırması
├── tsconfig.json           # TypeScript yapılandırması
├── package.json            # NPM bağımlılıkları
├── SECURITY.md             # 🔐 Güvenlik rehberi (YENİ)
├── SECURITY_HEADERS.md     # Güvenlik header'ları dokümantasyonu
├── .env.local              # Ortam değişkenleri (gitignore'da)
├── .env.example            # Ortam değişkenleri şablonu
└── scripts/                # Yardımcı script'ler
    └── setup-admin.cjs     # Admin kullanıcı oluşturma (CommonJS)
```

---

## Build ve Development Komutları

```bash
# Development sunucusu (port 5173)
npm run dev

# Production build (dist/ klasörüne)
npm run build

# Production build önizleme
npm run preview
```

---

## Mimari Prensipler

### 1. Feature-Based Modüler Yapı
Her özellik kendi klasöründe (`js/features/{feature}/`):
- `{feature}.service.ts` - İş mantığı ve veri işlemleri
- `{feature}.types.ts` - Tip tanımlamaları
- `index.ts` - Public API export'ları

### 2. Event-Driven Communication
`js/core/events.ts` içinde Event Bus implementasyonu:
```typescript
eventBus.emit(EVENTS.TRANSACTION_ADDED, data);
eventBus.on(EVENTS.DATA_UPDATED, callback);
```

### 3. Centralized Configuration
Tüm yapılandırma `js/app.config.ts` içinde:
```typescript
export const CONFIG = {
    apartment: { totalUnits: 12, defaultDueAmount: 500 },
    ui: { toast: { defaultDuration: 3000 } },
    // ...
};
```

### 4. Global State Management
`js/modules/state.ts` içinde reaktif olmayan basit state:
```typescript
export const AppState = {
    currentUser: null,
    bills: [],
    dues: {},
    // ...
};
```

### 5. Service Pattern
Her feature için service objesi:
- Firebase CRUD işlemleri
- İş mantığı
- Validasyon

---

## Giriş Sistemi 🔐

### Yönetici Girişi
- **Email:** `.env.local` dosyasından `VITE_ADMIN_EMAIL`
- **Şifre:** Firebase Auth üzerinden doğrulanır
- **Oturum:** Firebase Auth ile yönetilir
- **Güvenlik:**
  - ✅ Rate limiting: 5 başarısız denemeden sonra 30 dk kilit
  - ✅ Custom Claims ile admin doğrulama
  - ✅ Firestore `admins` koleksiyonu ile ikincil doğrulama
  - ✅ Audit log kaydı (tüm giriş denemeleri)
  - ✅ Brute-force koruması

### Admin Oluşturma
```bash
# 1. Firebase Console'dan Service Account Key indir
# 2. Proje köküne serviceAccountKey.json olarak kaydet
# 3. Script'i çalıştır:
node scripts/setup-admin.cjs create admin@example.com Sifre123!
```

### Sakin Girişi
- Daire numarası seçimi (1-12)
- SessionStorage kullanılır (`apt_resident_session`)
- 24 saat geçerlilik süresi
- Tarayıcı kapatıldığında otomatik temizlenir

---

## Firestore Veri Yapısı

```
apartments/        # Daire bilgileri
  └── {apt_1}, {apt_2}, ...
      ├── number: number
      ├── residentName: string
      ├── phone: string
      ├── status: 'occupied' | 'empty'
      └── ...

transactions/      # Gelir/gider kayıtları
  └── {auto-id}
      ├── type: 'income' | 'expense'
      ├── amount: number
      ├── category: string
      └── date: timestamp

bills/             # Fatura kayıtları
  └── {auto-id}
      ├── type: 'elektrik' | 'su' | 'dogalgaz'
      ├── amount: number
      ├── month: number
      └── year: number

dues/              # Aidat takibi (yıllara göre)
  └── {2025}, {2026}, ...
      └── {apartmentNo}: {month: boolean}

maintenance/       # Bakım kayıtları
tasks/             # İş takip kayıtları
decisions/         # Apartman kararları
documents/         # Döküman metadata
settings/          # Uygulama ayarları
  └── config       # Genel ayarlar
  └── notifications # GREEN-API config
notifications/     # Bildirim geçmişi
```

---

## Güvenlik Kuralları 🛡️

### Firestore Rules (`firestore.rules`) - ✅ Sıkılaştırıldı
| Koleksiyon | Read | Write | Notlar |
|------------|------|-------|--------|
| `apartments` | Public | Admin only | Herkes okuyabilir |
| `transactions` | Auth | Admin only | Gelir/gider yönetimi |
| `bills` | Auth | Admin only | Fatura kayıtları |
| `maintenance` | Auth | Admin only | Bakım kayıtları |
| `tasks` | Auth | Admin only | İş takibi |
| `dues` | Auth | Admin only | Aidat takibi |
| `decisions` | Auth | Admin only | Apartman kararları |
| `documents` | Auth* | Admin only | *Public veya izinli daireler |
| `settings` | Auth | Admin only | Uygulama ayarları |
| `admins` | Admin only | Admin only | Admin kullanıcıları |
| `audit_logs` | Admin only | Auth (create) | Güvenlik logları (append-only) |

**Validasyonlar:**
- String uzunluk kontrolü (< 5000 karakter)
- Pozitif sayı kontrolü
- Enum değer kontrolü (status, priority, vb.)
- Rate limiting (basic)

### Storage Rules (`storage.rules`)
- `/documents/**`: Auth required, max 100MB
- İzin verilen tipler: PDF, Word, Excel, images

### CSP (Content Security Policy)
`index.html` içinde meta tag olarak tanımlı:
- Scripts: self + trusted CDNs
- Connect: Firebase API endpoints
- Img: self + data + https
- Default: 'self'

### Environment Variables (.env.local)
```bash
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_ADMIN_EMAIL=admin@example.com
```

**⚠️ Önemli:** `.env.local` ve `serviceAccountKey.json` asla Git'e commit edilmemelidir!

---

## Önemli Konfigürasyon Değerleri

| Değişken | Dosya | Açıklama |
|----------|-------|----------|
| `TOTAL_APARTMENTS` | `app.config.ts` | Toplam daire sayısı (12) |
| `DEFAULT_DUE` | `app.config.ts` | Varsayılan aidat (500₺) |
| `VITE_ADMIN_EMAIL` | `.env.local` | Yönetici e-posta |
| `VITE_FIREBASE_*` | `.env.local` | Firebase yapılandırması |
| `CONFIG.session.storageKey` | `app.config.ts` | SessionStorage anahtarı |
| `CONFIG.ui.toast.*` | `app.config.ts` | Toast süreleri (ms) |
| `CONFIG.SECURITY.*` | `app.config.ts` | Güvenlik ayarları |
| `APP_CONFIG` | `firebase-config.ts` | Firebase config wrapper |

### Güvenlik Ayarları (`app.config.ts`)
```typescript
SECURITY: {
    enableAuditLogs: true,      // Audit log kaydı aktif
    maxLoginAttempts: 5,        // Maksimum deneme sayısı
    lockoutDurationMinutes: 30, // Kilit süresi (dakika)
}
```

---

## Kod Stili ve Kuralları

### TypeScript
- ES2020 hedef
- `strict: false` (gevşek mod)
- `.ts` uzantıları import'ta belirtilmeli
- Interface'ler `types.ts` içinde merkezi

### Naming Conventions
- **Services:** `{Feature}Service` (PascalCase)
- **Types:** `{FeatureName}` (PascalCase)
- **Constants:** `UPPER_SNAKE_CASE`
- **Functions:** `camelCase`
- **Events:** `category:action` (örn: `auth:login`)

### Türkçe Dil Kullanımı
- Tüm kullanıcı arayüzü metinleri Türkçe
- Yorumlar ve JSDoc Türkçe yazılmalı
- Değişken isimleri İngilizce (standart)

### Import Sırası
```typescript
// 1. Firebase imports
// 2. Internal config (app.config, firebase-config)
// 3. Core modules (events, router)
// 4. Feature services
// 5. Shared utilities
// 6. Third-party (Chart.js, emailjs)
```

---

## Test Stratejisi ✅

### Test Framework
- **Vitest** - Vite-native test framework
- **jsdom** - Browser environment simulation
- **@vitest/coverage-v8** - Code coverage reporting

### Test Scripts
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run with coverage report
```

### Test Structure
```
js/
├── test/
│   ├── setup.ts      # Global test configuration & mocks
│   └── fixtures.ts   # Test data factories
├── features/
│   └── auth/
│       └── auth.service.test.ts  # Auth service tests ✅
├── modules/
│   └── validation.test.ts        # Validation tests ✅
└── ... (add more tests)
```

### Coverage Thresholds
| Metric | Threshold |
|--------|-----------|
| Lines | 50% |
| Functions | 50% |
| Branches | 40% |
| Statements | 50% |

### Writing Tests
```typescript
// Example test pattern
import { describe, it, expect } from 'vitest';
import { createApartmentFixture } from '../test/fixtures.js';

describe('MyService', () => {
  it('should do something', () => {
    const apartment = createApartmentFixture({ apartmentNo: 5 });
    expect(apartment.apartmentNo).toBe(5);
  });
});
```

### Manual Test Checklist
- [ ] Yönetici girişi/çıkışı
- [ ] Sakin girişi
- [ ] Her formun validasyonu
- [ ] Mobil responsive kontrol
- [ ] Firebase offline/online senaryoları

---

## Deployment

### Firebase Hosting
```bash
# Build al
npm run build

# Firebase CLI ile deploy
firebase deploy --only hosting
```

### Environment Variables
Vite kullanıldığı için `.env` dosyası kullanılabilir:
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
```

**Not:** Şu an Firebase config hard-coded olarak `firebase-config.ts` içinde.

---

## Yeni Özellik Ekleme Adımları

1. **Tip tanımları:** `js/features/{feature}/{feature}.types.ts`
2. **Service:** `js/features/{feature}/{feature}.service.ts`
3. **Export:** `js/features/{feature}/index.ts`
4. **Import:** `js/app.ts` içinde gerekli fonksiyonları import et
5. **UI:** `index.html` içinde ilgili section'ı ekle/güncelle
6. **Event:** Gerekirse `js/core/events.ts` içine yeni event ekle

---

## Sık Karşılaşılan Sorunlar

### Firebase Bağlantı Hatası
- Internet bağlantısını kontrol et
- Firebase config değerlerini doğrula
- Browser console'da hata mesajını kontrol et

### Build Hatası
- `node_modules` silip `npm install` yeniden çalıştır
- TypeScript versiyon uyumluluğunu kontrol et

### Deploy Sonrası 404
- `firebase.json` içinde rewrite kurallarını kontrol et
- SPA yapısı için `destination: "/index.html"` gerekli

---

## Kaynaklar

- [Firebase Documentation](https://firebase.google.com/docs)
- [GREEN-API Documentation](https://green-api.com/en/docs/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)

---

## Özel Skills Dizini

**Önemli:** Bu projede özel skill'ler şu yolda bulunur:
```
/Users/bugrasonmez/.gemini/antigravity/skills
```

Bu yoldaki skill'ler, genel skill'lere göre önceliklidir. Yeni görevlerde önce bu dizin kontrol edilmelidir.
