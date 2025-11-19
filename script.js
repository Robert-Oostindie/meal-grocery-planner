/****************************************************
 * GROCERY PLANNER v2.0
 * Full Script.js — Generated for your custom app
 * 
 * Features:
 * - Recipes w/ categories & ingredients
 * - Ingredient groups (substitutions)
 * - Planner with collapse/expand
 * - Planner-only items
 * - Store management
 * - Extras (non-meal items)
 * - Grocery list generation
 * - Versioned data structures
 ****************************************************/

// ==================================================
// VERSIONED STORAGE
// ==================================================
const STORAGE_KEY = "mealPlannerData_v2";

let appData = {
    version: 2,
    meals: [],
    categories: [
        "Low Prep",
        "Medium Prep",
        "High Prep / Longer Cook Times",
        "Grilling",
        "Breakfast",
        "Crock Pot",
        "Sides",
        "Appetizers",
        "Baby Meals"
    ],
    customCategories: [],
    stores: ["Aldi", "Walmart", "Festival Foods", "Woodmans"],
    extras: [],
    planner: {
        selectedMeals: [],
        ingredientsState: {},
        plannerOnlyItems: []
    }
};

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
        } catch (e) { console.error("Corrupted data:", e); }
    }
}
loadData();

// ==================================================
// TAB SWITCHING + FAB CONTROL
// ==================================================
function switchTab(tab) {
    const sections = ["meals", "planner", "extras", "stores", "groceries", "pantry"];
    sections.forEach(t => {
        document.getElementById(`tab-${t}`).classList.add("hidden");
    });
    document.getElementById(`tab-${tab}`).classList.remove("hidden");

    document.querySelectorAll(".tab-btn").forEach(btn => {
        if (btn.dataset.tab === tab) btn.classList.add("active");
        else btn.classList.remove("active");
    });

    document.getElementById("fab-recipes").style.display =
        tab === "meals" ? "flex" : "none";

    document.getElementById("fab-extras").style.display =
        tab === "extras" ? "flex" : "none";
}
window.switchTab = switchTab;

// ==================================================
// CATEGORY MANAGEMENT
// ==================================================
function populateCategoryDropdown() {
    const dropdown = document.getElementById("meal-category");
    dropdown.innerHTML = "";

    const sortedCategories = [...appData.categories, ...appData.customCategories]
        .sort((a, b) => a.localeCompare(b));

    sortedCategories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        dropdown.appendChild(opt);
    });

    // Add "New Category…" option
    const opt = document.createElement("option");
    opt.value = "__new__";
    opt.textContent = "➕ Add New Category…";
    dropdown.appendChild(opt);
}

function handleNewCategorySelection() {
    const sel = document.getElementById("meal-category");
    if (sel.value === "__new__") {
        const name = prompt("Enter new category name:");
        if (name && name.trim() !== "") {
            appData.customCategories.push(name.trim());
            saveData();
            populateCategoryDropdown();
            sel.value = name.trim();
        } else {
            populateCategoryDropdown();
        }
    }
}

// ==================================================
// STORE MANAGEMENT
// ==================================================
function populateStoreDropdowns() {
    const storeDropdowns = [
        document.getElementById("ingredient-store"),
        document.getElementById("extra-store")
    ];

    storeDropdowns.forEach(dd => {
        dd.innerHTML = "";
        appData.stores.sort().forEach(store => {
            const opt = document.createElement("option");
            opt.value = store;
            opt.textContent = store;
            dd.appendChild(opt);
        });
    });
}

document.getElementById("add-store-btn").addEventListener("click", () => {
    const input = document.getElementById("store-name");
    const name = input.value.trim();
    if (!name) return;

    if (!appData.stores.includes(name)) {
        appData.stores.push(name);
        saveData();
        input.value = "";
        populateStoreList();
        populateStoreDropdowns();
    }
});

function populateStoreList() {
    const container = document.getElementById("store-list");
    container.innerHTML = "";

    appData.stores.sort().forEach(store => {
        const tag = document.createElement("div");
        tag.className = "tag";
        tag.textContent = store;
        container.appendChild(tag);
    });
}

