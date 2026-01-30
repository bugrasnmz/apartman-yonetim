/**
 * Documents Service - Document management operations with Firebase Storage
 */

import {
    db, storage,
    collection, getDocs, addDoc, deleteDoc, doc,
    ref, uploadBytes, getDownloadURL, deleteObject,
    COLLECTIONS
} from '../../firebase-config.js';
import { AppState } from '../../modules/state.js';
import { toastSuccess, toastError } from '../../shared/ui/toast.js';
import { eventBus, EVENTS } from '../../core/events.js';
import type { Document, DocumentUploadData, DocumentFileType, DocumentCategory } from './documents.types.js';

/**
 * Determine file type from extension
 */
function getFileType(fileName: string): DocumentFileType {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'pdf':
            return 'pdf';
        case 'xls':
        case 'xlsx':
        case 'csv':
            return 'excel';
        case 'doc':
        case 'docx':
            return 'word';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return 'image';
        default:
            return 'other';
    }
}

/**
 * Generate unique ID
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Documents Service - CRUD operations with Firebase Storage
 */
export const DocumentsService = {
    documents: [] as Document[],

    /**
     * Initialize - load all documents from Firestore
     */
    async initialize(): Promise<void> {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.DOCUMENTS));
            this.documents = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Document));
        } catch (error) {
            console.error('Error loading documents:', error);
            throw error;
        }
    },

    /**
     * Get all documents
     */
    getAll(): Document[] {
        return [...this.documents].sort((a, b) =>
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
        );
    },

    /**
     * Get documents by category
     */
    getByCategory(category: DocumentCategory): Document[] {
        return this.documents
            .filter(d => d.category === category)
            .sort((a, b) =>
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
            );
    },

    /**
     * Get public documents (for residents)
     */
    getPublic(): Document[] {
        return this.documents
            .filter(d => d.isPublic)
            .sort((a, b) =>
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
            );
    },

    /**
     * Get documents accessible by a specific apartment
     */
    getForApartment(apartmentNo: number): Document[] {
        return this.documents
            .filter(d =>
                d.isPublic ||
                (d.allowedApartments && d.allowedApartments.includes(apartmentNo))
            )
            .sort((a, b) =>
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
            );
    },

    /**
     * Upload a new document
     */
    async upload(data: DocumentUploadData): Promise<Document> {
        try {
            const { file, title, description, category, isPublic, allowedApartments } = data;

            // Generate unique filename
            const fileId = generateId();
            const fileExt = file.name.split('.').pop();
            const storagePath = `documents/${category}/${fileId}.${fileExt}`;

            // Upload to Firebase Storage
            const storageRef = ref(storage, storagePath);
            await uploadBytes(storageRef, file);

            // Get download URL
            const fileUrl = await getDownloadURL(storageRef);

            // Create document record
            const document: Document = {
                title,
                description,
                fileName: file.name,
                fileType: getFileType(file.name),
                fileSize: file.size,
                fileUrl,
                storagePath,
                category,
                uploadedBy: AppState.currentUser?.role === 'admin' ? 'admin' : 'unknown',
                uploadedAt: new Date().toISOString(),
                isPublic,
                allowedApartments
            };

            // Save to Firestore
            const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), document);
            document.id = docRef.id;

            // Update local state
            this.documents.push(document);

            eventBus.emit(EVENTS.DOCUMENT_UPLOADED, document);
            toastSuccess('Döküman yüklendi');

            return document;
        } catch (error) {
            console.error('Error uploading document:', error);
            toastError('Döküman yüklenirken bir hata oluştu');
            throw error;
        }
    },

    /**
     * Delete a document
     */
    async delete(id: string): Promise<boolean> {
        try {
            const document = this.documents.find(d => d.id === id);
            if (!document) {
                toastError('Döküman bulunamadı');
                return false;
            }

            // Delete from Firebase Storage
            const storageRef = ref(storage, document.storagePath);
            await deleteObject(storageRef);

            // Delete from Firestore
            await deleteDoc(doc(db, COLLECTIONS.DOCUMENTS, id));

            // Update local state
            this.documents = this.documents.filter(d => d.id !== id);

            eventBus.emit(EVENTS.DOCUMENT_DELETED, document);
            toastSuccess('Döküman silindi');

            return true;
        } catch (error) {
            console.error('Error deleting document:', error);
            toastError('Döküman silinirken bir hata oluştu');
            return false;
        }
    },

    /**
     * Get document by ID
     */
    getById(id: string): Document | undefined {
        return this.documents.find(d => d.id === id);
    },

    /**
     * Search documents by title
     */
    search(query: string): Document[] {
        const lowerQuery = query.toLowerCase();
        return this.documents.filter(d =>
            d.title.toLowerCase().includes(lowerQuery) ||
            d.description?.toLowerCase().includes(lowerQuery) ||
            d.fileName.toLowerCase().includes(lowerQuery)
        );
    },

    /**
     * Get statistics
     */
    getStats(): { total: number; byCategory: Record<DocumentCategory, number> } {
        const byCategory: Record<DocumentCategory, number> = {
            financial: 0,
            legal: 0,
            maintenance: 0,
            meeting: 0,
            insurance: 0,
            general: 0,
            other: 0
        };

        this.documents.forEach(d => {
            byCategory[d.category]++;
        });

        return {
            total: this.documents.length,
            byCategory
        };
    }
};

export default DocumentsService;
