/**
 * Documents Types - Document management type definitions
 */

export type DocumentCategory =
    | 'financial'      // Mali tablolar, bütçe
    | 'legal'          // Sözleşmeler, yönetmelikler
    | 'maintenance'    // Bakım raporları
    | 'meeting'        // Toplantı tutanakları
    | 'insurance'      // Sigorta poliçeleri
    | 'general'        // Genel dökümanlar
    | 'other';

export type DocumentFileType = 'pdf' | 'excel' | 'word' | 'image' | 'other';

export interface Document {
    id?: string;
    title: string;
    description?: string;
    fileName: string;
    fileType: DocumentFileType;
    fileSize: number;           // bytes
    fileUrl: string;            // Firebase Storage URL
    storagePath: string;        // Firebase Storage path
    category: DocumentCategory;
    uploadedBy: string;         // user id or "admin"
    uploadedAt: string;         // ISO date
    isPublic: boolean;          // Tüm sakinler görebilir mi?
    allowedApartments?: number[];  // Sadece belirli daireler (opsiyonel)
    tags?: string[];
}

export interface DocumentUploadData {
    file: File;
    title: string;
    description?: string;
    category: DocumentCategory;
    isPublic: boolean;
    allowedApartments?: number[];
}

// Category labels for display
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
    financial: 'Mali Tablolar',
    legal: 'Yasal Dökümanlar',
    maintenance: 'Bakım Raporları',
    meeting: 'Toplantı Tutanakları',
    insurance: 'Sigorta Poliçeleri',
    general: 'Genel Dökümanlar',
    other: 'Diğer'
};

// Category icons
export const DOCUMENT_CATEGORY_ICONS: Record<DocumentCategory, string> = {
    financial: '💰',
    legal: '⚖️',
    maintenance: '🔧',
    meeting: '📋',
    insurance: '🛡️',
    general: '📁',
    other: '📄'
};

// File type icons
export const FILE_TYPE_ICONS: Record<DocumentFileType, string> = {
    pdf: '📕',
    excel: '📊',
    word: '📝',
    image: '🖼️',
    other: '📄'
};
