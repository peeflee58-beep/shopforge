// java/buyer-dashboard.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }

        const nameEl = document.getElementById("buyerName");
        const emailEl = document.getElementById("buyerEmail");
        if (emailEl) emailEl.textContent = user.email;
        if (nameEl && user.displayName) {
            nameEl.textContent = user.displayName;
        } else if (nameEl && user.email) {
            nameEl.textContent = user.email.split('@')[0];
        }

        // Fetch orders strictly for this user
        fetchBuyerOrders(user.uid);
    });

    renderBuyerCart();
});

function renderBuyerCart() {
    const container = document.getElementById("buyerCartList");
    if (!container) return;

    const cart = JSON.parse(localStorage.getItem("shopforge_cart")) || [];

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: var(--muted); font-size: 13px; padding: 10px 0;">Your cart is currently empty. Head over to the catalogue to add items!</p>`;
        return;
    }

    container.innerHTML = "";
    cart.forEach(item => {
        const name = item.productName || item.name || "Product Item";
        const img = item.imageURL || item.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1170&auto=format&fit=crop";
        const price = Number(item.price || 0);
        const qty = item.quantity || 1;

        const div = document.createElement("div");
        div.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border); border-radius: 10px;";
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${img}" alt="${name}" style="width: 45px; height: 45px; object-fit: contain; background: #111c32; border-radius: 7px; padding: 4px;">
                <div>
                    <h4 style="font-size: 12px; font-weight: 500; color: white;">${name}</h4>
                    <p style="font-size: 11px; color: var(--muted);">Qty: ${qty}</p>
                </div>
            </div>
            <strong style="font-size: 13px; color: #93c5fd;">$${(price * qty).toFixed(2)}</strong>
        `;
        container.appendChild(div);
    });
}

async function fetchBuyerOrders(userId) {
    const orderContainer = document.getElementById("buyerOrderHistory");
    if (!orderContainer) return;

    try {
        // Query orders matching ONLY the logged-in user's ID
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            orderContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px; padding: 10px 0;">No past order history found. Place an order from the catalogue to see it here!</p>`;
            return;
        }

        orderContainer.innerHTML = "";
        querySnapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "Recent Order";
            const total = Number(order.totalAmount || 0).toFixed(2);
            const status = order.status || "Pending";
            const itemsCount = order.items ? order.items.reduce((acc, i) => acc + i.quantity, 0) : 1;

            const div = document.createElement("div");
            div.style.cssText = "padding: 15px; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border); border-radius: 10px; display: grid; gap: 8px; margin-bottom: 10px;";
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                    <span style="color: var(--muted);"><i class="bi bi-clock"></i> ${dateStr}</span>
                    <span style="padding: 3px 8px; background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 6px; font-weight: 500; font-size: 11px;">${status}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; font-weight: 500; color: white;">Order #${docSnap.id.slice(0, 8)} (${itemsCount} items)</span>
                    <strong style="font-size: 13px; color: #93c5fd;">$${total}</strong>
                </div>
            `;
            orderContainer.appendChild(div);
        });

    } catch (err) {
        console.error("Error fetching order history:", err);
        orderContainer.innerHTML = `<p style="color: #f87171; font-size: 13px; padding: 10px 0;">Could not load past orders.</p>`;
    }
}