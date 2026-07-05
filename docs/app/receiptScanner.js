// ============================================================
// RECEIPT SCANNER MODULE (receiptScanner.js)
// Scan a grocery receipt photo → extract item names + prices
// → user reviews/edits each line → save into the price book
// for the chosen store.
//
// Uses its OWN Cloud Function (parseReceiptFromPhoto) backed by
// its OWN Anthropic API key secret (ANTHROPIC_API_KEY_RECEIPTS)
// so receipt-scanning cost is trackable separately from recipe
// photo imports in the Anthropic Console.
//
// Wiring (mirrors globalRecipes.js): app.js calls
// initReceiptScanner({...}) once after state is initialised,
// and attaches the exported functions to window for the HTML
// onclick handlers.
// ============================================================

const RECEIPT_FUNCTION_URL = "https://us-central1-meal-grocery-planner.cloudfunctions.net/parseReceiptFromPhoto";
const MAX_RECEIPT_PHOTOS = 2;

// In-memory state. Reset whenever the modal opens.
let receiptFiles = [];
let parsedItems = [];   // [{ name, price, include }]

// ── Injected dependencies from app.js ─────────────────────
let _state = null;
let _getAllStores = null;
let _bulkSetItemPrices = null;

export function initReceiptScanner({ state, getAllStores, bulkSetItemPrices }) {
    _state = state;
    _getAllStores = getAllStores;
    _bulkSetItemPrices = bulkSetItemPrices;
    console.log("✅ receiptScanner module initialised");
}

// ── Open / Close ──────────────────────────────────────────

export function openReceiptScannerModal() {
    const modal = document.getElementById("receiptScannerModal");
    if (!modal) return;

    receiptFiles = [];
    parsedItems = [];

    // Populate store dropdown, defaulting to the user's default store
    const sel = document.getElementById("receiptStoreSelect");
    if (sel && _getAllStores) {
        const stores = _getAllStores();
        const def = _state?.data?.defaultStoreName || "";
        sel.innerHTML = stores
            .map(s => `<option${s.name === def ? " selected" : ""}>${s.name}</option>`)
            .join("");
    }

    document.getElementById("receiptFileInput").value = "";
    document.getElementById("receiptStep1").classList.remove("hidden");
    document.getElementById("receiptReview").classList.add("hidden");

    const scanBtn = document.getElementById("receiptScanBtn");
    scanBtn.classList.remove("hidden");
    scanBtn.disabled = true;

    const saveBtn = document.getElementById("receiptSaveBtn");
    saveBtn.classList.add("hidden");
    saveBtn.disabled = false;

    document.getElementById("receiptStatus").textContent = "";
    document.getElementById("receiptError").classList.add("hidden");

    renderReceiptThumbnails();
    modal.classList.remove("hidden");
}

export function closeReceiptScannerModal() {
    const modal = document.getElementById("receiptScannerModal");
    if (modal) modal.classList.add("hidden");
}

// ── Photo selection ───────────────────────────────────────

export function handleReceiptPhotosSelected(input) {
    for (const file of input.files) {
        if (receiptFiles.length >= MAX_RECEIPT_PHOTOS) break;
        if (!file.type.startsWith("image/")) continue;
        receiptFiles.push(file);
    }
    input.value = ""; // allow re-selecting the same file later if removed

    renderReceiptThumbnails();
    document.getElementById("receiptScanBtn").disabled = receiptFiles.length === 0;
    document.getElementById("receiptError").classList.add("hidden");
}

export function removeReceiptPhoto(index) {
    receiptFiles.splice(index, 1);
    renderReceiptThumbnails();
    document.getElementById("receiptScanBtn").disabled = receiptFiles.length === 0;
}

function renderReceiptThumbnails() {
    const strip = document.getElementById("receiptThumbStrip");
    const addBtn = document.getElementById("receiptAddBtn");
    const capMsg = document.getElementById("receiptCapMsg");
    if (!strip) return;

    strip.innerHTML = "";

    receiptFiles.forEach((file, i) => {
        const reader = new FileReader();
        const wrap = document.createElement("div");
        wrap.style.position = "relative";
        wrap.style.display = "inline-block";

        const img = document.createElement("img");
        img.style.width = "72px";
        img.style.height = "96px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.border = "1px solid #e5e7eb";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.type = "button";
        removeBtn.style.position = "absolute";
        removeBtn.style.top = "-6px";
        removeBtn.style.right = "-6px";
        removeBtn.style.width = "20px";
        removeBtn.style.height = "20px";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.border = "none";
        removeBtn.style.background = "#374151";
        removeBtn.style.color = "#fff";
        removeBtn.style.fontSize = "12px";
        removeBtn.style.lineHeight = "20px";
        removeBtn.style.padding = "0";
        removeBtn.style.cursor = "pointer";
        removeBtn.onclick = () => removeReceiptPhoto(i);

        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);

        wrap.appendChild(img);
        wrap.appendChild(removeBtn);
        strip.appendChild(wrap);
    });

    const atCap = receiptFiles.length >= MAX_RECEIPT_PHOTOS;
    if (addBtn) addBtn.style.display = atCap ? "none" : "inline-block";
    if (capMsg) capMsg.classList.toggle("hidden", !atCap);
}

