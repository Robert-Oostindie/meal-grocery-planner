// ============================================================
// PHOTO IMPORT MODULE (photoImport.js)
// Allows users to take/upload a photo of a recipe and have
// it automatically parsed into the app's recipe format.
//
// API key is stored securely in Firebase Cloud Functions —
// never exposed in this file or on GitHub.
// ============================================================

// Your deployed Firebase Cloud Function URL
const CLOUD_FUNCTION_URL = "https://us-central1-meal-grocery-planner.cloudfunctions.net/parseRecipeFromPhoto";

// ── Open / Close the photo import modal ──────────────────

export function openPhotoImportModal() {
    const modal = document.getElementById("photoImportModal");
    if (!modal) return;

    // Reset state each time it opens
    document.getElementById("photoPreview").src = "";
    document.getElementById("photoPreview").classList.add("hidden");
    document.getElementById("photoFileInput").value = "";
    document.getElementById("photoImportError").classList.add("hidden");
    document.getElementById("photoImportBtn").disabled = true;
    document.getElementById("photoImportStatus").textContent = "";

    modal.classList.remove("hidden");
}

export function closePhotoImportModal() {
    const modal = document.getElementById("photoImportModal");
    if (modal) modal.classList.add("hidden");
}

// ── Handle image selection ────────────────────────────────

export function handlePhotoSelected(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith("image/")) {
        showPhotoError("Please select an image file.");
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("photoPreview");
        preview.src = e.target.result;
        preview.classList.remove("hidden");
        document.getElementById("photoImportBtn").disabled = false;
        document.getElementById("photoImportError").classList.add("hidden");
    };
    reader.readAsDataURL(file);
}

// ── Main import function ──────────────────────────────────

export async function importRecipeFromPhoto() {
    const fileInput = document.getElementById("photoFileInput");
    const file = fileInput.files[0];
    if (!file) return;

    const btn = document.getElementById("photoImportBtn");
    const status = document.getElementById("photoImportStatus");

    // Show loading state
    btn.disabled = true;
    status.textContent = "📖 Reading recipe...";
    document.getElementById("photoImportError").classList.add("hidden");

    try {
        // Compress image to stay under Anthropic's 5MB limit
        const { base64, mediaType } = await compressImage(file);

        // Call our secure Cloud Function (not Anthropic directly)
        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageBase64: base64,
                mediaType: mediaType
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong. Please try again.");
        }

        // Close photo modal and open recipe modal with parsed data
        closePhotoImportModal();
        window.openRecipeModalFromPhoto(data.recipe);

    } catch (err) {
        console.error("❌ Photo import failed:", err);
        showPhotoError(err.message || "Something went wrong. Please try again.");
        btn.disabled = false;
        status.textContent = "";
    }
}

// ── Compress image using canvas before sending ────────────
// Resizes and re-encodes to JPEG to stay under the 5MB API limit.
// Most phone photos are 3-10MB; this brings them under 4MB safely.

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            // Target: max 1600px on the longest side (enough for Claude to read text)
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

            // Encode as JPEG at 85% quality — good balance of size vs clarity
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
