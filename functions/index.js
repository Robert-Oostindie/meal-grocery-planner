const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const https = require("https");

// Reference the secret we stored — never hardcoded
const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

exports.parseRecipeFromPhoto = onRequest(
    { secrets: ["ANTHROPIC_API_KEY"], cors: true },
    async (req, res) => {

        // Only allow POST requests
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { imageBase64, mediaType } = req.body;

        if (!imageBase64 || !mediaType) {
            return res.status(400).json({ error: "Missing imageBase64 or mediaType" });
        }

        const prompt = `You are a recipe parser. Analyze this recipe image and extract the recipe information.

Return ONLY a valid JSON object with this exact structure, nothing else:
{
  "name": "Recipe Name",
  "category": "Medium Prep",
  "ingredients": [
    {"name": "ingredient name", "qty": 1, "unit": "CT"},
    {"name": "another ingredient", "qty": 2, "unit": "cup"}
  ]
}

Rules:
- "name": The recipe name. If not visible, make a reasonable guess from the ingredients.
- "category": Must be exactly one of: "Low Prep", "Medium Prep", "High Prep / Longer Cook Times", "Grilling", "Breakfast", "Crock Pot", "Sides", "Appetizers"
- "ingredients": Array of all ingredients you can see
- "qty": A number (use 1 if not specified)
- "unit": Use standard units like "CT", "cup", "tbsp", "tsp", "oz", "lb", "g", "ml", "clove", "slice", "can", "pkg"
- Do not include instructions, just ingredients
- Return ONLY the JSON, no explanation, no markdown code blocks`;

        const requestBody = JSON.stringify({
            model: "claude-opus-4-6",
            max_tokens: 1024,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: mediaType,
                                data: imageBase64
                            }
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        });

        // Call Anthropic API using Node's built-in https
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

        // Extract the text response
        const rawText = apiResponse.body.content?.[0]?.text || "";

        // Strip any accidental markdown fences and parse JSON
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        let recipe;
        try {
            recipe = JSON.parse(cleaned);
        } catch (e) {
            return res.status(500).json({ error: "Couldn't parse recipe from image. Try a clearer photo." });
        }

        // Basic validation
        if (!recipe.name || !Array.isArray(recipe.ingredients)) {
            return res.status(500).json({ error: "Recipe data incomplete. Try a clearer photo." });
        }

        // Clean up ingredients
        recipe.ingredients = recipe.ingredients.map(ing => ({
            name: ing.name || "Unknown",
            qty: Number(ing.qty) || 1,
            unit: ing.unit || "CT"
        }));

        return res.status(200).json({ recipe });
    }
);