// ==================================================
// MEAL MANAGEMENT
// ==================================================
document.getElementById("add-meal-btn").addEventListener("click", () => {
    const name = document.getElementById("meal-name").value.trim();
    const category = document.getElementById("meal-category").value;
    const notes = document.getElementById("meal-notes").value.trim();

    if (!name) return;

    const meal = {
        id: crypto.randomUUID(),
        name,
        category,
        notes,
        ingredients: []
    };

    appData.meals.push(meal);
    saveData();

    document.getElementById("meal-name").value = "";
    document.getElementById("meal-notes").value = "";

    renderMealList();
    renderPlannerMeals();
});

// ==================================================
// INGREDIENT MODAL
// ==================================================
let currentMealId = null;
let editingIngredientIndex = null;

function openIngredientModal(mealId, ingredientIndex = null) {
    currentMealId = mealId;
    editingIngredientIndex = ingredientIndex;

    const modal = document.getElementById("ingredient-modal");
    modal.classList.remove("hidden");

    const meal = appData.meals.find(m => m.id === mealId);

    if (ingredientIndex !== null) {
        const ing = meal.ingredients[ingredientIndex];
        document.getElementById("ingredient-name").value = ing.name;
        document.getElementById("ingredient-qty").value = ing.qty;
        document.getElementById("ingredient-unit").value = ing.unit;
        document.getElementById("ingredient-store").value = ing.store;
        document.getElementById("ingredient-group").value = ing.group || "";
        document.getElementById("ingredient-default").checked = ing.isDefault || false;
    } else {
        document.getElementById("ingredient-name").value = "";
        document.getElementById("ingredient-qty").value = "1";
        document.getElementById("ingredient-unit").value = "CT";
        document.getElementById("ingredient-store").selectedIndex = 0;
        document.getElementById("ingredient-group").value = "";
        document.getElementById("ingredient-default").checked = false;
    }
}

function closeIngredientModal() {
    const modal = document.getElementById("ingredient-modal");
    modal.classList.add("hidden");
}

document.getElementById("ingredient-save").addEventListener("click", () => {
    const meal = appData.meals.find(m => m.id === currentMealId);
    const name = document.getElementById("ingredient-name").value.trim();
    if (!name) return;

    const qty = Number(document.getElementById("ingredient-qty").value || 1);
    const unit = document.getElementById("ingredient-unit").value.trim() || "";
    const store = document.getElementById("ingredient-store").value;
    const group = document.getElementById("ingredient-group").value.trim();
    const isDefault = document.getElementById("ingredient-default").checked;

    const newIngredient = { name, qty, unit, store, group, isDefault };

    if (editingIngredientIndex !== null) {
        meal.ingredients[editingIngredientIndex] = newIngredient;
    } else {
        meal.ingredients.push(newIngredient);
    }

    // Ensure only one default per group
    if (group && isDefault) {
        meal.ingredients.forEach(ing => {
            if (ing.group === group && ing.name !== name) {
                ing.isDefault = false;
            }
        });
    }

    saveData();
    closeIngredientModal();
    renderMealList();
    renderPlannerMeals();
});

document.getElementById("ingredient-cancel").onclick = closeIngredientModal;
document.getElementById("ingredient-cancel-2").onclick = closeIngredientModal;

// ==================================================
// RENDER MEAL LIST
// ==================================================
function renderMealList() {
    const list = document.getElementById("meal-list");
    list.innerHTML = "";

    if (appData.meals.length === 0) {
        document.getElementById("meals-empty-state").classList.remove("hidden");
        return;
    } else {
        document.getElementById("meals-empty-state").classList.add("hidden");
    }

    appData.meals.sort((a, b) => a.name.localeCompare(b.name));

    appData.meals.forEach(meal => {
        const div = document.createElement("div");
        div.className = "meal-item";

        div.innerHTML = `
            <div class="meal-header">
                <div class="meal-title">${meal.name}</div>
                <button class="btn btn-sm btn-outline" onclick="openIngredientModal('${meal.id}')">Add Ingredient</button>
            </div>
            <div class="meal-category-label">${meal.category || "Uncategorized"}</div>
            <div class="meal-ingredients-count">${meal.ingredients.length} ingredients</div>
            <div class="meal-ingredients-editor">
                ${meal.ingredients.map((ing, i) => `
                    <div class="ingredient-row">
                        <span>${ing.name}</span>
                        <button class="btn btn-sm" onclick="openIngredientModal('${meal.id}', ${i})">Edit</button>
                    </div>
                `).join("")}
            </div>
        `;

        list.appendChild(div);
    });

    document.getElementById("meal-count-badge").textContent =
        `${appData.meals.length} meals`;
}

