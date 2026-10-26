// java/admin.js
import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Auth Check & Load Dashboard
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.html";
        } else {
            loadVendorDashboard(user);
        }
    });

    const logoutBtn = document.getElementById("adminLogoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.html";
        });
    }

    // Handle Product Publishing Form
    const form = document.getElementById("addProductForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const publishBtn = document.getElementById("publishBtn");
            const user = auth.currentUser;
            if (!user) return;

            publishBtn.disabled = true;
            publishBtn.textContent = "Publishing...";

            try {
                const stockQty = parseInt(document.getElementById("productStock").value, 10) || 0;

                await addDoc(collection(db, "products"), {
                    sellerId: user.uid,
                    sellerEmail: user.email,
                    productName: document.getElementById("productName").value.trim(),
                    category: document.getElementById("productCategory").value,
                    price: Number(document.getElementById("productPrice").value),
                    stockQuantity: stockQty,
                    imageURL: document.getElementById("productImage").value.trim(),
                    badge: document.getElementById("productBadge").value.trim(),
                    description: document.getElementById("productDesc").value.trim(),
                    createdAt: serverTimestamp()
                });

                alert("Product successfully published!");
                form.reset();
                loadVendorDashboard(user);
            } catch (err) {
                console.error("Error publishing product:", err);
                alert("Failed to publish product.");
            } finally {
                publishBtn.disabled = false;
                publishBtn.textContent = "Publish Product";
            }
        });
    }
});

async function loadVendorDashboard(user) {
    const productContainer = document.getElementById("vendorProductList");
    const orderContainer = document.getElementById("vendorOrderList");
    
    const statRevenue = document.getElementById("statRevenue");
    const statOrders = document.getElementById("statOrders");
    const statProducts = document.getElementById("statProducts");

    try {
        // 1. Fetch products owned strictly by THIS seller
        const qProds = query(collection(db, "products"), where("sellerId", "==", user.uid));
        const prodSnap = await getDocs(qProds);
        
        let vendorProducts = [];
        prodSnap.forEach(d => vendorProducts.push({ id: d.id, ...d.data() }));

        if (statProducts) statProducts.textContent = vendorProducts.length;

        // Render Inventory List with Stock Tracking
        if (productContainer) {
            if (vendorProducts.length === 0) {
                productContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No products published yet. Create your first listing using the form on the left!</p>`;
            } else {
                productContainer.innerHTML = "";
                vendorProducts.forEach(item => {
                    const stock = item.stockQuantity !== undefined ? item.stockQuantity : "N/A";
                    const stockBadgeColor = stock > 5 ? "#4ade80" : (stock > 0 ? "#facc15" : "#f87171");

                    const div = document.createElement("div");
                    div.style.cssText = "display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); border-radius: 8px;";
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${item.imageURL || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: contain; background: #111; border-radius: 6px; padding: 2px;">
                            <div>
                                <h4 style="font-size: 13px; color: white; margin-bottom: 2px;">${item.productName}</h4>
                                <p style="font-size: 11px; color: var(--muted); display: flex; gap: 10px; align-items: center;">
                                    <span>$${Number(item.price).toFixed(2)} | ${item.category}</span>
                                    <span style="color: ${stockBadgeColor}; font-weight: 600;"><i class="bi bi-box"></i> ${stock} in stock</span>
                                </p>
                            </div>
                        </div>
                        <button onclick="window.deleteProduct('${item.id}')" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px;">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    `;
                    productContainer.appendChild(div);
                });
            }
        }

        // 2. Fetch Orders containing items published by THIS seller
        if (vendorProducts.length === 0) {
            if (statRevenue) statRevenue.textContent = "$0.00";
            if (statOrders) statOrders.textContent = "0";
            if (orderContainer) {
                orderContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No customer orders received yet.</p>`;
            }
            return;
        }

        const vendorProdIds = new Set(vendorProducts.map(p => p.id));
        const vendorProdNames = new Set(vendorProducts.map(p => p.productName));

        const orderSnap = await getDocs(collection(db, "orders"));
        let vendorOrders = [];
        let totalRev = 0;

        orderSnap.forEach(d => {
            const ord = d.data();
            if (ord.items && Array.isArray(ord.items)) {
                const relevantItems = ord.items.filter(item => 
                    vendorProdIds.has(item.id) || vendorProdNames.has(item.productName)
                );

                if (relevantItems.length > 0) {
                    const orderVendorTotal = relevantItems.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0);
                    totalRev += orderVendorTotal;

                    vendorOrders.push({
                        id: d.id,
                        createdAt: ord.createdAt,
                        status: ord.status,
                        items: relevantItems,
                        orderTotal: orderVendorTotal
                    });
                }
            }
        });

        if (statRevenue) statRevenue.textContent = `$${totalRev.toFixed(2)}`;
        if (statOrders) statOrders.textContent = vendorOrders.length;

        if (orderContainer) {
            if (vendorOrders.length === 0) {
                orderContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No customer orders received for your products yet.</p>`;
            } else {
                orderContainer.innerHTML = "";
                vendorOrders.forEach(ord => {
                    const dateStr = ord.createdAt?.toDate ? ord.createdAt.toDate().toLocaleDateString() : "Recent";
                    const itemCount = ord.items.reduce((sum, i) => sum + i.quantity, 0);

                    const div = document.createElement("div");
                    div.style.cssText = "padding: 12px 14px; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); border-radius: 8px; display: grid; gap: 5px;";
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);">
                            <span><i class="bi bi-clock"></i> ${dateStr}</span>
                            <span style="color: #4ade80; font-weight: 500;">${ord.status || 'Pending'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px;">
                            <strong style="color: white;">Order #${ord.id.slice(0, 8)} (${itemCount} of your items)</strong>
                            <span style="color: #93c5fd; font-weight: 600;">$${ord.orderTotal.toFixed(2)}</span>
                        </div>
                    `;
                    orderContainer.appendChild(div);
                });
            }
        }

    } catch (err) {
        console.error("Error loading vendor metrics:", err);
    }
}

// Global Delete Function
window.deleteProduct = async function(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
        await deleteDoc(doc(db, "products", id));
        alert("Product deleted!");
        if (auth.currentUser) loadVendorDashboard(auth.currentUser);
    } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product.");
    }
};