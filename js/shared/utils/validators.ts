/**
 * Validators - Input validation utilities
 */

interface ValidationResult {
    valid: boolean;
    message?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
        return { valid: false, message: 'E-posta adresi gerekli' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Geçerli bir e-posta adresi girin' };
    }

    return { valid: true };
}

/**
 * Validate phone number (Turkish format)
 */
export function validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim() === '') {
        return { valid: false, message: 'Telefon numarası gerekli' };
    }

    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Turkish mobile numbers: 5XX XXX XX XX (10 digits)
    // Or with country code: 90 5XX XXX XX XX (12 digits)
    if (digits.length !== 10 && digits.length !== 12) {
        return { valid: false, message: 'Telefon numarası 10 haneli olmalı' };
    }

    // Must start with 5 (mobile) or 90 5 (with country code)
    if (digits.length === 10 && !digits.startsWith('5')) {
        return { valid: false, message: 'Geçerli bir cep telefonu numarası girin' };
    }

    if (digits.length === 12 && !digits.startsWith('905')) {
        return { valid: false, message: 'Geçerli bir cep telefonu numarası girin' };
    }

    return { valid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
    if (value === null || value === undefined || value === '') {
        return { valid: false, message: `${fieldName} gerekli` };
    }

    if (typeof value === 'string' && value.trim() === '') {
        return { valid: false, message: `${fieldName} gerekli` };
    }

    return { valid: true };
}

/**
 * Validate number range
 */
export function validateNumberRange(
    value: number,
    min?: number,
    max?: number,
    fieldName = 'Değer'
): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, message: `${fieldName} bir sayı olmalı` };
    }

    if (min !== undefined && value < min) {
        return { valid: false, message: `${fieldName} en az ${min} olmalı` };
    }

    if (max !== undefined && value > max) {
        return { valid: false, message: `${fieldName} en fazla ${max} olmalı` };
    }

    return { valid: true };
}

/**
 * Validate date string
 */
export function validateDate(dateStr: string, fieldName = 'Tarih'): ValidationResult {
    if (!dateStr) {
        return { valid: false, message: `${fieldName} gerekli` };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return { valid: false, message: `Geçerli bir ${fieldName.toLowerCase()} girin` };
    }

    return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
    file: File,
    allowedTypes: string[]
): ValidationResult {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !allowedTypes.includes(extension)) {
        return {
            valid: false,
            message: `Desteklenen dosya türleri: ${allowedTypes.join(', ')}`
        };
    }

    return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): ValidationResult {
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxBytes) {
        return {
            valid: false,
            message: `Dosya boyutu en fazla ${maxSizeMB} MB olabilir`
        };
    }

    return { valid: true };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Sanitize for safe display
 */
export function sanitize(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