// ==================================================
// PLANNER
// ==================================================
function renderPlannerMeals() {
    const container = document.getElementById("planner-meals");
    container.innerHTML = "";

    if (appData.meals.length === 0) {
        document.getElementById("planner-empty").classList.remove("hidden");
        return;
    }
    document.getElementById("planner-empty").classList.add("hidden");

    const categories = [...appData.categories, ...appData.customCategories]
        .sort((a, b) => a.localeCompare(b));

    categories.forEach(cat => {
        const catMeals = appData.meals.filter(m => m.category === cat);
        if (catMeals.length === 0) return;

        const header = document.createElement("div");
        header.className = "category-header";
        header.textContent = cat;
        container.appendChild(header);

        const divider = document.createElement("div");
        divider.className = "category-divider";
        container.appendChild(divider);

        catMeals.forEach(meal => {
            const mealDiv = document.createElement("div");
            mealDiv.className = "planner-meal";

            const isSelected = appData.planner.selectedMeals.includes(meal.id);

            mealDiv.innerHTML = `
                <label class="planner-meal-row">
                    <input 
                        type="checkbox" 
                        data-meal="${meal.id}"
                        ${isSelected ? "checked" : ""}
                    />
                    <span class="planner-meal-name">${meal.name}</span>
                    <button class="expand-btn" data-expand="${meal.id}">
                        ${isSelected ? "▾" : "▸"}
                    </button>
                </label>
                <div class="planner-ingredients ${isSelected ? "" : "hidden"}" id="planner-ingredients-${meal.id}">
                </div>
            `;

            container.appendChild(mealDiv);

            if (isSelected) renderIngredientsForPlannerMeal(meal);
        });
    });

    document.querySelectorAll("input[data-meal]").forEach(cb => {
        cb.addEventListener("change", e => {
            const mealId = e.target.dataset.meal;
            const checked = e.target.checked;

            if (checked) {
                if (!appData.planner.selectedMeals.includes(mealId)) {
                    appData.planner.selectedMeals.push(mealId);
                }
            } else {
                appData.planner.selectedMeals =
                    appData.planner.selectedMeals.filter(id => id !== mealId);
            }

            saveData();
            renderPlannerMeals();
        });
    });

    document.querySelectorAll("[data-expand]").forEach(btn => {
        btn.addEventListener("click", () => {
            const mealId = btn.dataset.expand;
            const container = document.getElementById(`planner-ingredients-${mealId}`);
            const checked = appData.planner.selectedMeals.includes(mealId);

            if (!checked) return;

            if (container.classList.contains("hidden")) {
                container.classList.remove("hidden");
                btn.textContent = "▾";
            } else {
                container.classList.add("hidden");
                btn.textContent = "▸";
            }
        });
    });
}

function renderIngredientsForPlannerMeal(meal) {
    const div = document.getElementById(`planner-ingredients-${meal.id}`);
    div.innerHTML = "";

    const groups = {};
    meal.ingredients.forEach(ing => {
        const key = ing.group || "__none__";
        if (!groups[key]) groups[key] = [];
        groups[key].push(ing);
    });

    Object.keys(groups).forEach(groupName => {
        const groupList = groups[groupName];

        let chosen = groupList.find(i => i.isDefault) || groupList[0];

        const stateKey = `${meal.id}_${chosen.name}`;
        if (!appData.planner.ingredientsState[stateKey]) {
            appData.planner.ingredientsState[stateKey] = {
                included: true,
                comment: "",
                selectedGroupIngredient: chosen.name
            };
            saveData();
        }

        const state = appData.planner.ingredientsState[stateKey];

        const qtyDisplay = chosen.qty > 1 ? `(${chosen.qty} ${chosen.unit})` : "";
        const storeDisplay = chosen.qty > 1 ? chosen.store : chosen.store; 

        const ingDiv = document.createElement("div");
        ingDiv.className = "planner-ing-row";

        ingDiv.innerHTML = `
            <label class="checkbox-row">
                <input 
                    type="checkbox"
                    data-ing="${stateKey}"
                    ${state.included ? "checked" : ""}
                />
                <span>${chosen.name}${qtyDisplay ? " " + qtyDisplay : ""} – ${storeDisplay}</span>
            </label>
            <input 
                type="text"
                class="comment-input"
                placeholder="Add note"
                value="${state.comment || ""}"
                data-comment="${stateKey}"
            />
        `;

        div.appendChild(ingDiv);
    });

    div.querySelectorAll("input[data-ing]").forEach(cb => {
        cb.addEventListener("change", e => {
            const key = e.target.dataset.ing;
            appData.planner.ingredientsState[key].included = e.target.checked;
            saveData();
        });
    });

    div.querySelectorAll("input[data-comment]").forEach(inp => {
        inp.addEventListener("input", e => {
            const key = e.target.dataset.comment;
            appData.planner.ingredientsState[key].comment = e.target.value;
            saveData();
        });
    });
}

