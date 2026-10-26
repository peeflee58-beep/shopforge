// java/checkout.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Check auth
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const emailInput = document.getElementById("shipEmail");
            if (emailInput && !emailInput.value) emailInput.value = user.email;
        }
    });

    renderCheckoutCart();
    loadRecommendations();

    // Handle Order Submission
    const form = document.getElementById("checkoutForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            let cart = JSON.parse(localStorage.getItem("shopforge_cart")) || [];
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("You must be logged in to complete checkout.");
                window.location.href = "login.html";
                return;
            }

            const btn = document.getElementById("placeOrderBtn");
            btn.disabled = true;
            btn.textContent = "Processing payment & order...";

            try {
                const totalAmount = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

                // 1. Save order to Firestore with userId attached for strict isolation
                const docRef = await addDoc(collection(db, "orders"), {
                    userId: currentUser.uid,
                    userEmail: currentUser.email,
                    items: cart,
                    totalAmount: totalAmount,
                    shippingDetails: {
                        name: document.getElementById("shipName").value,
                        email: document.getElementById("shipEmail").value,
                        address: document.getElementById("shipAddress").value,
                        city: document.getElementById("shipCity").value,
                        zip: document.getElementById("shipZip").value
                    },
                    createdAt: serverTimestamp(),
                    status: "Pending"
                });

                // 2. Automatically deduct stock in Firestore
                for (const item of cart) {
                    if (item.id) {
                        try {
                            const prodRef = doc(db, "products", item.id);
                            await updateDoc(prodRef, {
                                stockQuantity: increment(-item.quantity)
                            });
                        } catch (err) {
                            console.warn("Stock decrement warning:", err);
                        }
                    }
                }

                // 3. Save order data for success page and clear cart
                const orderData = {
                    orderId: docRef.id,
                    items: cart,
                    totalAmount: totalAmount,
                    shippingDetails: {
                        name: document.getElementById("shipName").value,
                        email: document.getElementById("shipEmail").value,
                        address: document.getElementById("shipAddress").value,
                        city: document.getElementById("shipCity").value,
                        zip: document.getElementById("shipZip").value
                    }
                };

                localStorage.setItem("shopforge_last_order", JSON.stringify(orderData));
                localStorage.removeItem("shopforge_cart");

                // 4. Redirect to Order Success Page
                window.location.href = "order-success.html";

            } catch (err) {
                console.error("Checkout error:", err);
                alert("Checkout failed. Please try again.");
                btn.disabled = false;
                btn.textContent = "Place Order & Pay Now";
            }
        });
    }
});

function renderCheckoutCart() {
    let cart = JSON.parse(localStorage.getItem("shopforge_cart")) || [];
    const container = document.getElementById("checkoutItemsList");
    const subtotalEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutTotal");

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: var(--muted); font-size: 13px;">Your cart is empty.</p>`;
        if (subtotalEl) subtotalEl.textContent = "$0.00";
        if (totalEl) totalEl.textContent = "$0.00";
        return;
    }

    container.innerHTML = "";
    let subtotal = 0;

    cart.forEach(item => {
        const price = Number(item.price || 0);
        subtotal += price * item.quantity;

        container.innerHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(15, 23, 42, 0.7); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${item.imageURL || item.image || 'https://via.placeholder.com/40'}" style="width: 35px; height: 35px; object-fit: contain; background: #111; border-radius: 4px; padding: 2px;">
                    <div>
                        <h4 style="font-size: 12px; color: white;">${item.productName || item.name}</h4>
                        <p style="font-size: 11px; color: var(--muted);">$${price.toFixed(2)} × ${item.quantity}</p>
                    </div>
                </div>
                <strong style="font-size: 12px; color: #60a5fa;">$${(price * item.quantity).toFixed(2)}</strong>
            </div>
        `;
    });

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;
}

async function loadRecommendations() {
    const grid = document.getElementById("recommendedProductsGrid");
    if (!grid) return;

    try {
        const snap = await getDocs(collection(db, "products"));
        let products = [];
        snap.forEach(d => products.push({ id: d.id, ...d.data() }));

        if (products.length === 0) {
            grid.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No recommendations available right now.</p>`;
            return;
        }

        const shuffled = products.sort(() => 0.5 - Math.random()).slice(0, 4);

        grid.innerHTML = "";
        shuffled.forEach(prod => {
            const card = document.createElement("div");
            card.style.cssText = "background: linear-gradient(150deg, #0d172b, #080f20); border: 1px solid var(--border); padding: 15px; border-radius: 14px; display: grid; gap: 10px; text-align: left;";
            card.innerHTML = `
                <div style="background: #111; height: 140px; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <img src="${prod.imageURL || 'https://via.placeholder.com/150'}" style="max-height: 100%; object-fit: contain;">
                </div>
                <div>
                    <span style="font-size: 10px; color: var(--muted); text-transform: uppercase;">${prod.category || 'Featured'}</span>
                    <h4 style="font-size: 13px; color: white; margin-top: 2px;">${prod.productName}</h4>
                    <strong style="font-size: 14px; color: #4ade80; display: block; margin-top: 5px;">$${Number(prod.price).toFixed(2)}</strong>
                </div>
                <button onclick='window.addRecommendedToCart(${JSON.stringify(prod)})' style="background: rgba(37, 99, 235, 0.2); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); padding: 8px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 5px;">
                    <i class="bi bi-bag-plus"></i> Add to Cart
                </button>
            `;
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading recommendations:", err);
    }
}

window.addRecommendedToCart = function(product) {
    let cart = JSON.parse(localStorage.getItem("shopforge_cart")) || [];
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, price: Number(product.price), quantity: 1 });
    }
    localStorage.setItem("shopforge_cart", JSON.stringify(cart));
    renderCheckoutCart();
    alert(`Added ${product.productName} to your cart!`);
};