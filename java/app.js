// java/app.js
import { db, auth } from './firebase-config.js';
import { collection, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Global Cart State (Loaded from localStorage for persistence across pages)
window.cart = JSON.parse(localStorage.getItem("shopforge_cart")) || [];

function saveCart() {
    localStorage.setItem("shopforge_cart", JSON.stringify(window.cart));
}

function initApp() {
    // Hide Loader immediately
    const loader = document.getElementById("loader");
    if (loader) {
        setTimeout(() => loader.classList.add("hidden"), 400);
    }

    // Sticky Header Scroll Effect
    const siteHeader = document.getElementById("siteHeader");
    window.addEventListener("scroll", () => {
        if (!siteHeader) return;
        if (window.scrollY > 30) {
            siteHeader.classList.add("scrolled");
        } else {
            siteHeader.classList.remove("scrolled");
        }
    });

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById("mobileMenu");
    const navLinks = document.getElementById("navLinks");
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("mobile-open");
        });
    }

    // Cart Drawer Controls
    const cartTriggers = document.querySelectorAll(".cart-trigger");
    const cartDrawer = document.getElementById("cartDrawer");
    const cartOverlay = document.getElementById("cartOverlay");
    const closeCartBtn = document.getElementById("closeCart");

    function toggleCart(open) {
        if (!cartDrawer) return;
        if (open) {
            cartDrawer.classList.add("open");
            if (cartOverlay) cartOverlay.classList.add("open");
            document.body.classList.add("cart-open");
            renderCartUI();
        } else {
            cartDrawer.classList.remove("open");
            if (cartOverlay) cartOverlay.classList.remove("open");
            document.body.classList.remove("cart-open");
        }
    }

    cartTriggers.forEach(btn => btn.addEventListener("click", () => toggleCart(true)));
    if (closeCartBtn) closeCartBtn.addEventListener("click", () => toggleCart(false));
    if (cartOverlay) cartOverlay.addEventListener("click", () => toggleCart(false));

    // Auth State Header Update & Compact Logout Button
    onAuthStateChanged(auth, async (user) => {
        const loginBtn = document.getElementById("loginButton");
        const navActions = document.querySelector(".nav-actions");

        if (loginBtn && user) {
            loginBtn.textContent = user.email ? user.email.split('@')[0] : "Account";
            const isInFrontend = window.location.pathname.includes('/frontend/');

            // Check Firestore role
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().role === "seller") {
                    loginBtn.href = isInFrontend ? "admin.html" : "frontend/admin.html";
                } else {
                    loginBtn.href = isInFrontend ? "buyer-dashboard.html" : "frontend/buyer-dashboard.html";
                }
            } catch (err) {
                loginBtn.href = isInFrontend ? "buyer-dashboard.html" : "frontend/buyer-dashboard.html";
            }

            // Compact, elegant Logout button
            if (navActions && !document.getElementById("logoutButton")) {
                const logoutBtn = document.createElement("button");
                logoutBtn.id = "logoutButton";
                logoutBtn.style.cssText = `
                    background: rgba(239, 68, 68, 0.12);
                    color: #f87171;
                    border: 1px solid rgba(248, 113, 113, 0.25);
                    padding: 6px 10px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    margin-left: 6px;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                `;
                logoutBtn.innerHTML = `<i class="bi bi-box-arrow-right"></i> Logout`;

                logoutBtn.addEventListener("mouseover", () => {
                    logoutBtn.style.background = "rgba(239, 68, 68, 0.25)";
                });
                logoutBtn.addEventListener("mouseout", () => {
                    logoutBtn.style.background = "rgba(239, 68, 68, 0.12)";
                });

                logoutBtn.addEventListener("click", async () => {
                    try {
                        await signOut(auth);
                        localStorage.removeItem("shopforge_cart");
                        window.location.href = isInFrontend ? "login.html" : "frontend/login.html";
                    } catch (error) {
                        console.error("Logout error:", error);
                    }
                });

                navActions.appendChild(logoutBtn);
            }
        }
    });

    // Checkout Button Handler - Redirects to dedicated checkout page
    const checkoutBtn = document.getElementById("checkoutButton");
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            if (window.cart.length === 0) {
                showToast("Your cart is empty!");
                return;
            }
            const isInFrontend = window.location.pathname.includes('/frontend/');
            window.location.href = isInFrontend ? "checkout.html" : "frontend/checkout.html";
        });
    }

    renderCartUI();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

window.showToast = function(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
};

window.addToCartObject = function(product) {
    const existing = window.cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        window.cart.push({ ...product, price: Number(product.price), quantity: 1 });
    }
    saveCart();
    renderCartUI();
    showToast(`Added ${product.productName} to cart`);
};

window.removeFromCart = function(id) {
    window.cart = window.cart.filter(item => item.id !== id);
    saveCart();
    renderCartUI();
};

window.updateQuantity = function(id, delta) {
    const item = window.cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            window.removeFromCart(id);
        } else {
            saveCart();
            renderCartUI();
        }
    }
};

function renderCartUI() {
    const cartItemsContainer = document.getElementById("cartItems");
    const cartEmpty = document.getElementById("cartEmpty");
    const cartSummary = document.getElementById("cartSummary");
    const cartSubtotal = document.getElementById("cartSubtotal");
    const cartCount = document.getElementById("cartCount");

    if (!cartItemsContainer) return;

    const totalCount = window.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalCount;

    if (window.cart.length === 0) {
        cartItemsContainer.innerHTML = "";
        if (cartEmpty) cartEmpty.classList.add("visible");
        if (cartSummary) cartSummary.classList.add("hidden");
        return;
    }

    if (cartEmpty) cartEmpty.classList.remove("visible");
    if (cartSummary) cartSummary.classList.remove("hidden");

    let subtotal = 0;
    cartItemsContainer.innerHTML = "";

    window.cart.forEach(item => {
        const itemPrice = Number(item.price || 0);
        subtotal += itemPrice * item.quantity;
        cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.imageURL || item.image || 'https://via.placeholder.com/150'}" alt="${item.productName || item.name}">
                </div>
                <div>
                    <h4>${item.productName || item.name}</h4>
                    <p>$${itemPrice.toFixed(2)} × ${item.quantity}</p>
                    <div class="cart-item-price">$${(itemPrice * item.quantity).toFixed(2)}</div>
                </div>
                <button class="remove-item" onclick="window.removeFromCart('${item.id}')" aria-label="Remove item">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
    });

    if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
}

const revealElements = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("show");
        }
    });
}, {
    threshold: 0.1
});

revealElements.forEach(element => {
    revealObserver.observe(element);
});