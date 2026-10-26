import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let selectedRole = "buyer";

// Role toggle buttons
document.querySelectorAll(".role-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".role-btn").forEach(b => {
            b.classList.remove("active");
            b.style.background = "transparent";
            b.style.borderColor = "var(--border)";
            b.style.color = "var(--muted)";
        });
        e.target.classList.add("active");
        e.target.style.background = "rgba(59, 130, 246, 0.15)";
        e.target.style.borderColor = "rgba(96, 165, 250, 0.5)";
        e.target.style.color = "white";
        selectedRole = e.target.getAttribute("data-role");
    });
});

document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const btn = document.getElementById("signupBtn");

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save user role & metadata in Firestore 'users' collection
        await setDoc(doc(db, "users", user.uid), {
            fullName: name,
            email: email,
            role: selectedRole,
            createdAt: new Date().toISOString()
        });

        // Redirect based on role
        if (selectedRole === "seller") {
            window.location.href = "admin.html";
        } else {
            alert("Account created successfully! Please sign in.");
            window.location.href = "login.html";
        }
    } catch (error) {
        alert("Sign up failed: " + error.message);
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
});