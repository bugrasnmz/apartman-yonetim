/**
 * Notifications Service - WhatsApp notification with GREEN-API
 * Documentation: https://green-api.com/en/docs/api/sending/SendMessage/
 */

import { AppState } from '../../modules/state.js';
import { db, collection, addDoc, getDocs } from '../../firebase-config.js';
import { toastSuccess, toastError, toastWarning } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type {
    Notification,
    NotificationRecipient,
    NotificationHistory,
    NotificationTemplate,
    NotificationStatus,
    GreenApiConfig
} from './notifications.types.js';
import { MESSAGE_TEMPLATES } from './notifications.types.js';

/**
 * Generate unique ID
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format phone number for GREEN-API
 * Format: 905XXXXXXXXX@c.us (country code + number + @c.us suffix)
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 90 (Turkey code)
    if (cleaned.startsWith('0')) {
        cleaned = '90' + cleaned.substring(1);
    }

    // If doesn't start with 90, add it
    if (!cleaned.startsWith('90')) {
        cleaned = '90' + cleaned;
    }

    // GREEN-API format: phone@c.us
    return cleaned + '@c.us';
}

/**
 * GREEN-API URL builder
 * API format: https://api.green-api.com/waInstance{idInstance}/sendMessage/{apiTokenInstance}
 */
function buildGreenApiUrl(idInstance: string, apiTokenInstance: string): string {
    return `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
}

/**
 * Notifications Service - Send WhatsApp messages via GREEN-API
 */
export const NotificationsService = {
    history: [] as NotificationHistory[],

    /**
     * Initialize - load notification history from Firestore
     */
    async initialize(): Promise<void> {
        try {
            const colName = 'notifications';
            const querySnapshot = await getDocs(collection(db, colName));
            this.history = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as NotificationHistory));
        } catch (error) {
            console.error('Error loading notification history:', error);
        }
    },

    /**
     * Send a single WhatsApp message via GREEN-API
     */
    async sendMessage(
        phone: string,
        message: string,
        config: GreenApiConfig
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const chatId = formatPhoneNumber(phone);
            const url = buildGreenApiUrl(config.idInstance, config.apiTokenInstance);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chatId: chatId,
                    message: message
                })
            });

            const result = await response.json();

            if (response.ok && result.idMessage) {
                return { success: true };
            } else {
                return { success: false, error: result.message || 'Mesaj gönderilemedi' };
            }
        } catch (error: any) {
            return { success: false, error: error.message || 'Network error' };
        }
    },

    /**
     * Send bulk notifications to multiple recipients
     */
    async sendBulk(
        recipients: NotificationRecipient[],
        message: string,
        templateType: NotificationTemplate,
        config: GreenApiConfig
    ): Promise<NotificationHistory> {
        const results: NotificationRecipient[] = [];
        let successCount = 0;
        let failedCount = 0;

        // Send with delay to avoid rate limiting (2 seconds between messages)
        for (const recipient of recipients) {
            if (!recipient.phoneNumber) {
                results.push({
                    ...recipient,
                    status: 'failed',
                    errorMessage: 'Telefon numarası eksik'
                });
                failedCount++;
                continue;
            }

            // Replace placeholders in message
            const personalizedMessage = message
                .replace('{residentName}', recipient.residentName)
                .replace('{apartmentNo}', String(recipient.apartmentNo));

            const result = await this.sendMessage(recipient.phoneNumber, personalizedMessage, config);

            if (result.success) {
                results.push({
                    ...recipient,
                    status: 'sent',
                    sentAt: new Date().toISOString()
                });
                successCount++;
            } else {
                results.push({
                    ...recipient,
                    status: 'failed',
                    errorMessage: result.error
                });
                failedCount++;
            }

            // Wait 2 seconds between messages (GREEN-API rate limit)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Create history record
        const historyRecord: NotificationHistory = {
            id: generateId(),
            templateType,
            message,
            recipientCount: recipients.length,
            successCount,
            failedCount,
            sentAt: new Date().toISOString(),
            sentBy: AppState.currentUser?.role === 'admin' ? 'admin' : 'unknown'
        };

        // Save to Firestore
        try {
            await addDoc(collection(db, 'notifications'), historyRecord);
            this.history.unshift(historyRecord);
        } catch (error) {
            console.error('Error saving notification history:', error);
        }

        // Emit event and show toast
        eventBus.emit(EVENTS.NOTIFICATION_SENT, historyRecord);

        if (failedCount === 0) {
            toastSuccess(`${successCount} mesaj başarıyla gönderildi`);
        } else if (successCount === 0) {
            toastError('Hiçbir mesaj gönderilemedi');
        } else {
            toastWarning(`${successCount} başarılı, ${failedCount} başarısız`);
        }

        return historyRecord;
    },

    /**
     * Get recipients with phone numbers from apartments
     */
    getRecipients(): NotificationRecipient[] {
        return AppState.apartments
            .filter(apt => apt.phone && apt.phone.trim() !== '')
            .map(apt => ({
                apartmentNo: apt.number,
                residentName: apt.residentName,
                phoneNumber: apt.phone,
                status: 'pending' as NotificationStatus
            }));
    },

    /**
     * Get recipients with unpaid dues for current month
     */
    getUnpaidDuesRecipients(year: number, month: number): NotificationRecipient[] {
        return AppState.apartments
            .filter(apt => {
                const hasDue = !AppState.dues[year]?.[apt.number]?.[month];
                const hasPhone = apt.phone && apt.phone.trim() !== '';
                return hasDue && hasPhone;
            })
            .map(apt => ({
                apartmentNo: apt.number,
                residentName: apt.residentName,
                phoneNumber: apt.phone,
                status: 'pending' as NotificationStatus
            }));
    },

    /**
     * Get message template with placeholders
     */
    getTemplate(templateType: NotificationTemplate): string {
        return MESSAGE_TEMPLATES[templateType] || '';
    },

    /**
     * Get notification history
     */
    getHistory(): NotificationHistory[] {
        return [...this.history].sort((a, b) =>
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
        );
    },

    /**
     * Check if GREEN-API is configured
     */
    isConfigured(): boolean {
        return !!(AppState.settings.greenApiIdInstance && AppState.settings.greenApiToken);
    },

    /**
     * Get GREEN-API config from settings
     */
    getConfig(): GreenApiConfig | null {
        if (!this.isConfigured()) return null;
        return {
            idInstance: AppState.settings.greenApiIdInstance,
            apiTokenInstance: AppState.settings.greenApiToken
        };
    },

    /**
     * Save GREEN-API credentials to settings
     */
    async saveConfig(idInstance: string, apiTokenInstance: string): Promise<void> {
        AppState.settings.greenApiIdInstance = idInstance;
        AppState.settings.greenApiToken = apiTokenInstance;
        toastSuccess('GREEN-API ayarları kaydedildi');
    },

    /**
     * Test GREEN-API connection
     */
    async testConnection(config: GreenApiConfig): Promise<boolean> {
        try {
            const url = `https://api.green-api.com/waInstance${config.idInstance}/getStateInstance/${config.apiTokenInstance}`;
            const response = await fetch(url);
            const result = await response.json();

            if (result.stateInstance === 'authorized') {
                toastSuccess('GREEN-API bağlantısı başarılı!');
                return true;
            } else {
                toastError(`Bağlantı hatası: ${result.stateInstance || 'Bilinmeyen durum'}`);
                return false;
            }
        } catch (error: any) {
            toastError('Bağlantı test edilemedi: ' + error.message);
            return false;
        }
    }
};

export default NotificationsService;