// ==================================================
// PLANNER-ONLY ITEMS
// ==================================================
document.getElementById("add-extra-btn").addEventListener("click", () => {
    const name = document.getElementById("extra-name").value.trim();
    const qty = Number(document.getElementById("extra-qty").value || 1);
    const unit = document.getElementById("extra-unit").value.trim() || "";
    const store = document.getElementById("extra-store").value;

    if (!name) return;

    appData.extras.push({ name, qty, unit, store });
    saveData();

    document.getElementById("extra-name").value = "";
    document.getElementById("extra-qty").value = "";
    renderExtras();
});

// ==================================================
// EXTRAS RENDER
// ==================================================
function renderExtras() {
    const container = document.getElementById("extras-list");
    container.innerHTML = "";

    if (appData.extras.length === 0) {
        document.getElementById("extras-empty").classList.remove("hidden");
        return;
    }
    document.getElementById("extras-empty").classList.add("hidden");

    appData.extras.forEach((ex, i) => {
        const div = document.createElement("div");
        div.className = "extras-row";

        const qtyDisplay =
            ex.qty > 1 ? `(${ex.qty} ${ex.unit || ""})` : "";

        div.innerHTML = `
            <label class="checkbox-row">
                <input type="checkbox" data-extra="${i}" checked />
                <span>${ex.name} ${qtyDisplay}</span>
            </label>
            <button class="btn btn-sm btn-danger" data-remove="${i}">✕</button>
        `;

        container.appendChild(div);
    });

    container.querySelectorAll("[data-remove]").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = Number(btn.dataset.remove);
            appData.extras.splice(idx, 1);
            saveData();
            renderExtras();
        });
    });
}

// ==================================================
// GROCERY LIST
// ==================================================
document.getElementById("generate-list-btn").addEventListener("click", () => {
    generateGroceryList();
    switchTab("groceries");
});

function generateGroceryList() {
    const groups = {};
    appData.stores.forEach(store => groups[store] = []);

    Object.keys(appData.planner.ingredientsState).forEach(key => {
        const state = appData.planner.ingredientsState[key];
        if (!state.included) return;

        const [mealId, ingName] = key.split("_");
        const meal = appData.meals.find(m => m.id === mealId);
        const ing = meal.ingredients.find(i => i.name === ingName);

        const qtyDisplay =
            ing.qty > 1 ? `(${ing.qty} ${ing.unit})` : "";

        groups[ing.store].push({
            name: ing.name,
            qtyDisplay,
            comment: state.comment
        });
    });

    appData.extras.forEach((ex, i) => {
        if (ex.qty > 1) {
            groups[ex.store].push({
                name: ex.name,
                qtyDisplay: `(${ex.qty} ${ex.unit})`,
                comment: ""
            });
        } else {
            groups[ex.store].push({
                name: ex.name,
                qtyDisplay: "",
                comment: ""
            });
        }
    });

    renderGrocery(groups);
}

function renderGrocery(groups) {
    const container = document.getElementById("grocery-groups");
    container.innerHTML = "";

    Object.keys(groups).forEach(store => {
        if (groups[store].length === 0) return;

        const header = document.createElement("div");
        header.className = "category-header";
        header.textContent = store;
        container.appendChild(header);

        const divider = document.createElement("div");
        divider.className = "category-divider";
        container.appendChild(divider);

        groups[store].forEach(item => {
            const div = document.createElement("div");
            div.className = "grocery-item";

            const comment = item.comment ? ` (${item.comment})` : "";
            const qtyText = item.qtyDisplay ? ` ${item.qtyDisplay}` : "";

            div.textContent = `• ${item.name}${qtyText}${comment}`;
            container.appendChild(div);
        });
    });
}

// ==================================================
// STARTUP
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
    populateCategoryDropdown();
    populateStoreDropdowns();
    populateStoreList();
    renderMealList();
    renderPlannerMeals();
    renderExtras();
});
