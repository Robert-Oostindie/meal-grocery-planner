// ============================================================
// PHOTO IMPORT MODULE (photoImport.js)
// Allows users to take/upload photos of a recipe and have
// it automatically parsed into the app's recipe format.
//
// Supports:
//  - Ingredients slot: up to 2 photos (e.g. a long list split
//    across two cards/pages).
//  - Instructions slot (checkbox): up to 3 photos, for recipes
//    whose steps don't fit on one photo.
//
// Capped to keep Claude API cost per import predictable —
// max 5 images total (2 ingredients + 3 instructions).
//
// API key is stored securely in Firebase Cloud Functions —
// never exposed in this file or on GitHub.
// ============================================================

const CLOUD_FUNCTION_URL = "https://us-central1-meal-grocery-planner.cloudfunctions.net/parseRecipeFromPhoto";

const MAX_INGREDIENT_PHOTOS = 2;
const MAX_INSTRUCTION_PHOTOS = 3;

// In-memory list of selected files per slot. Reset whenever the modal opens.
let ingredientFiles = [];
let instructionFiles = [];

// ── Open / Close the photo import modal ──────────────────

export function openPhotoImportModal() {
    const modal = document.getElementById("photoImportModal");
    if (!modal) return;

    ingredientFiles = [];
    instructionFiles = [];

    document.getElementById("ingredientFileInput").value = "";
    document.getElementById("instructionFileInput").value = "";

    const checkbox = document.getElementById("splitInstructionsCheckbox");
    if (checkbox) checkbox.checked = false;

    document.getElementById("secondPhotoSection").classList.add("hidden");

    document.getElementById("photoImportError").classList.add("hidden");
    document.getElementById("photoImportBtn").disabled = true;
    document.getElementById("photoImportStatus").textContent = "";

    renderThumbnails("ingredient");
    renderThumbnails("instruction");

    modal.classList.remove("hidden");
}

export function closePhotoImportModal() {
    const modal = document.getElementById("photoImportModal");
    if (modal) modal.classList.add("hidden");
}

// ── Checkbox toggle: show/hide the instructions photo slot ────

export function toggleSplitInstructions(checkbox) {
    const secondSection = document.getElementById("secondPhotoSection");
    if (!secondSection) return;

    if (checkbox.checked) {
        secondSection.classList.remove("hidden");
    } else {
        secondSection.classList.add("hidden");
        instructionFiles = [];
        document.getElementById("instructionFileInput").value = "";
        renderThumbnails("instruction");
    }

    updateImportButtonState();
}

// ── Handle file selection for each slot ───────────────────
// Both slots support selecting multiple files at once (input has
// the `multiple` attribute) and adding more later, up to the cap.

export function handleIngredientPhotosSelected(input) {
    addFiles("ingredient", input.files);
    input.value = ""; // allow re-selecting the same file later if removed
}

export function handleInstructionPhotosSelected(input) {
    addFiles("instruction", input.files);
    input.value = "";
}

function addFiles(slot, fileList) {
    const isIngredient = slot === "ingredient";
    const files = isIngredient ? ingredientFiles : instructionFiles;
    const max = isIngredient ? MAX_INGREDIENT_PHOTOS : MAX_INSTRUCTION_PHOTOS;

    for (const file of fileList) {
        if (files.length >= max) break;
        if (!file.type.startsWith("image/")) continue;
        files.push(file);
    }

    renderThumbnails(slot);
    updateImportButtonState();
    document.getElementById("photoImportError").classList.add("hidden");
}

export function removePhoto(slot, index) {
    const files = slot === "ingredient" ? ingredientFiles : instructionFiles;
    files.splice(index, 1);
    renderThumbnails(slot);
    updateImportButtonState();
}

// ── Render thumbnail strip + add control + cap message ────

function renderThumbnails(slot) {
    const isIngredient = slot === "ingredient";
    const files = isIngredient ? ingredientFiles : instructionFiles;
    const max = isIngredient ? MAX_INGREDIENT_PHOTOS : MAX_INSTRUCTION_PHOTOS;
    const stripId = isIngredient ? "ingredientThumbStrip" : "instructionThumbStrip";
    const addBtnId = isIngredient ? "ingredientAddBtn" : "instructionAddBtn";
    const capMsgId = isIngredient ? "ingredientCapMsg" : "instructionCapMsg";

    const strip = document.getElementById(stripId);
    const addBtn = document.getElementById(addBtnId);
    const capMsg = document.getElementById(capMsgId);
    if (!strip) return;

    strip.innerHTML = "";

    files.forEach((file, i) => {
        const reader = new FileReader();
        const wrap = document.createElement("div");
        wrap.style.position = "relative";
        wrap.style.display = "inline-block";

        const img = document.createElement("img");
        img.style.width = "72px";
        img.style.height = "72px";
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
        removeBtn.onclick = () => removePhoto(slot, i);

        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(file);

        wrap.appendChild(img);
        wrap.appendChild(removeBtn);
        strip.appendChild(wrap);
    });

    const atCap = files.length >= max;
    if (addBtn) addBtn.style.display = atCap ? "none" : "inline-block";
    if (capMsg) capMsg.classList.toggle("hidden", !atCap);
}

// ── Enable Import button only when required photo(s) are present ──

function updateImportButtonState() {
    const btn = document.getElementById("photoImportBtn");
    if (!btn) return;

    const splitChecked = document.getElementById("splitInstructionsCheckbox")?.checked;
    const hasIngredients = ingredientFiles.length > 0;
    const hasInstructions = instructionFiles.length > 0;

    btn.disabled = splitChecked ? !(hasIngredients && hasInstructions) : !hasIngredients;
}

// ── Main import function ──────────────────────────────────

export async function importRecipeFromPhoto() {
    if (ingredientFiles.length === 0) return;

    const splitChecked = document.getElementById("splitInstructionsCheckbox")?.checked;

    if (splitChecked && instructionFiles.length === 0) {
        showPhotoError("Add at least one photo for the cooking instructions, or uncheck the box above.");
        return;
    }

    const btn = document.getElementById("photoImportBtn");
    const status = document.getElementById("photoImportStatus");

    btn.disabled = true;
    status.textContent = splitChecked
        ? "📖 Reading ingredients and instructions..."
        : "📖 Reading recipe...";
    document.getElementById("photoImportError").classList.add("hidden");

    try {
        const ingredientImages = await Promise.all(
            ingredientFiles.map(f => compressImage(f))
        );

        const payload = {
            ingredientImages,
            splitMode: !!splitChecked
        };

        if (splitChecked) {
            payload.instructionImages = await Promise.all(
                instructionFiles.map(f => compressImage(f))
            );
        }

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        closePhotoImportModal();
        window.openRecipeModalFromPhoto(data.recipe);

    } catch (err) {
        console.error("❌ Photo import failed:", err);
        showPhotoError(err.message || "Something went wrong. Please try again.");
        updateImportButtonState();
        status.textContent = "";
    }
}

// ── Compress image using canvas before sending ────────────
// Resizes and re-encodes to JPEG to stay under the 5MB API limit.

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const MAX_DIMENSION = 1600;
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

function showPhotoError(message) {
    const el = document.getElementById("photoImportError");
    if (el) {
        el.textContent = message;
        el.classList.remove("hidden");
    }
}
