/* =========================================
   Firebase Service Module - Database Operations
   ========================================= */

import {
    db, collection, getDocs, addDoc, deleteDoc, doc, setDoc,
    COLLECTIONS
} from '../firebase-config.js';

// ===== Firebase Data Service =====
export const FirebaseService = {
    async loadCollection(colName) {
        try {
            const snapshot = await getDocs(collection(db, colName));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.error(`Error loading ${colName}:`, e);
            return [];
        }
    },

    async save(colName, id, data) {
        try {
            await setDoc(doc(db, colName, id), data, { merge: true });
        } catch (e) {
            console.error(`Error saving to ${colName}:`, e);
            throw e;
        }
    },

    async add(colName, data) {
        try {
            const docRef = await addDoc(collection(db, colName), data);
            return docRef.id;
        } catch (e) {
            console.error(`Error adding to ${colName}:`, e);
            throw e;
        }
    },

    async delete(colName, id) {
        try {
            await deleteDoc(doc(db, colName, id));
        } catch (e) {
            console.error(`Error deleting from ${colName}:`, e);
            throw e;
        }
    }
};

export { COLLECTIONS };

