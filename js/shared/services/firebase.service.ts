/**
 * Firebase Service - Shared service for Firestore CRUD operations
 */

import {
    db, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc
} from '../../firebase-config.js';
import { toastError } from '../ui/toast.js';

export interface FirebaseDocument {
    id?: string;
    [key: string]: any;
}

/**
 * Firebase CRUD Service
 */
export const FirebaseService = {
    /**
     * Load all documents from a collection
     */
    async loadCollection<T extends FirebaseDocument>(colName: string): Promise<T[]> {
        try {
            const querySnapshot = await getDocs(collection(db, colName));
            if (querySnapshot.empty) return [];
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        } catch (e) {
            console.error(`Error loading ${colName}:`, e);
            throw e;
        }
    },

    /**
     * Get a single document by ID
     */
    async getDocument<T extends FirebaseDocument>(colName: string, id: string): Promise<T | null> {
        try {
            const docSnap = await getDoc(doc(db, colName, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as T;
            }
            return null;
        } catch (e) {
            console.error(`Error getting ${colName}/${id}:`, e);
            throw e;
        }
    },

    /**
     * Save a document (create or update with merge)
     */
    async save(colName: string, id: string, data: any): Promise<void> {
        try {
            await setDoc(doc(db, colName, id), data, { merge: true });
        } catch (e) {
            console.error(`Error saving to ${colName}:`, e);
            toastError('Kaydetme hatası! Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
            throw e;
        }
    },

    /**
     * Add a new document
     */
    async add(colName: string, data: any): Promise<string> {
        try {
            // Use setDoc if id is provided, else addDoc
            if (data.id) {
                await setDoc(doc(db, colName, data.id), data);
                return data.id;
            } else {
                const docRef = await addDoc(collection(db, colName), data);
                return docRef.id;
            }
        } catch (e) {
            console.error(`Error adding to ${colName}:`, e);
            throw e;
        }
    },

    /**
     * Update an existing document
     */
    async update(colName: string, id: string, data: Partial<any>): Promise<void> {
        try {
            await updateDoc(doc(db, colName, id), data);
        } catch (e) {
            console.error(`Error updating ${colName}/${id}:`, e);
            toastError('Güncelleme hatası! Lütfen sayfayı yenileyip tekrar deneyin.');
            throw e;
        }
    },

    /**
     * Delete a document
     */
    async delete(colName: string, id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, colName, id));
        } catch (e) {
            console.error(`Error deleting from ${colName}:`, e);
            toastError('Silme hatası! Lütfen sayfayı yenileyip tekrar deneyin.');
            throw e;
        }
    }
};

// Export as default for simpler imports
export default FirebaseService;