// ── Scan: send photos to the Cloud Function ───────────────

export async function scanReceipt() {
    if (!receiptFiles.length) return;

    const btn = document.getElementById("receiptScanBtn");
    const status = document.getElementById("receiptStatus");

    btn.disabled = true;
    status.textContent = "🧾 Reading receipt...";
    document.getElementById("receiptError").classList.add("hidden");

    try {
        const images = await Promise.all(receiptFiles.map(f => compressReceiptImage(f)));

        const response = await fetch(RECEIPT_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        parsedItems = (data.items || []).map(it => ({
            name: it.name,
            price: it.price,
            include: true
        }));

        if (!parsedItems.length) {
            showReceiptError("No items could be read from that receipt. Try a clearer, straight-on photo.");
            btn.disabled = false;
            status.textContent = "";
            return;
        }

        // If the receipt names a store that matches one of the user's
        // stores, preselect it in the dropdown (user can still change it).
        if (data.store) {
            const sel = document.getElementById("receiptStoreSelect");
            const detected = data.store.toLowerCase();
            const match = Array.from(sel.options).find(o =>
                o.value.toLowerCase().includes(detected) ||
                detected.includes(o.value.toLowerCase())
            );
            if (match) sel.value = match.value;
        }

        // Switch to review step
        status.textContent = "";
        document.getElementById("receiptStep1").classList.add("hidden");
        document.getElementById("receiptReview").classList.remove("hidden");
        btn.classList.add("hidden");
        document.getElementById("receiptSaveBtn").classList.remove("hidden");

        renderReceiptReview();

    } catch (err) {
        console.error("❌ Receipt scan failed:", err);
        showReceiptError(err.message || "Something went wrong. Please try again.");
        btn.disabled = false;
        status.textContent = "";
    }
}

// ── Review step: editable rows ────────────────────────────

function renderReceiptReview() {
    const list = document.getElementById("receiptItemsList");
    if (!list) return;

    list.innerHTML = "";

    parsedItems.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "receipt-item-row";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = item.include;
        cb.onchange = () => { parsedItems[idx].include = cb.checked; };

        const nameInp = document.createElement("input");
        nameInp.type = "text";
        nameInp.className = "receipt-item-name";
        nameInp.value = item.name;
        nameInp.onchange = () => { parsedItems[idx].name = nameInp.value.trim(); };

        const priceInp = document.createElement("input");
        priceInp.type = "number";
        priceInp.step = "0.01";
        priceInp.min = "0";
        priceInp.inputMode = "decimal";
        priceInp.className = "receipt-item-price";
        priceInp.value = Number(item.price).toFixed(2);
        priceInp.onchange = () => { parsedItems[idx].price = parseFloat(priceInp.value) || 0; };

        row.appendChild(cb);
        row.appendChild(nameInp);
        row.appendChild(priceInp);
        list.appendChild(row);
    });
}

// ── Save reviewed prices into the price book ──────────────

export async function saveReceiptPrices() {
    const store = document.getElementById("receiptStoreSelect").value;
    const items = parsedItems.filter(it => it.include && it.name && it.price > 0);

    if (!items.length) {
        showReceiptError("Nothing selected to save.");
        return;
    }

    const btn = document.getElementById("receiptSaveBtn");
    btn.disabled = true;
    document.getElementById("receiptStatus").textContent = "💾 Saving prices...";

    try {
        await _bulkSetItemPrices(store, items);
        closeReceiptScannerModal();
        alert(`Saved ${items.length} price${items.length === 1 ? "" : "s"} for ${store}.`);
    } catch (err) {
        console.error("❌ Saving receipt prices failed:", err);
        showReceiptError("Couldn't save prices. Please try again.");
        btn.disabled = false;
        document.getElementById("receiptStatus").textContent = "";
    }
}

// ── Compress image before sending ─────────────────────────
// Receipts are tall with small text, so we allow a larger max
// dimension (2200px) than recipe photos to keep prices legible.

function compressReceiptImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const MAX_DIMENSION = 2200;
            let { width, height } = img;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height / width) * MAX_DIMENSION);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width / height) * MAX_DIMENSION);
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to compress image."));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result.split(",")[1];
                        resolve({ base64, mediaType: "image/jpeg" });
                    };
                    reader.onerror = () => reject(new Error("Failed to read compressed image."));
                    reader.readAsDataURL(blob);
                },
                "image/jpeg",
                0.85
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for compression."));
        };

        img.src = objectUrl;
    });
}

// ── Show error in modal ───────────────────────────────────

function showReceiptError(message) {
    const el = document.getElementById("receiptError");
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
}
