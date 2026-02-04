// ===== Core Types =====
export interface Apartment {
    id?: string;
    apartmentNo: number;
    residentName: string;
    contactNumber: string;
    email?: string;
    residentCount: number;
    isOwner: boolean;
    moveInDate: string; // ISO date string
    balance: number;
}

export interface Transaction {
    id?: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: string; // ISO date string
    category: string;
    createdBy?: string;
    createdAt?: any; // Firestore Timestamp
}

export interface Bill {
    id?: string;
    type: string; // 'electric', 'water', 'gas', 'internet', 'other'
    amount: number;
    month: string;
    year: number;
    paid: boolean;
    dueDate?: string;
}

export interface Decision {
    id?: string;
    title: string;
    description: string;
    date: string;
    type: 'normal' | 'urgent';
}

export interface Maintenance {
    id?: string;
    title: string;
    description: string;
    date: string;
    status: 'pending' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    cost?: number;
}

export interface Task {
    id?: string;
    title: string;
    description: string;
    assignedTo?: string;
    dueDate: string;
    status: 'pending' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
}

export interface DueRecord {
    id?: string;
    apartmentNo: number;
    year: number;
    month: number;
    paid: boolean;
    paidDate?: string;
    amount: number;
}

// ===== Document Management Types (Phase 2) =====
export type DocumentCategory =
    | 'financial'      // Mali tablolar, bütçe
    | 'legal'          // Sözleşmeler, yönetmelikler
    | 'maintenance'    // Bakım raporları
    | 'meeting'        // Toplantı tutanakları
    | 'insurance'      // Sigorta poliçeleri
    | 'general'        // Genel dökümanlar
    | 'other';

export interface Document {
    id?: string;
    title: string;
    description?: string;
    fileName: string;
    fileType: 'pdf' | 'excel' | 'word' | 'image' | 'other';
    fileSize: number;           // bytes
    fileUrl: string;            // Firebase Storage URL
    fileData?: string;          // Base64 (küçük dosyalar için)
    category: DocumentCategory;
    uploadedBy: string;         // user id
    uploadedAt: string;         // ISO date
    isPublic: boolean;          // Tüm sakinler görebilir mi?
    allowedApartments?: number[];  // Sadece belirli daireler (opsiyonel)
    tags?: string[];
}

// ===== Notification Types (Phase 3) =====
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationType = 'whatsapp' | 'sms' | 'email';
export type NotificationTemplateType = 'dues_reminder' | 'maintenance_notice' | 'general' | 'custom';

export interface NotificationRecipient {
    apartmentNo: number;
    residentName: string;
    phone: string;
    status: NotificationStatus;
    errorMessage?: string;
    sentAt?: string;
}

export interface Notification {
    id?: string;
    type: NotificationType;
    status: NotificationStatus;

    // Alıcı bilgileri
    recipients: NotificationRecipient[];

    // İçerik
    title: string;
    message: string;
    template?: string;          // Önceden tanımlı şablon

    // Meta
    sentBy: string;             // Yönetici ID
    sentAt: string;
    scheduledAt?: string;       // İleri tarihli gönderim

    // İstatistikler
    stats: {
        total: number;
        sent: number;
        failed: number;
        delivered: number;
    };
}

export interface NotificationTemplate {
    id?: string;
    name: string;
    type: NotificationTemplateType;
    title: string;
    message: string;
    variables: string[];        // {{apartmentNo}}, {{residentName}}, vb.
}

// ===== App Config =====
export interface AppConfig {
    apartment: {
        totalUnits: number;
        defaultDueAmount: number;
        dueDayOfMonth: number;
    };
    whatsapp?: {
        apiProvider: 'callmebot' | 'whapi' | 'evolution' | 'wasender';
        apiKey?: string;
        apiUrl?: string;
    };
}

// ===== Global Window Extension =====
declare global {
    interface Window {
        db: any;
        Chart: any;
        emailjs: any;
    }
}
