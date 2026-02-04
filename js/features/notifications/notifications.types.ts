/**
 * Notifications Types - WhatsApp notification type definitions
 */

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export type NotificationTemplate =
    | 'due_reminder'        // Aidat hatırlatma
    | 'maintenance_notice'  // Bakım bildirimi
    | 'decision_announce'   // Karar duyurusu
    | 'general_message'     // Genel mesaj
    | 'custom';             // Özel mesaj

export interface Notification {
    id?: string;
    templateType: NotificationTemplate;
    message: string;
    recipients: NotificationRecipient[];
    sentAt?: string;
    status: NotificationStatus;
    sentBy: string;
}

export interface NotificationRecipient {
    apartmentNo: number;
    residentName: string;
    phoneNumber: string;
    status: NotificationStatus;
    sentAt?: string;
    errorMessage?: string;
}

export interface NotificationHistory {
    id?: string;
    templateType: NotificationTemplate;
    message: string;
    recipientCount: number;
    successCount: number;
    failedCount: number;
    sentAt: string;
    sentBy: string;
}

// GREEN-API configuration
export interface GreenApiConfig {
    idInstance: string;
    apiTokenInstance: string;
}

// Template labels for display
export const NOTIFICATION_TEMPLATE_LABELS: Record<NotificationTemplate, string> = {
    due_reminder: '💰 Aidat Hatırlatma',
    maintenance_notice: '🔧 Bakım Bildirimi',
    decision_announce: '📋 Karar Duyurusu',
    general_message: '📢 Genel Duyuru',
    custom: '✍️ Özel Mesaj'
};

// Default message templates
export const MESSAGE_TEMPLATES: Record<NotificationTemplate, string> = {
    due_reminder: `Sayın {residentName},

{month} ayı aidatınızın ödenmediğini hatırlatmak isteriz.

Aidat Tutarı: {amount}₺

Kolaylıklar dileriz.
Apartman Yönetimi 🏢`,

    maintenance_notice: `Sayın Sakinlerimiz,

{date} tarihinde {maintenanceType} bakımı yapılacaktır.

Detaylar: {details}

Anlayışınız için teşekkür ederiz.
Apartman Yönetimi 🏢`,

    decision_announce: `Sayın Sakinlerimiz,

Yeni bir apartman kararı alınmıştır:

📋 {decisionTitle}

Detaylar için yönetim panelini ziyaret edebilirsiniz.

Apartman Yönetimi 🏢`,

    general_message: `Sayın Sakinlerimiz,

{message}

Apartman Yönetimi 🏢`,

    custom: `{message}`
};
