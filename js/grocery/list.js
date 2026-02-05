// Grocery list building and rendering
import { state } from '../state/state.js';
import { getAllMeals, getActiveIngredientsForMeal, findStoreByName } from '../state/selectors.js';
import { determineAisleForIngredient } from '../ingredients/matching.js';
import { DELIVERY_SERVICES } from '../config/constants.js';

export function renderGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) {
        console.warn("[GL] #groceryContainer NOT FOUND");
        return;
    }

    container.innerHTML = "";

    const selectedMeals = getAllMeals().filter(m => state.ui.plannerMeals.includes(m.id));

    if (!selectedMeals.length && !state.ui.plannerExtras.length) {
        container.innerHTML = `<p class="section-note">Select meals in the Planner and click "Build Grocery List".</p>`;
        return;
    }

    const itemsByStore = {};

    function addItem(store, ingObj) {
        const storeKey = store || "Other";
        const aisle = determineAisleForIngredient(ingObj.name);

        if (!itemsByStore[storeKey]) itemsByStore[storeKey] = {};
        if (!itemsByStore[storeKey][aisle]) itemsByStore[storeKey][aisle] = [];

        itemsByStore[storeKey][aisle].push({
            name: ingObj.name,
            qty: ingObj.qty || 1,
            unit: ingObj.unit || "CT",
            comment: ingObj.comment || ""
        });
    }

    // Add ingredients from selected meals
    selectedMeals.forEach(meal => {
        let activeIngredients = [];

        try {
            activeIngredients = getActiveIngredientsForMeal(meal) || [];
        } catch (e) {
            console.error("ING ERROR:", e);
            activeIngredients = [];
        }

        activeIngredients.forEach(ing => {
            if (!ing) return;

            if (!state.ui.plannerIngredientChecks[meal.id]) {
                state.ui.plannerIngredientChecks[meal.id] = {};
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === false) return;

            const comment = state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";
            const mult = state.ui.plannerMealMultipliers[meal.id] || 1;

            addItem(ing.store, {
                name: ing.name,
                qty: ing.qty * mult,
                unit: ing.unit,
                comment
            });
        });
    });

    // Add planner extras
    state.ui.plannerExtras.forEach(item => {
        addItem(item.store, {
            name: item.name,
            qty: item.qty,
            unit: item.unit || "CT"
        });
    });

    // Merge duplicates
    for (const storeName of Object.keys(itemsByStore)) {
        const aislesObj = itemsByStore[storeName];

        Object.keys(aislesObj).forEach(aisleName => {
            const merged = {};

            aislesObj[aisleName].forEach(item => {
                const name = (item.name || "").trim();
                const unit = (item.unit || "CT").trim();
                const qty  = item.qty || 1;

                const key = name.toLowerCase() + "|" + unit.toLowerCase();

                if (!merged[key]) {
                    merged[key] = { name, qty, unit };
                } else {
                    merged[key].qty += qty;
                }
            });

            aislesObj[aisleName] = Object.values(merged);
        });
    }

    // Render grocery list
    const storeKeys = Object.keys(itemsByStore).sort();

    storeKeys.forEach(storeName => {
        const card = document.createElement("div");
        card.className = "grocery-store-card";

        const headerRow = document.createElement("div");
        headerRow.className = "grocery-store-header";
        headerRow.style.display = "flex";
        headerRow.style.alignItems = "center";
        headerRow.style.justifyContent = "space-between";

        const title = document.createElement("h3");
        title.textContent = storeName;

        const storeInfo = findStoreByName(storeName);
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "grocery-store-actions";

        // Shop button
        if (storeInfo && storeInfo.storeHomeUrl) {
            const shopBtn = document.createElement("button");
            shopBtn.className = "primary";
            shopBtn.textContent = "Shop";
            shopBtn.style.marginRight = "6px";
            shopBtn.onclick = () => {
                window.open(storeInfo.storeHomeUrl, "_blank", "noopener,noreferrer");
            };
            buttonGroup.appendChild(shopBtn);
        }

        // Delivery service buttons
        DELIVERY_SERVICES.forEach(service => {
            const url = service.storeUrl.replace("{STORE}", encodeURIComponent(storeName));

            const btn = document.createElement("button");
            btn.className = service.buttonClass || "secondary";
            btn.textContent = service.name;
            btn.style.marginLeft = "4px";
            btn.onclick = () => {
                window.open(url, "_blank", "noopener,noreferrer");
            };

            buttonGroup.appendChild(btn);
        });

        headerRow.appendChild(title);
        headerRow.appendChild(buttonGroup);
        card.appendChild(headerRow);

        // Render items by aisle
        const aislesObj = itemsByStore[storeName];

        Object.keys(aislesObj).sort().forEach(aisle => {
            aislesObj[aisle].forEach(item => {
                const qtyPart = item.qty > 1 ? ` (${item.qty} ${item.unit})` : "";

                const row = document.createElement("div");
                row.className = "grocery-item";

                const left = document.createElement("span");
                left.className = "grocery-item-name";
                left.textContent = `${item.name}${qtyPart}`;

                const right = document.createElement("span");
                right.className = "grocery-item-aisle";
                right.textContent = aisle;

                row.appendChild(left);
                row.appendChild(right);

                card.appendChild(row);
            });
        });

        container.appendChild(card);
    });
}

export async function buildGroceryList() {
    renderGroceryList();
    
    const { switchTab } = await import('../shared/ui.js');
    switchTab("groceryTab");
}

// EXPOSE TO WINDOW (TEMP)
export function setupGroceryListGlobals() {
    window.buildGroceryList = buildGroceryList;
}
