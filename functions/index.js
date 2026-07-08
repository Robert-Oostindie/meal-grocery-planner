const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const https = require("https");

// Reference the secret we stored — never hardcoded
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

const ALLOWED_ORIGINS = [
    "https://recipetogrocerylist.com",
    "https://www.recipetogrocerylist.com",
    "https://meal-grocery-planner.web.app"
];

// Hard server-side caps — enforced regardless of what the client sends.
// Keeps a single import bounded at 5 images max, so cost per import
// has a predictable ceiling even if the front-end cap is ever bypassed.
const MAX_INGREDIENT_IMAGES = 3;
const MAX_INSTRUCTION_IMAGES = 5;

const RESPONSE_FORMAT = `Return ONLY a valid JSON object with this exact structure, nothing else:
{
  "name": "Recipe Name",
  "category": "Medium Prep",
  "ingredients": [
    {"name": "ingredient name", "qty": 1, "unit": "CT"},
    {"name": "another ingredient", "qty": 2, "unit": "cup"}
  ],
  "instructions": "1. First step.\\n2. Second step.\\n3. Third step."
}

Rules:
- "name": The recipe name. If not visible, make a reasonable guess from the ingredients.
- "category": Must be exactly one of: "Low Prep", "Medium Prep", "High Prep / Longer Cook Times", "Grilling", "Breakfast", "Crock Pot", "Sides", "Appetizers"
- "ingredients": Array of all ingredients you can see
- "qty": A number (use 1 if not specified)
- "unit": Use standard units like "CT", "cup", "tbsp", "tsp", "oz", "lb", "g", "ml", "clove", "slice", "can", "pkg"
- "instructions": A single string with numbered steps separated by \\n. If no instructions are visible, use an empty string "".
- Return ONLY the JSON, no explanation, no markdown code blocks`;

// Builds the prompt text based on how many images are in each role.
function buildPrompt({ ingredientCount, instructionCount, splitMode }) {
    if (!splitMode) {
        if (ingredientCount === 1) {
            return `You are a recipe parser. Analyze this recipe image and extract the recipe information.\n\n${RESPONSE_FORMAT}`;
        }
        return `You are a recipe parser. You are given ${ingredientCount} images that together show the SAME recipe (e.g. multiple pages or photos of one recipe card). Combine the ingredients and instructions across all ${ingredientCount} images into a single recipe.\n\n${RESPONSE_FORMAT}`;
    }

    // Split mode: first block of images = ingredients only, next block = instructions only.
    const ingredientLabel = ingredientCount === 1
        ? `Image 1 contains ONLY the ingredients list`
        : `Images 1-${ingredientCount} contain ONLY the ingredients list, possibly split across multiple photos of the same list`;

    const instrStart = ingredientCount + 1;
    const instrEnd = ingredientCount + instructionCount;
    const instructionLabel = instructionCount === 1
        ? `Image ${instrStart} contains ONLY the cooking instructions / steps`
        : `Images ${instrStart}-${instrEnd} contain ONLY the cooking instructions / steps, possibly split across multiple photos in order`;

    return `You are a recipe parser. You are given ${ingredientCount + instructionCount} images of the SAME recipe, split into two groups.

- ${ingredientLabel}. Extract ingredients from these image(s) only. Ignore any instructional or narrative text that may incidentally appear in them.
- ${instructionLabel}. Extract the "instructions" field from these image(s) only, preserving step order across photos. Ignore any ingredient list that may incidentally appear in them.
- Combine what you extract from both groups into a single recipe object.

${RESPONSE_FORMAT}`;
}

