# Apartman Yönetim Sistemi - Güvenlik Header'ları

Bu dosya production ortamında güvenlik header'larının nasıl yapılandırılacağını açıklar.

## Meta Tag'ler (İstemci Tarafı)
`index.html` dosyasına aşağıdaki güvenlik meta tag'leri eklendi:
- Content-Security-Policy (CSP)
- X-Content-Type-Options
- Referrer-Policy

## Sunucu Tarafı Header'lar

### Nginx Yapılandırması
```nginx
server {
    listen 443 ssl http2;
    server_name apartmanyonetimi.online;
    
    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # CSP - Production için önerilen
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.gstatic.com https://*.firebaseio.com https://*.googleapis.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: blob: https:;
        connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://api.emailjs.com wss://*.firebaseio.com;
        frame-src 'self' https://*.firebaseapp.com;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
    " always;
    
    location / {
        root /var/www/apartman-yonetim;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache (.htaccess)
```apache
<IfModule mod_headers.c>
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>
```

### Cloudflare
Cloudflare kullanıyorsanız, Security → Settings bölümünden:
1. SSL/TLS → Full (Strict) seçin
2. Security → Settings → Browser Integrity Check → On
3. Scrape Shield → Email Address Obfuscation → On

### Netlify (_headers dosyası)
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Vercel (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Header'ların Açıklamaları

| Header | Açıklama |
|--------|----------|
| X-Frame-Options | Sitenin iframe içinde açılmasını engeller (Clickjacking koruması) |
| X-Content-Type-Options | MIME type sniffing saldırılarını önler |
| X-XSS-Protection | Tarayıcı XSS filtrelerini etkinleştirir |
| Referrer-Policy | Referer header'ının ne zaman gönderileceğini kontrol eder |
| Permissions-Policy | Tarayıcı özelliklerine (kamera, mikrofon vb.) erişimi kısıtlar |
| HSTS | HTTPS kullanımını zorunlu kılar |
| CSP | Hangi kaynakların yüklenebileceğini tanımlar |

## Test Etme
Header'ların çalıştığını kontrol etmek için:
1. https://securityheaders.com adresinde sitenizi test edin
2. Chrome DevTools → Network → Response Headers'ı kontrol edin
