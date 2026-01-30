/**
 * Notifications Service - WhatsApp notification with CallMeBot API
 */

import { AppState } from '../../modules/state.js';
import { db, collection, addDoc, getDocs, COLLECTIONS } from '../../firebase-config.js';
import { toastSuccess, toastError, toastWarning } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type {
    Notification,
    NotificationRecipient,
    NotificationHistory,
    NotificationTemplate,
    NotificationStatus,
    CallMeBotConfig
} from './notifications.types.js';
import { MESSAGE_TEMPLATES } from './notifications.types.js';

/**
 * Generate unique ID
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format phone number for CallMeBot (must be international format without +)
 * Turkish numbers: 905XXXXXXXXX
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

    return cleaned;
}

/**
 * CallMeBot API URL builder
 * API format: https://api.callmebot.com/whatsapp.php?phone=XXXXX&text=MESSAGE&apikey=KEY
 */
function buildCallMeBotUrl(phone: string, message: string, apiKey: string): string {
    const encodedMessage = encodeURIComponent(message);
    return `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMessage}&apikey=${apiKey}`;
}

/**
 * Notifications Service - Send WhatsApp messages via CallMeBot
 */
export const NotificationsService = {
    history: [] as NotificationHistory[],

    /**
     * Initialize - load notification history from Firestore
     */
    async initialize(): Promise<void> {
        try {
            // Check if NOTIFICATIONS collection exists in constants
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
     * Send a single WhatsApp message via CallMeBot
     * Note: CallMeBot requires each user to activate their phone first
     */
    async sendMessage(phone: string, message: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
        try {
            const formattedPhone = formatPhoneNumber(phone);
            const url = buildCallMeBotUrl(formattedPhone, message, apiKey);

            // CallMeBot uses GET request
            const response = await fetch(url);

            if (response.ok) {
                return { success: true };
            } else {
                const errorText = await response.text();
                return { success: false, error: errorText };
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
        apiKey: string
    ): Promise<NotificationHistory> {
        const results: NotificationRecipient[] = [];
        let successCount = 0;
        let failedCount = 0;

        // Send with delay to avoid rate limiting (1 message per second)
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

            const result = await this.sendMessage(recipient.phoneNumber, personalizedMessage, apiKey);

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

            // Wait 1.5 seconds between messages (CallMeBot rate limit)
            await new Promise(resolve => setTimeout(resolve, 1500));
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
            .filter(apt => apt.contactNumber && apt.contactNumber.trim() !== '')
            .map(apt => ({
                apartmentNo: apt.apartmentNo,
                residentName: apt.residentName,
                phoneNumber: apt.contactNumber,
                status: 'pending' as NotificationStatus
            }));
    },

    /**
     * Get recipients with unpaid dues for current month
     */
    getUnpaidDuesRecipients(year: number, month: number): NotificationRecipient[] {
        return AppState.apartments
            .filter(apt => {
                const hasDue = !AppState.dues[year]?.[apt.apartmentNo]?.[month];
                const hasPhone = apt.contactNumber && apt.contactNumber.trim() !== '';
                return hasDue && hasPhone;
            })
            .map(apt => ({
                apartmentNo: apt.apartmentNo,
                residentName: apt.residentName,
                phoneNumber: apt.contactNumber,
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
     * Check if CallMeBot API key is configured
     */
    isConfigured(): boolean {
        return !!(AppState.settings.callMeBotApiKey);
    },

    /**
     * Save CallMeBot API key to settings
     */
    async saveApiKey(apiKey: string): Promise<void> {
        AppState.settings.callMeBotApiKey = apiKey;
        // Save to Firestore via settings
        // This should be handled by the main app's settings save
        toastSuccess('API anahtarı kaydedildi');
    }
};

export default NotificationsService;
