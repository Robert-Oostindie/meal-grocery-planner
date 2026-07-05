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
// RECEIPT SCANNER — parseReceiptFromPhoto
//
// APPEND THIS ENTIRE FILE TO THE END OF functions/index.js
// It is self-contained: it reuses onRequest, defineSecret,
// https, and ALLOWED_ORIGINS already declared at the top of
// that file, and declares everything else it needs itself.
//
// Uses its OWN Anthropic API key (ANTHROPIC_API_KEY_RECEIPTS)
// so receipt-scanning cost is trackable separately from recipe
// photo imports in the Anthropic Console.
// ============================================================

const anthropicReceiptApiKey = defineSecret("ANTHROPIC_API_KEY_RECEIPTS");

const MAX_RECEIPT_IMAGES = 2;

const RECEIPT_RESPONSE_FORMAT = `Return ONLY a valid JSON object with this exact structure, nothing else:
{
  "store": "Store name if visible on the receipt, otherwise an empty string",
  "items": [
    {"name": "chicken breast", "price": 8.97},
    {"name": "olive oil", "price": 6.48}
  ]
}

Rules:
- "name": Expand receipt abbreviations into plain, lowercase grocery item names a home cook would write in a recipe (e.g. "GV CHKN BRST 3LB" → "chicken breast", "BNLS SKLS THGH" → "chicken thighs", "2% MLK GAL" → "milk"). Drop brand names, package sizes, and store prefixes.
- "price": The FINAL price paid for that line as a number. If a discount or coupon is printed on the line directly below an item, subtract it and report the net price for that item. No dollar signs, no strings.
- Include only purchased grocery items. SKIP: tax, subtotal, total, change, payment/tender lines, standalone coupon lines (apply them to their item instead), bag fees, bottle deposits, loyalty point summaries, and non-food service lines.
- If the same item appears on multiple lines, include it once. If a quantity and unit price are shown (e.g. "2 @ 3.49"), report the single-unit price.
- If you cannot confidently read a price for an item, skip that item entirely.
- Return ONLY the JSON, no explanation, no markdown code blocks`;

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
            ? `You are a grocery receipt parser. Extract the purchased items and their final prices from this receipt photo.\n\n${RECEIPT_RESPONSE_FORMAT}`
            : `You are a grocery receipt parser. These ${images.length} photos show the SAME receipt (e.g. top half and bottom half). Combine them and extract each purchased item and its final price exactly once.\n\n${RECEIPT_RESPONSE_FORMAT}`;

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
            .map(it => ({
                name: String(it.name || "").trim().toLowerCase(),
                price: Math.round(Number(it.price) * 100) / 100
            }))
            .filter(it => it.name && !isNaN(it.price) && it.price > 0);

        return res.status(200).json({
            store: String(result.store || ""),
            items
        });
    }
);
