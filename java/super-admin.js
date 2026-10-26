// java/super-admin.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        loadSuperAdminDashboard();
    });

    const logoutBtn = document.getElementById("superAdminLogout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "login.html";
        });
    }
});

async function loadSuperAdminDashboard() {
    const ordersContainer = document.getElementById("superAdminOrdersList");
    const vendorsContainer = document.getElementById("superAdminVendorsList");
    const statRevenue = document.getElementById("globalRevenue");
    const statOrders = document.getElementById("globalOrdersCount");
    const statVendors = document.getElementById("globalVendorsCount");

    try {
        // 1. Fetch all Orders
        const orderSnap = await getDocs(collection(db, "orders"));
        let orders = [];
        let totalRev = 0;

        orderSnap.forEach(d => {
            const data = d.data();
            orders.push({ id: d.id, ...data });
            totalRev += Number(data.totalAmount || 0);
        });

        if (statRevenue) statRevenue.textContent = `$${totalRev.toFixed(2)}`;
        if (statOrders) statOrders.textContent = orders.length;

        if (ordersContainer) {
            if (orders.length === 0) {
                ordersContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No orders on the platform yet.</p>`;
            } else {
                ordersContainer.innerHTML = "";
                orders.forEach(ord => {
                    const dateStr = ord.createdAt?.toDate ? ord.createdAt.toDate().toLocaleDateString() : "Recent";
                    const amt = Number(ord.totalAmount || 0).toFixed(2);
                    const statusColor = ord.status === "Accepted" ? "#4ade80" : (ord.status === "Declined" ? "#f87171" : "#facc15");

                    const div = document.createElement("div");
                    div.style.cssText = "padding: 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); border-radius: 8px; display: grid; gap: 8px;";
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);">
                            <span><i class="bi bi-clock"></i> ${dateStr} | Customer: ${ord.userEmail || 'Guest'}</span>
                            <span style="color: ${statusColor}; font-weight: 600;">${ord.status || 'Pending'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                            <strong style="color: white;">Order #${ord.id.slice(0, 8)} ($${amt})</strong>
                            <div style="display: flex; gap: 6px;">
                                <button onclick="window.updateOrderStatus('${ord.id}', 'Accepted')" style="background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.3); padding: 4px 8px; border-radius: 5px; cursor: pointer; font-size: 11px;">Accept</button>
                                <button onclick="window.deleteGlobalOrder('${ord.id}')" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); padding: 4px 8px; border-radius: 5px; cursor: pointer; font-size: 11px;"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    `;
                    ordersContainer.appendChild(div);
                });
            }
        }

        // 2. Fetch all Users / Vendors from 'users' collection
        const userSnap = await getDocs(collection(db, "users"));
        let vendors = [];

        userSnap.forEach(d => {
            const uData = d.data();
            if (uData.role === "seller" || uData.role === "admin") {
                vendors.push({ id: d.id, ...uData });
            }
        });

        if (statVendors) statVendors.textContent = vendors.length;

        if (vendorsContainer) {
            if (vendors.length === 0) {
                vendorsContainer.innerHTML = `<p style="color: var(--muted); font-size: 13px;">No registered vendors found.</p>`;
            } else {
                vendorsContainer.innerHTML = "";
                vendors.forEach(v => {
                    const div = document.createElement("div");
                    div.style.cssText = "padding: 10px 12px; background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;";
                    div.innerHTML = `
                        <div>
                            <h4 style="font-size: 12px; color: white;">${v.email || 'Vendor Account'}</h4>
                            <p style="font-size: 10px; color: var(--muted);">Role: ${v.role || 'Seller'}</p>
                        </div>
                        <span style="font-size: 11px; background: rgba(192, 132, 252, 0.15); color: #c084fc; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(192, 132, 252, 0.3);">Active</span>
                    `;
                    vendorsContainer.appendChild(div);
                });
            }
        }

    } catch (err) {
        console.error("Error loading super admin overview:", err);
    }
}

// Global Super Admin Actions
window.updateOrderStatus = async function(orderId, newStatus) {
    try {
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        alert(`Order status updated to ${newStatus}`);
        loadSuperAdminDashboard();
    } catch (err) {
        console.error("Error updating order:", err);
        alert("Failed to update order status.");
    }
};

window.deleteGlobalOrder = async function(orderId) {
    if (!confirm("Are you sure you want to delete this order from the platform?")) return;
    try {
        await deleteDoc(doc(db, "orders", orderId));
        alert("Order deleted successfully!");
        loadSuperAdminDashboard();
    } catch (err) {
        console.error("Error deleting order:", err);
        alert("Failed to delete order.");
    }
};