exports.parseRecipeFromPhoto = onRequest(
    { secrets: ["ANTHROPIC_API_KEY"] },
    async (req, res) => {

        // Manual CORS — allows both production domains
        const origin = req.headers.origin;
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.set("Access-Control-Allow-Origin", origin);
        }
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { ingredientImages, instructionImages, splitMode } = req.body;

        if (!Array.isArray(ingredientImages) || ingredientImages.length === 0) {
            return res.status(400).json({ error: "Missing ingredient photo(s)." });
        }

        if (ingredientImages.length > MAX_INGREDIENT_IMAGES) {
            return res.status(400).json({ error: `Too many ingredient photos — max ${MAX_INGREDIENT_IMAGES}.` });
        }

        const instrImgs = splitMode && Array.isArray(instructionImages) ? instructionImages : [];

        if (splitMode && instrImgs.length === 0) {
            return res.status(400).json({ error: "Split mode requires at least one instruction photo." });
        }

        if (instrImgs.length > MAX_INSTRUCTION_IMAGES) {
            return res.status(400).json({ error: `Too many instruction photos — max ${MAX_INSTRUCTION_IMAGES}.` });
        }

        // Validate each image entry has the required fields
        const allImages = [...ingredientImages, ...instrImgs];
        for (const img of allImages) {
            if (!img || !img.base64 || !img.mediaType) {
                return res.status(400).json({ error: "One or more images is missing data." });
            }
        }

        const imageBlocks = allImages.map(img => ({
            type: "image",
            source: { type: "base64", media_type: img.mediaType, data: img.base64 }
        }));

        const prompt = buildPrompt({
            ingredientCount: ingredientImages.length,
            instructionCount: instrImgs.length,
            splitMode: !!splitMode
        });

        const requestBody = JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2000,
            messages: [
                {
                    role: "user",
                    content: [
                        ...imageBlocks,
                        { type: "text", text: prompt }
                    ]
                }
            ]
        });

        const apiResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: "api.anthropic.com",
                path: "/v1/messages",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": anthropicApiKey.value(),
                    "anthropic-version": "2023-06-01",
                    "Content-Length": Buffer.byteLength(requestBody)
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = "";
                apiRes.on("data", chunk => data += chunk);
                apiRes.on("end", () => {
                    try {
                        resolve({ status: apiRes.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error("Failed to parse Anthropic response"));
                    }
                });
            });

            apiReq.on("error", reject);
            apiReq.write(requestBody);
            apiReq.end();
        });

        if (apiResponse.status !== 200) {
            const errMsg = apiResponse.body?.error?.message || "Anthropic API error";
            return res.status(500).json({ error: errMsg });
        }

        const rawText = apiResponse.body.content?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        let recipe;
        try {
            recipe = JSON.parse(cleaned);
        } catch (e) {
            return res.status(500).json({ error: "Couldn't parse recipe from image. Try a clearer photo." });
        }

        if (!recipe.name || !Array.isArray(recipe.ingredients)) {
            return res.status(500).json({ error: "Recipe data incomplete. Try a clearer photo." });
        }

        recipe.ingredients = recipe.ingredients.map(ing => ({
            name: ing.name || "Unknown",
            qty: Number(ing.qty) || 1,
            unit: ing.unit || "CT"
        }));

        recipe.instructions = typeof recipe.instructions === "string"
            ? recipe.instructions
            : "";

        return res.status(200).json({ recipe });
    }
);
// ============================================================
// RECEIPT SCANNER — parseReceiptFromPhoto  (v2)
//
// REPLACES the previously appended parseReceiptFromPhoto block
// at the end of functions/index.js. Delete everything from the
// old "RECEIPT SCANNER — parseReceiptFromPhoto" banner to the
// end of the file, then append this entire file.
//
// v2 changes:
// - Extracts SINGLE-UNIT price when quantity lines are present
//   (handles both Aldi-style "2 x 0.98" below the item and
//   Woodman's-style "2 @ 2.99" above the item)
// - Returns qty per item and the printed receipt SUBTOTAL so the
//   client can cross-check for misread digits (6/8, 5/8, 3/8)
// - Stronger brand/store-prefix stripping in names
//
// Uses its OWN Anthropic API key (ANTHROPIC_API_KEY_RECEIPTS).
// ============================================================

const anthropicReceiptApiKey = defineSecret("ANTHROPIC_API_KEY_RECEIPTS");

const MAX_RECEIPT_IMAGES = 2;

const RECEIPT_RESPONSE_FORMAT = `Return ONLY a valid JSON object with this exact structure, nothing else:
{
  "store": "Store name if visible on the receipt, otherwise an empty string",
  "receiptSubtotal": 65.63,
  "items": [
    {"name": "chicken thighs", "price": 8.22, "qty": 1},
    {"name": "steam mixed vegetables", "price": 0.98, "qty": 2}
  ]
}

Rules:

PRICES — always report the SINGLE-UNIT price:
- Receipts print quantities in different formats. Watch for BOTH:
  - Quantity line BELOW the item (Aldi style):
      "Steam Mixed Veg.    1.96"
      "2 x    0.98"
    → price 0.98, qty 2 (1.96 is the line total — do NOT use it)
  - Quantity line ABOVE the item (Woodman's style):
      "2 @ 2.99"
      "   CRAN NATRLS 64Z    5.98"
    → price 2.99, qty 2
      "4 @ 0.99"
      "   AVOCADOS    3.96"
    → price 0.99, qty 4
- If no quantity line is attached to an item, price is the printed line amount and qty is 1.
- Weight-based items (e.g. "0.95lb @ 0.99/lb ... 0.94"): report the line total actually paid (0.94) with qty 1 — that is what a typical purchase of that item costs.

DIGIT ACCURACY:
- Receipt dot-matrix fonts make 6/8, 5/8, and 3/8 easy to confuse. Read carefully.
- Cross-check yourself: the sum of (price × qty) over all items should approximately equal the printed subtotal. If your sum is off, re-read the digits before answering.

"receiptSubtotal": the printed SUBTOTAL (pre-tax) as a number. If no subtotal is printed, use the pre-tax total. If neither is visible, use null.

NAMES:
- Expand abbreviations into plain, lowercase grocery item names a home cook would write in a recipe: "B/S CHICKEN THIGHS" → "chicken thighs", "MILD CHEDDAR SHRED" → "mild cheddar shredded cheese", "CAMP CHDR SOUP" → "cheddar soup", "COND CRM OF CHKN" → "condensed cream of chicken soup".
- STRIP brand codes and store-brand prefixes: "GV", "GI", "OO", "MM", item numbers, and similar leading codes are brands, not part of the food name. "GI POTATO PUFF 28Z" → "potato puffs", "OO CRAN NATRLS 64Z" → "cranberry juice".
- Drop package sizes and counts from names ("64Z", "20ct", "3LB").

WHAT TO INCLUDE:
- Only purchased grocery items. SKIP: tax, subtotal, total, change, payment/tender lines, standalone coupon lines (apply them to their item instead), bag fees, bottle deposits, loyalty summaries, and non-food service lines.
- If you cannot confidently read a price for an item, skip that item entirely.

Return ONLY the JSON, no explanation, no markdown code blocks`;

