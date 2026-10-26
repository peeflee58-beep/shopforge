// java/order-success.js
document.addEventListener("DOMContentLoaded", () => {
    const lastOrder = JSON.parse(localStorage.getItem("shopforge_last_order"));

    if (!lastOrder) {
        // Fallback if accessed directly without an order
        document.getElementById("successOrderId").textContent = "ORD-20261026-9999";
        document.getElementById("successOrderDate").textContent = new Date().toLocaleDateString();
        return;
    }

    // Populate Order ID and Date
    if (lastOrder.orderId) {
        document.getElementById("successOrderId").textContent = `ORD-${lastOrder.orderId.toUpperCase()}`;
    }
    document.getElementById("successOrderDate").textContent = new Date().toLocaleDateString();

    // Populate Items
    const itemsContainer = document.getElementById("successItemsList");
    itemsContainer.innerHTML = "";
    
    let subtotal = 0;
    lastOrder.items.forEach(item => {
        const price = Number(item.price || 0);
        subtotal += price * item.quantity;

        itemsContainer.innerHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(15, 23, 42, 0.7); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${item.imageURL || item.image || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; object-fit: contain; background: #111; border-radius: 6px; padding: 2px;">
                    <div>
                        <h4 style="font-size: 13px; color: white;">${item.productName || item.name}</h4>
                        <p style="font-size: 11px; color: var(--muted);">Quantity: ${item.quantity} | Price: $${price.toFixed(2)}</p>
                    </div>
                </div>
                <strong style="font-size: 13px; color: #60a5fa;">$${(price * item.quantity).toFixed(2)}</strong>
            </div>
        `;
    });

    const tax = subtotal * 0.08; // 8% estimated tax
    const total = subtotal + tax;

    document.getElementById("successSubtotal").textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById("successTax").textContent = `$${tax.toFixed(2)}`;
    document.getElementById("successTotal").textContent = `$${total.toFixed(2)}`;

    // Customer Info
    const custContainer = document.getElementById("successCustomerInfo");
    if (lastOrder.shippingDetails) {
        const s = lastOrder.shippingDetails;
        custContainer.innerHTML = `
            <div>Name: <strong style="color: white;">${s.name}</strong></div>
            <div>Email: <strong style="color: white;">${s.email}</strong></div>
            <div>Address: <strong style="color: white;">${s.address}, ${s.city} ${s.zip}</strong></div>
        `;
    }
});