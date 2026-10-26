// java/login.js
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("sellerEmail").value.trim();
    const password = document.getElementById("sellerPassword").value;
    const btn = document.getElementById("loginBtn");

    btn.disabled = true;
    btn.textContent = "Signing in...";

    try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        // Fetch user role from Firestore 'users' collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === "seller") {
                window.location.href = "admin.html"; // Redirect seller to vendor dashboard
            } else {
                window.location.href = "buyer-dashboard.html"; // Redirect buyer to buyer dashboard
            }
        } else {
            // Fallback if user doc doesn't exist yet
            window.location.href = "products.html";
        }
    } catch (error) {
        alert("Login failed: " + error.message);
        btn.disabled, (btn.disabled = false);
        btn.textContent = "Sign In";
    }
});