exports.parseReceiptFromPhoto = onRequest(
    { secrets: ["ANTHROPIC_API_KEY_RECEIPTS"] },
    async (req, res) => {

        // Manual CORS — same allowed origins as recipe import
        const origin = req.headers.origin;
        if (ALLOWED_ORIGINS.includes(origin)) {
            res.set("Access-Control-Allow-Origin", origin);
        }
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type");

        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }

        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { images } = req.body;

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: "Missing receipt photo(s)." });
        }

        if (images.length > MAX_RECEIPT_IMAGES) {
            return res.status(400).json({ error: `Too many photos — max ${MAX_RECEIPT_IMAGES}.` });
        }

        const imageBlocks = images.map(img => ({
            type: "image",
            source: {
                type: "base64",
                media_type: img.mediaType || "image/jpeg",
                data: img.base64
            }
        }));

        const prompt = images.length === 1
            ? `You are a grocery receipt parser. Extract the purchased items and their single-unit prices from this receipt photo.\n\n${RECEIPT_RESPONSE_FORMAT}`
            : `You are a grocery receipt parser. These ${images.length} photos show the SAME receipt (e.g. top half and bottom half). Combine them and extract each purchased item and its single-unit price exactly once.\n\n${RECEIPT_RESPONSE_FORMAT}`;

        const requestBody = JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 3000,
            messages: [
                {
                    role: "user",
                    content: [
                        ...imageBlocks,
                        { type: "text", text: prompt }
                    ]
                }
            ]
        });

        const apiResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: "api.anthropic.com",
                path: "/v1/messages",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": anthropicReceiptApiKey.value(),
                    "anthropic-version": "2023-06-01",
                    "Content-Length": Buffer.byteLength(requestBody)
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let data = "";
                apiRes.on("data", chunk => data += chunk);
                apiRes.on("end", () => {
                    try {
                        resolve({ status: apiRes.statusCode, body: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error("Failed to parse Anthropic response"));
                    }
                });
            });

            apiReq.on("error", reject);
            apiReq.write(requestBody);
            apiReq.end();
        });

        if (apiResponse.status !== 200) {
            const errMsg = apiResponse.body?.error?.message || "Anthropic API error";
            return res.status(500).json({ error: errMsg });
        }

        const rawText = apiResponse.body.content?.[0]?.text || "";
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        let result;
        try {
            result = JSON.parse(cleaned);
        } catch (e) {
            return res.status(500).json({ error: "Couldn't read the receipt. Try a clearer, straight-on photo." });
        }

        if (!Array.isArray(result.items)) {
            return res.status(500).json({ error: "No items found on the receipt. Try a clearer photo." });
        }

        const items = result.items
            .map(it => {
                const qty = parseInt(it.qty, 10);
                return {
                    name: String(it.name || "").trim().toLowerCase(),
                    price: Math.round(Number(it.price) * 100) / 100,
                    qty: (!isNaN(qty) && qty > 0) ? qty : 1
                };
            })
            .filter(it => it.name && !isNaN(it.price) && it.price > 0);

        const subtotalNum = Number(result.receiptSubtotal);

        return res.status(200).json({
            store: String(result.store || ""),
            receiptSubtotal: (!isNaN(subtotalNum) && subtotalNum > 0)
                ? Math.round(subtotalNum * 100) / 100
                : null,
            items
        });
    }
);
