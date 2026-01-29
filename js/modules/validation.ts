/* =========================================
   Validation Module - Input Validation & Sanitization
   ========================================= */

// ===== Validation Rules =====

/**
 * Validate required field
 */
export function isRequired(value, fieldName = 'Alan') {
    if (value === null || value === undefined || value.toString().trim() === '') {
        return { valid: false, message: `${fieldName} zorunludur` };
    }
    return { valid: true };
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
    if (!email) return { valid: false, message: 'E-posta adresi zorunludur' };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Geçerli bir e-posta adresi girin' };
    }
    return { valid: true };
}

/**
 * Validate phone number (Turkish format)
 */
export function isValidPhone(phone) {
    if (!phone) return { valid: true }; // Optional field
    // Remove spaces, dashes, parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Turkish phone: 10-11 digits, may start with 0 or +90
    const phoneRegex = /^(\+90|0)?[1-9][0-9]{9}$/;
    if (!phoneRegex.test(cleaned)) {
        return { valid: false, message: 'Geçerli bir telefon numarası girin (ör: 0532 123 4567)' };
    }
    return { valid: true };
}

/**
 * Validate number within range
 */
export function isInRange(value, min, max, fieldName = 'Değer') {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return { valid: false, message: `${fieldName} geçerli bir sayı olmalıdır` };
    }
    if (num < min || num > max) {
        return { valid: false, message: `${fieldName} ${min} ile ${max} arasında olmalıdır` };
    }
    return { valid: true };
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value, fieldName = 'Tutar') {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
        return { valid: false, message: `${fieldName} pozitif bir sayı olmalıdır` };
    }
    return { valid: true };
}

/**
 * Validate date
 */
export function isValidDate(dateStr, fieldName = 'Tarih') {
    if (!dateStr) {
        return { valid: false, message: `${fieldName} zorunludur` };
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return { valid: false, message: `${fieldName} geçerli bir tarih olmalıdır` };
    }
    return { valid: true };
}

/**
 * Validate max length
 */
export function maxLength(value, max, fieldName = 'Metin') {
    if (value && value.length > max) {
        return { valid: false, message: `${fieldName} en fazla ${max} karakter olabilir` };
    }
    return { valid: true };
}

/**
 * Validate min length
 */
export function minLength(value, min, fieldName = 'Metin') {
    if (!value || value.length < min) {
        return { valid: false, message: `${fieldName} en az ${min} karakter olmalıdır` };
    }
    return { valid: true };
}

// ===== Sanitization =====

/**
 * Sanitize text input - remove dangerous characters
 */
export function sanitizeText(text) {
    if (!text) return '';
    return text
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets
        .substring(0, 5000); // Max length protection
}

/**
 * Sanitize number input
 */
export function sanitizeNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return Math.max(0, num);
}

// ===== Form Validation Helper =====

/**
 * Validate form data with rules
 * @param {Object} data - Form data
 * @param {Object} rules - Validation rules { fieldName: [rule1, rule2, ...] }
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateForm(data, rules) {
    const errors = {};
    let valid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
        for (const rule of (fieldRules as Function[])) {
            const result = rule(data[field]);
            if (!result.valid) {
                errors[field] = result.message;
                valid = false;
                break; // Stop at first error for this field
            }
        }
    }

    return { valid, errors };
}

/**
 * Show validation errors on form
 */
export function showFormErrors(formId, errors) {
    // Clear previous errors
    document.querySelectorAll(`#${formId} .field-error`).forEach(el => el.remove());
    document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove('input-error'));

    // Show new errors
    for (const [field, message] of Object.entries(errors)) {
        const input = document.getElementById(field);
        if (input) {
            input.classList.add('input-error');
            const errorEl = document.createElement('span');
            errorEl.className = 'field-error';
            errorEl.textContent = message as string;
            input.parentNode.appendChild(errorEl);
        }
    }
}

/**
 * Clear form errors
 */
export function clearFormErrors(formId) {
    document.querySelectorAll(`#${formId} .field-error`).forEach(el => el.remove());
    document.querySelectorAll(`#${formId} .input-error`).forEach(el => el.classList.remove('input-error'));
}
