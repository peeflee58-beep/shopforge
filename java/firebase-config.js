// java/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Your live ShopForge Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDdnV6XhERYXBngYuQC2ppmuGpBlSIQErY",
    authDomain: "shopforge-f2f40.firebaseapp.com",
    projectId: "shopforge-f2f40",
    storageBucket: "shopforge-f2f40.firebasestorage.app",
    messagingSenderId: "377211963425",
    appId: "1:377211963425:web:04a07fbd473d41e758fb60",
    measurementId: "G-VVMBEDSM9J"
};

// Initialize Firebase, Auth, Firestore, and Analytics
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);