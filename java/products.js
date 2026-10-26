// java/products.js
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let liveProducts = [];
let selectedCategory = "all";
let currentSearchQuery = "";
let currentSortOption = "featured";

document.addEventListener("DOMContentLoaded", async () => {
    await fetchLiveProducts();
    setupCatalogueListeners();
});

async function fetchLiveProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    grid.innerHTML = `<p style="color: var(--muted); grid-column: span 4; text-align:center; padding: 40px;">Loading live database products...</p>`;

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        liveProducts = [];

        querySnapshot.forEach((doc) => {
            liveProducts.push({ id: doc.id, ...doc.data() });
        });

        console.log("Fetched live products from Firestore:", liveProducts);
        filterAndRenderProducts();
    } catch (error) {
        console.error("Error fetching Firestore products:", error);
        grid.innerHTML = `<p style="color: #f87171; grid-column: span 4; text-align:center;">Failed to connect to live database products. Check console or Firestore rules.</p>`;
    }
}

function setupCatalogueListeners() {
    // Category filter buttons
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            filterButtons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            selectedCategory = e.target.getAttribute("data-category");
            filterAndRenderProducts();
        });
    });

    // Search inputs
    const searchInput = document.getElementById("productSearch");
    const searchBtn = document.getElementById("searchButton");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            filterAndRenderProducts();
        });
    }

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", () => {
            currentSearchQuery = searchInput.value.toLowerCase().trim();
            filterAndRenderProducts();
        });
    }

    // Sorting dropdown
    const sortSelect = document.getElementById("sortProducts");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSortOption = e.target.value;
            filterAndRenderProducts();
        });
    }

    // Reset filters button
    const resetBtn = document.getElementById("resetFilters");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            selectedCategory = "all";
            currentSearchQuery = "";
            if (searchInput) searchInput.value = "";
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            const allBtn = document.querySelector('.filter-btn[data-category="all"]');
            if (allBtn) allBtn.classList.add("active");
            filterAndRenderProducts();
        });
    }
}

function filterAndRenderProducts() {
    const grid = document.getElementById("productGrid");
    const resultCount = document.getElementById("resultCount");
    const noResults = document.getElementById("noResults");
    if (!grid) return;

    // 1. Filter by category
    let result = liveProducts.filter(item => {
        if (selectedCategory === "all") return true;
        return item.category && item.category.toLowerCase() === selectedCategory.toLowerCase();
    });

    // 2. Filter by search query
    if (currentSearchQuery) {
        result = result.filter(item => 
            (item.productName && item.productName.toLowerCase().includes(currentSearchQuery)) ||
            (item.description && item.description.toLowerCase().includes(currentSearchQuery)) ||
            (item.category && item.category.toLowerCase().includes(currentSearchQuery))
        );
    }

    // 3. Sort options
    result.sort((a, b) => {
        if (currentSortOption === "low-high") return Number(a.price) - Number(b.price);
        if (currentSortOption === "high-low") return Number(b.price) - Number(a.price);
        if (currentSortOption === "az") return (a.productName || "").localeCompare(b.productName || "");
        return 0; // featured default
    });

    // Update Counter
    if (resultCount) resultCount.textContent = `${result.length} products`;

    // Render Grid or No Results
    if (result.length === 0) {
        grid.innerHTML = `<p style="color: var(--muted); grid-column: span 4; text-align:center; padding: 40px;">No products found in live Firestore database.</p>`;
        if (noResults) noResults.hidden = false;
        return;
    }

    if (noResults) noResults.hidden = true;
    grid.innerHTML = "";

    result.forEach(item => {
        // Ensure price is explicitly converted to Number so app.js can call .toFixed() on it
        const sanitizedItem = { ...item, price: Number(item.price || 0) };

        const card = document.createElement("article");
        card.className = "product-card";
        card.innerHTML = `
            <div class="product-image">
                <img src="${item.imageURL || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1170&auto=format&fit=crop'}" alt="${item.productName}">
                ${item.badge ? `<span class="product-tag">${item.badge}</span>` : ''}
            </div>
            <div class="product-details">
                <span class="product-category">${item.category || 'General'}</span>
                <h3>${item.productName}</h3>
                <p class="product-description">${item.description || 'Quality item available on ShopForge.'}</p>
                <div class="product-bottom">
                    <strong class="product-price">$${Number(item.price || 0).toFixed(2)}</strong>
                    <button class="add-cart" onclick='window.addToCartObject(${JSON.stringify(sanitizedItem).replace(/'/g, "&#39;")})'>
                        <i class="bi bi-bag-plus"></i> Add to cart
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}