/**
 * Notifications Service - WhatsApp notification with GREEN-API
 * Documentation: https://green-api.com/en/docs/api/sending/SendMessage/
 */

import { AppState } from '../../modules/state.js';
import { db, collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from '../../firebase-config.js';
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
 * Validate phone number
 */
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length < 10) {
        return { valid: false, error: 'Telefon numarası en az 10 haneli olmalı' };
    }
    
    if (cleaned.length > 15) {
        return { valid: false, error: 'Telefon numarası çok uzun' };
    }
    
    return { valid: true };
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
        config: GreenApiConfig,
        retryCount = 0
    ): Promise<{ success: boolean; error?: string; retryable?: boolean }> {
        try {
            // Validate phone number
            const phoneValidation = validatePhoneNumber(phone);
            if (!phoneValidation.valid) {
                return { success: false, error: phoneValidation.error, retryable: false };
            }

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

            // Handle HTTP errors
            if (!response.ok) {
                // Rate limit exceeded
                if (response.status === 429) {
                    if (retryCount < 3) {
                        // Exponential backoff
                        const delay = 1000 * Math.pow(2, retryCount);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.sendMessage(phone, message, config, retryCount + 1);
                    }
                    return { 
                        success: false, 
                        error: 'Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.',
                        retryable: true 
                    };
                }
                
                // Server errors
                if (response.status >= 500) {
                    if (retryCount < 2) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        return this.sendMessage(phone, message, config, retryCount + 1);
                    }
                    return { 
                        success: false, 
                        error: 'GREEN-API sunucu hatası. Lütfen daha sonra tekrar deneyin.',
                        retryable: true 
                    };
                }

                const result = await response.json().catch(() => ({}));
                return { success: false, error: result.message || `HTTP ${response.status}: Mesaj gönderilemedi`, retryable: false };
            }

            const result = await response.json();

            if (result.idMessage) {
                return { success: true };
            } else {
                return { success: false, error: result.message || 'Mesaj gönderilemedi', retryable: false };
            }
        } catch (error: any) {
            // Network errors
            if (error.name === 'TypeError' || error.message?.includes('fetch')) {
                return { 
                    success: false, 
                    error: 'İnternet bağlantısı yok veya sunucuya ulaşılamıyor.',
                    retryable: true 
                };
            }
            return { success: false, error: error.message || 'Network error', retryable: false };
        }
    },

    /**
     * Send bulk notifications to multiple recipients with optimized batch processing
     */
    async sendBulk(
        recipients: NotificationRecipient[],
        message: string,
        templateType: NotificationTemplate,
        config: GreenApiConfig,
        onProgress?: (sent: number, total: number, currentRecipient?: string) => void
    ): Promise<NotificationHistory> {
        const results: NotificationRecipient[] = [];
        let successCount = 0;
        let failedCount = 0;

        // Configuration for batch processing
        const BATCH_SIZE = 3;  // Send 3 messages at a time
        const BATCH_DELAY = 500; // Wait 0.5 seconds between batches
        const MESSAGE_DELAY = 200; // Wait 0.2 seconds between messages in a batch

        // Process in batches
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            
            // Process batch in parallel
            const batchPromises = batch.map(async (recipient, batchIndex) => {
                // Small delay between messages in batch
                if (batchIndex > 0) {
                    await new Promise(resolve => setTimeout(resolve, MESSAGE_DELAY * batchIndex));
                }

                // Skip if no phone number
                if (!recipient.phoneNumber) {
                    return {
                        ...recipient,
                        status: 'failed' as NotificationStatus,
                        errorMessage: 'Telefon numarası eksik'
                    };
                }

                // Validate phone
                const phoneValidation = validatePhoneNumber(recipient.phoneNumber);
                if (!phoneValidation.valid) {
                    return {
                        ...recipient,
                        status: 'failed' as NotificationStatus,
                        errorMessage: phoneValidation.error
                    };
                }

                // Replace placeholders in message
                const personalizedMessage = message
                    .replace(/{residentName}/g, recipient.residentName || 'Sakin')
                    .replace(/{apartmentNo}/g, String(recipient.apartmentNo || ''))
                    .replace(/{date}/g, new Date().toLocaleDateString('tr-TR'))
                    .replace(/{amount}/g, '500') // Default due amount
                    .replace(/{month}/g, new Date().toLocaleDateString('tr-TR', { month: 'long' }));

                const result = await this.sendMessage(recipient.phoneNumber, personalizedMessage, config);

                if (result.success) {
                    successCount++;
                    return {
                        ...recipient,
                        status: 'sent' as NotificationStatus,
                        sentAt: new Date().toISOString()
                    };
                } else {
                    failedCount++;
                    return {
                        ...recipient,
                        status: 'failed' as NotificationStatus,
                        errorMessage: result.error
                    };
                }
            });

            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Report progress
            const processedCount = Math.min(i + BATCH_SIZE, recipients.length);
            onProgress?.(processedCount, recipients.length, batch[batch.length - 1]?.residentName);

            // Wait between batches (except for last batch)
            if (i + BATCH_SIZE < recipients.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
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
            toastError('Bildirim geçmişi kaydedilemedi');
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
     * FIXED: Correctly identifies unpaid dues
     */
    getUnpaidDuesRecipients(year: number, month: number): NotificationRecipient[] {
        return AppState.apartments
            .filter(apt => {
                // Check if dues data exists and is properly structured
                const duesForYear = AppState.dues[year];
                if (!duesForYear) {
                    // No dues data for this year - consider all as unpaid
                    const hasPhone = apt.phone && apt.phone.trim() !== '';
                    return hasPhone;
                }

                const duesForApartment = duesForYear[apt.number];
                if (!duesForApartment) {
                    // No dues data for this apartment - consider as unpaid
                    const hasPhone = apt.phone && apt.phone.trim() !== '';
                    return hasPhone;
                }

                // FIXED: Check if paid (true) or not (false or undefined)
                const isPaid = duesForApartment[month] === true;
                const hasPhone = apt.phone && apt.phone.trim() !== '';
                
                return !isPaid && hasPhone;
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
     * Save GREEN-API credentials to settings and Firestore
     * FIXED: Now saves to Firestore for persistence
     */
    async saveConfig(idInstance: string, apiTokenInstance: string): Promise<boolean> {
        try {
            // Validate inputs
            if (!idInstance || !idInstance.trim()) {
                toastError('Instance ID gerekli');
                return false;
            }
            
            if (!apiTokenInstance || !apiTokenInstance.trim()) {
                toastError('API Token gerekli');
                return false;
            }

            // 1. Save to Firestore for persistence
            await setDoc(doc(db, 'settings', 'notifications'), {
                greenApiIdInstance: idInstance.trim(),
                greenApiToken: apiTokenInstance.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: AppState.currentUser?.uid || 'unknown'
            });
            
            // 2. Update AppState
            AppState.settings.greenApiIdInstance = idInstance.trim();
            AppState.settings.greenApiToken = apiTokenInstance.trim();
            
            // 3. Success message
            toastSuccess('GREEN-API ayarları kaydedildi');
            return true;
        } catch (error: any) {
            console.error('Error saving GREEN-API config:', error);
            toastError('Ayarlar kaydedilemedi: ' + error.message);
            return false;
        }
    },

    /**
     * Test GREEN-API connection
     */
    async testConnection(config: GreenApiConfig): Promise<boolean> {
        try {
            const url = `https://api.green-api.com/waInstance${config.idInstance}/getStateInstance/${config.apiTokenInstance}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                if (response.status === 401) {
                    toastError('Geçersiz API kimlik bilgileri. Lütfen Instance ID ve Token\'ı kontrol edin.');
                } else if (response.status === 404) {
                    toastError('Instance bulunamadı. Lütfen Instance ID\'yi kontrol edin.');
                } else {
                    toastError(`Bağlantı hatası: HTTP ${response.status}`);
                }
                return false;
            }
            
            const result = await response.json();

            if (result.stateInstance === 'authorized') {
                toastSuccess('GREEN-API bağlantısı başarılı!');
                return true;
            } else if (result.stateInstance === 'notAuthorized') {
                toastError('WhatsApp bağlantısı kurulmamış. Lütfen GREEN-API konsolunda QR kodu tarayın.');
                return false;
            } else if (result.stateInstance === 'blocked') {
                toastError('Hesap engellenmiş. Lütfen GREEN-API destek ile iletişime geçin.');
                return false;
            } else if (result.stateInstance === 'starting') {
                toastWarning('Instance başlatılıyor. Lütfen birkaç dakika bekleyip tekrar deneyin.');
                return false;
            } else {
                toastError(`Beklenmeyen durum: ${result.stateInstance || 'Bilinmeyen'}`);
                return false;
            }
        } catch (error: any) {
            console.error('Connection test error:', error);
            if (error.name === 'TypeError' || error.message?.includes('fetch')) {
                toastError('İnternet bağlantısı yok. Lütfen bağlantınızı kontrol edin.');
            } else {
                toastError('Bağlantı test edilemedi: ' + error.message);
            }
            return false;
        }
    }
};

export default NotificationsService;
