import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBxn6PXq7CjQGklvI8prNMIJiai2t5916w",
    authDomain: "apartman-yonetim-18730.firebaseapp.com",
    projectId: "apartman-yonetim-18730",
    storageBucket: "apartman-yonetim-18730.firebasestorage.app",
    messagingSenderId: "894085676637",
    appId: "1:894085676637:web:c869c1f38f7e720c8a17b4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Collection References
const COLLECTIONS = {
    APARTMENTS: 'apartments',
    TRANSACTIONS: 'transactions',
    BILLS: 'bills',
    DECISIONS: 'decisions',
    MAINTENANCE: 'maintenance',
    TASKS: 'tasks',
    DUES: 'dues',
    SETTINGS: 'settings'
};

export {
    app, db, auth,
    collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
    signInWithEmailAndPassword, signOut, onAuthStateChanged,
    COLLECTIONS
};
