# 🔐 Güvenlik Rehberi - Apartman Yönetim Sistemi

> **Son Güncelleme:** 2026-02-04  
> **Versiyon:** 1.0.0  
> **Önem Derecesi:** 🔴 Kritik

---

## 📋 İçindekiler

1. [Güvenlik Özeti](#-güvenlik-özeti)
2. [Yapılandırma](#-yapılandırma)
3. [Firestore Rules](#-firestore-rules)
4. [Admin Yönetimi](#-admin-yönetimi)
5. [Ortam Değişkenleri](#-ortam-değişkenleri)
6. [Güvenlik Kontrol Listesi](#-güvenlik-kontrol-listesi)
7. [Sık Karşılaşılan Sorunlar](#-sık-karşılaşılan-sorunlar)

---

## 🔒 Güvenlik Özeti

Bu uygulama aşağıdaki güvenlik katmanlarını içerir:

| Katman | Açıklama | Durum |
|--------|----------|-------|
| 🔐 **Firebase Auth** | Email/şifre ile admin doğrulama | ✅ Aktif |
| 🛡️ **Firestore Rules** | Veritabanı erişim kontrolü | ✅ Sıkılaştırıldı |
| 📊 **Rate Limiting** | Brute-force koruması | ✅ 5 deneme/30 dk |
| 📝 **Audit Logging** | Güvenlik olayları kaydı | ✅ Aktif |
| 🔑 **Custom Claims** | Admin rol doğrulaması | ✅ Aktif |
| ⏳ **Session Expiry** | Otomatik oturum sonlandırma | ✅ 24 saat |

---

## ⚙️ Yapılandırma

### 1. Environment Variables (.env.local)

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Admin Configuration
VITE_ADMIN_EMAIL=admin@example.com
```

**⚠️ Önemli:** `.env.local` dosyasını asla Git'e commit etmeyin!

### 2. .gitignore Kontrolü

```gitignore
# Environment variables
.env.local
.env.*.local

# Firebase
.firebase/
.firebaserc
```

---

## 🛡️ Firestore Rules

### Güvenlik Kuralları

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Sadece adminler yazabilir
    match /transactions/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // Audit logs - sadece append
    match /audit_logs/{id} {
      allow read: if request.auth.token.admin == true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

### Rules Deployment

```bash
# Rules'u deploy et
firebase deploy --only firestore:rules

# Rules'u test et
firebase emulators:start --only firestore
```

---

## 👤 Admin Yönetimi

### İlk Admin Oluşturma

1. **Firebase Console** → Authentication → Users
2. Email/şifre ile kullanıcı oluştur
3. **Firestore** → `admins` koleksiyonuna ekle:

```javascript
// admins/{uid}
{
  "uid": "firebase_auth_uid",
  "email": "admin@example.com",
  "role": "admin",
  "isActive": true,
  "createdAt": "2026-02-04T00:00:00Z",
  "loginCount": 0
}
```

### Custom Claims Ayarlama (Firebase Admin SDK)

```javascript
// Firebase Admin SDK ile (server-side)
const admin = require('firebase-admin');

async function setAdminClaim(uid) {
  await admin.auth().setCustomUserClaims(uid, {
    admin: true,
    role: 'admin'
  });
}
```

**Not:** Custom Claims ayarlamak için Firebase Functions veya Admin SDK gereklidir.

---

## 🔑 Ortam Değişkenleri

### Geliştirme Ortamı

```bash
# .env.local (development)
VITE_FIREBASE_API_KEY=dev_api_key
VITE_FIREBASE_PROJECT_ID=dev_project
```

### Production Ortamı

```bash
# Firebase Hosting Environment Variables
# Firebase Console → Project Settings → Environment Variables
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_PROJECT_ID=prod_project
```

### Vite Ortam Kontrolü

```typescript
// Environment check
if (import.meta.env.PROD) {
  console.log('Production mode');
}

// Access env variables
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
```

---

## ✅ Güvenlik Kontrol Listesi

### Deployment Öncesi

- [ ] `.env.local` dosyası `.gitignore`'da
- [ ] Firestore Rules deploy edildi
- [ ] Storage Rules deploy edildi
- [ ] Admin kullanıcı oluşturuldu
- [ ] Admin dokümanı Firestore'da
- [ ] API Key'ler production değerleri
- [ ] CSP (Content Security Policy) aktif
- [ ] HTTPS zorunlu

### Düzenli Kontroller

- [ ] Audit log'ları incele (haftalık)
- [ ] Admin erişimlerini kontrol et (aylık)
- [ ] Firestore Rules review (3 ayda bir)
- [ ] Bağımlılık güncellemeleri (aylık)

---

## 🔍 Güvenlik Olayları

### Audit Log Yapısı

```javascript
{
  "eventType": "login_success",
  "userId": "firebase_uid",
  "timestamp": "2026-02-04T12:00:00Z",
  "userAgent": "Mozilla/5.0...",
  "ip": "client-side", // Production: server-side IP
  "details": {
    "email": "admin@example.com",
    "deviceId": "device_fingerprint"
  }
}
```

### Olay Tipleri

| Olay | Açıklama | Ciddiyet |
|------|----------|----------|
| `login_attempt` | Giriş denemesi | ℹ️ Bilgi |
| `login_success` | Başarılı giriş | ℹ️ Bilgi |
| `login_failure` | Başarısız giriş | ⚠️ Uyarı |
| `unauthorized_access` | Yetkisiz erişim | 🔴 Kritik |
| `data_access` | Veri erişimi | ℹ️ Bilgi |
| `data_modify` | Veri değişikliği | ℹ️ Bilgi |

---

## 🐛 Sık Karşılaşılan Sorunlar

### 1. "Missing Firebase configuration" Hatası

**Neden:** `.env.local` dosyası eksik veya değerler boş

**Çözüm:**
```bash
# .env.local dosyasını kontrol et
cat .env.local

# Tüm değerlerin dolu olduğundan emin ol
```

### 2. "Permission denied" Hatası

**Neden:** Firestore Rules erişimi engelliyor

**Çözüm:**
```bash
# Rules'u deploy et
firebase deploy --only firestore:rules

# Auth state kontrol et
console.log('User:', auth.currentUser);
console.log('Token:', await auth.currentUser?.getIdTokenResult());
```

### 3. Admin Yetkisi Çalışmıyor

**Neden:** Custom Claims veya Firestore admin kaydı eksik

**Çözüm:**
1. Firestore'da `admins/{uid}` dokümanı var mı kontrol et
2. Custom Claims ayarlanmış mı kontrol et:
   ```javascript
   const token = await user.getIdTokenResult(true);
   console.log('Claims:', token.claims);
   ```

### 4. Rate Limiting Çok Sıkı

**Neden:** Geliştirme sırasında çok fazla deneme

**Çözüm:**
```javascript
// Tarayıcı console'da:
localStorage.clear();
sessionStorage.clear();
// Sayfayı yenile
```

---

## 📞 Acil Durum

### Güvenlik İhlali Durumunda

1. **Hemen admin şifresini değiştir**
2. **Tüm aktif oturumları sonlandır**
3. **Audit log'ları incele**
4. **Firestore Rules'u geçici olarak kısıtla**
5. **Etkilenen kullanıcıları bilgilendir**

### İletişim

- Firebase Console: https://console.firebase.google.com
- Firebase Support: https://firebase.google.com/support

---

## 📚 Kaynaklar

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

> **Hatırlatma:** Güvenlik sürekli bir süreçtir. Düzenli olarak güncellemeleri takip edin ve güvenlik en iyi pratiklerini uygulayın.
