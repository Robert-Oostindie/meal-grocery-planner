// ==============================
// STORAGE & APP STATE
// ==============================
const LS_KEY = "mealPlanner_rebuild_v1";

// ==============================
// GLOBAL STORES (Built-in)
// ==============================
const GLOBAL_CATEGORIES = [
    "Low Prep",
    "Medium Prep",
    "High Prep / Longer Cook Times",
    "Grilling",
    "Breakfast",
    "Crock Pot",
    "Sides",
    "Appetizers",
    "Baby Meals"
];
const GLOBAL_RECIPES = [
    {
        id: "global_tacos",
        name: "Tacos",
        category: "Low Prep",
        ingredients: [
            { id: makeId(), name: "Tortillas", qty: 1, unit: "CT", store: "Walmart" },
            { id: makeId(), name: "Ground Beef", qty: 1, unit: "LB", store: "Walmart" }
        ]
    },
    {
        id: "global_pasta",
        name: "Pasta with Sauce",
        category: "Low Prep",
        ingredients: [...]
    }
];

const GLOBAL_STORES = [
    {
        id: "aldi",
        name: "Aldi",
        affiliateUrl: "https://www.aldi.us/search?q={ITEM}",
        storeHomeUrl: "https://www.aldi.us/"
    },
    {
        id: "walmart",
        name: "Walmart",
        affiliateUrl: "https://www.walmart.com/search?q={ITEM}",
        storeHomeUrl: "https://www.walmart.com/"
    },
    {
        id: "amazon",
        name: "Amazon",
        affiliateUrl: "https://www.amazon.com/s?k={ITEM}&tag=YOURAFFID",
        storeHomeUrl: "https://www.amazon.com/"
    }
    // add more later as needed
];

// ==============================
// DELIVERY SERVICES (Instacart, DoorDash, etc.)
// ==============================
const DELIVERY_SERVICES = [
    {
        id: "instacart",
        name: "Instacart",
        // store-level search (used for header buttons)
        storeUrl: "https://www.instacart.com/store/search?q={STORE}",
        // item-level search (used for user-store items)
        itemUrl: "https://www.instacart.com/store/search?q={ITEM}",
        buttonClass: "delivery-btn instacart-btn"
    },
    {
        id: "doordash",
        name: "DoorDash",
        storeUrl: "https://www.doordash.com/search/store/{STORE}",
        itemUrl: "https://www.doordash.com/search/store/{ITEM}",
        buttonClass: "delivery-btn doordash-btn"
    }
];

// Return global + user stores together
function getAllStores() {
    return [
        ...GLOBAL_STORES,
        ...(state.userStores || [])
    ];
}

// Find a store by its display name (for affiliate links & shop button)
function findStoreByName(name) {
    if (!name) return null;
    return getAllStores().find(s => s.name === name) || null;
}


let state = {
    userCategories: [],

    // user-defined stores only; globals come from GLOBAL_STORES
    userStores: [
        { id: makeId(), name: "Festival Foods" },
        { id: makeId(), name: "Woodmans" }
    ],
    plannerMeals: [],
    plannerExtras: [],
    collapsedCategories: [],
    collapsedMeals: {},
    plannerIngredientChecks: {},
    plannerIngredientComments: {},
    plannerSubstituteSelections: {},
    plannerMealMultipliers: {},
    userMeals: []

};

// ==============================
// ID HELPER (SAFER THAN crypto.randomUUID DIRECT USE)
// ==============================
function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return (
        "id_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(16).slice(2)
    );
}
function getAllMeals() {
    return [
        ...GLOBAL_RECIPES,
        ...(state.userMeals || [])
    ];
}

function toggleMealCollapse(mealId) {
    state.collapsedMeals[mealId] = !state.collapsedMeals[mealId];
    saveState();
    renderPlanner();
}
function getAllCategories() {
    return [...GLOBAL_CATEGORIES, ...(state.userCategories || [])];
}


// for the recipe modal
let ingredientRows = [];
let editingMealId = null;
let currentStep = 1;
let subModalMealId = null;
let subModalGroupName = null;
let subModalIngredientIndex = null;

// ==============================
// SUBSTITUTE GROUP SUGGESTIONS
// ==============================
function getExistingGroups() {
    const groups = new Set();

    // include groups already typed in this modal
    ingredientRows.forEach(r => {
        if (r.group && r.group.trim() !== "") {
            groups.add(r.group.trim());
        }
    });

    // also include groups from all saved meals
    getAllMeals().forEach(meal => {
        (meal.ingredients || []).forEach(ing => {
            if (ing.group && ing.group.trim() !== "") {
                groups.add(ing.group.trim());
            }
        });
    });

    return Array.from(groups);
}
    
function exportAppData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.download = `mealplanner_backup_${timestamp}.json`;

    a.click();
    URL.revokeObjectURL(url);
}

function importAppData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            // Minimal validation
            if (typeof imported !== "object" || !imported.meals) {
                alert("Invalid backup file.");
                return;
            }

            state = { ...state, ...imported };
            saveState();
            renderApp();

            alert("Data imported successfully!");
        } catch (err) {
            console.error(err);
            alert("There was an error importing the file.");
        }
    };

    reader.readAsText(file);
}

function showGroupSuggestions(inputEl, index) {
    // remove old menu if any
    const oldMenu = document.querySelector(".group-suggest-menu");
    if (oldMenu) oldMenu.remove();

    const groups = getExistingGroups().filter(g =>
        g.toLowerCase().includes(inputEl.value.toLowerCase())
    );

    if (groups.length === 0) return;

    const menu = document.createElement("div");
    menu.className = "group-suggest-menu";

    groups.forEach(g => {
        const item = document.createElement("div");
        item.className = "group-suggest-item";
        item.textContent = g;
        // pointerdown fires BEFORE blur on mobile + desktop
       item.onpointerdown = (e) => {
            e.preventDefault();
            window.__clickedGroupItem = g;

            inputEl.value = g;
            ingredientRows[index].group = g;

            // Force popup ALWAYS when picking a suggestion
            handleGroupFinished(index, g);

            if (menu) menu.remove();
        };


        menu.appendChild(item);
    });

   // Position inside the modal so the menu stays aligned
// Position the dropdown precisely under the input, relative to modal-content
const contentEl = document.querySelector("#recipeModal .modal-content");

const inputRect = inputEl.getBoundingClientRect();
const contentRect = contentEl.getBoundingClientRect();

// Exact alignment inside modal-content
menu.style.position = "absolute";
menu.style.left = (inputRect.left - contentRect.left) + "px";
menu.style.top = (inputRect.bottom - contentRect.top) + "px";
menu.style.width = inputRect.width + "px";
menu.style.zIndex = 9999;

// Attach menu inside modal-content, NOT whole modal
contentEl.appendChild(menu);


}

document.addEventListener("mousedown", (e) => {
    const menu = document.querySelector(".group-suggest-menu");
    if (!menu) return;

    const clickedInsideMenu = menu.contains(e.target);
    const clickedInput = e.target.classList.contains("ingGroup");

    // If click is on menu or input, do nothing
    if (clickedInsideMenu || clickedInput) return;

    // Otherwise: close it
    menu.remove();
});



loadState();
document.addEventListener("DOMContentLoaded", () => {
    renderApp();
});

function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);

        state = { ...state, ...saved };

        // Backwards compatibility: if old "stores" exist and no userStores yet
        if (!state.userStores && Array.isArray(saved.stores)) {
            state.userStores = saved.stores.map(name => ({
                id: makeId(),
                name
            }));
        }

    } catch (e) {
        console.warn("Could not load saved state:", e);
    }
}


function saveState() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn("Could not save state:", e);
    }
}

// ==============================
// TABS
// ==============================
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        switchTab(tabId);
    });
});

function switchTab(tabId) {
    tabPages.forEach(page => {
        page.classList.toggle("active", page.id === tabId);
    });

    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    if (tabId === "groceryTab") renderGroceryList();
    if (tabId === "storesTab") renderStoresTab();   // 👈 NEW
}



function renderApp() {
    const activeTab = document.querySelector(".tab-page.active")?.id;

    renderRecipes();
    renderPlanner();

    // Only render grocery list IF the grocery tab is active
    if (activeTab === "groceryTab") {
        renderGroceryList();
    }
}



// ==============================
// RECIPES LIST
// ==============================
function renderRecipes() {
    const container = document.getElementById("recipesList");
    if (!container) return;

    container.innerHTML = "";

    if (!getAllMeals().length) {
        const empty = document.createElement("p");
        empty.className = "section-note";
        empty.textContent = "No recipes yet. Tap + Add Recipe to create one.";
        container.appendChild(empty);
        return;
    }

    getAllMeals().forEach(meal => {
        const card = document.createElement("div");
        card.className = "card";

        const ingredientCount = (meal.ingredients || []).length;
        const countText = ingredientCount === 1
            ? "1 ingredient"
            : `${ingredientCount} ingredients`;

        card.innerHTML = `
            <div class="recipe-header" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div class="recipe-title" style="font-weight:600; font-size:1rem;">${meal.name}</div>
                    <div class="recipe-meta" style="font-size:0.9rem; color:#6b7280;">
                        ${meal.category} · ${countText}
                    </div>
                </div>
                <div style="display:flex; gap:0.4rem;">
                    <button class="primary" onclick="openRecipeModalEdit('${meal.id}')">Edit</button>
                    <button class="danger" onclick="deleteRecipe('${meal.id}')">Delete</button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function deleteRecipe(id) {
    const isGlobal = GLOBAL_RECIPES.some(m => m.id === id);

    if (isGlobal) {
        alert("Starter recipes cannot be deleted.");
        return;
    }

    state.userMeals = state.userMeals.filter(m => m.id !== id);

    saveState();
    renderRecipes();
    renderPlanner();
}


// ==============================
// RECIPE MODAL: OPEN / CLOSE
// ==============================
function openRecipeModalNew() {
    editingMealId = null;
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Add Recipe";
    document.getElementById("modalRecipeName").value = "";

    populateCategoryDropdown("");

    // start with no ingredients
    ingredientRows = [];
    renderIngredientsEditor();

    updateReview();
    showModal(true);
    updateStepUI();
}

function openRecipeModalEdit(mealId) {
    const meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    editingMealId = mealId;
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Edit Recipe";
    document.getElementById("modalRecipeName").value = meal.name || "";

    populateCategoryDropdown(meal.category || "");

    // copy ingredients into working rows
    ingredientRows = (meal.ingredients || []).map(ing => ({ ...ing }));
    renderIngredientsEditor();

    updateReview();
    showModal(true);
    updateStepUI();
}

function closeRecipeModal() {
    showModal(false);
}

function showModal(show) {
    const modal = document.getElementById("recipeModal");
    if (!modal) return;
    if (show) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
    }
}

// allow ESC to close
document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeRecipeModal();
});

// ==============================
// CATEGORY DROPDOWN (STEP 1)
// ==============================
function populateCategoryDropdown(selected) {
    const sel = document.getElementById("modalRecipeCategory");
    if (!sel) return;

    sel.innerHTML = "";
    getAllCategories().forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === selected) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ==============================
// MODAL STEPS
// ==============================
function goToStep(stepNumber) {
    // basic validation when moving forward
    if (stepNumber === 2 || stepNumber === 3) {
        const name = document.getElementById("modalRecipeName").value.trim();
        const category = document.getElementById("modalRecipeCategory").value.trim();

        if (!name) {
            alert("Please enter a meal name.");
            currentStep = 1;
            updateStepUI();
            return;
        }
        if (!category) {
            alert("Please select a category.");
            currentStep = 1;
            updateStepUI();
            return;
        }
    }

    if (stepNumber === 3) {
        syncIngredientsFromDOM();
        updateReview();
    }

    currentStep = stepNumber;
    updateStepUI();
}

function updateStepUI() {
    const step1 = document.getElementById("modalStep1");
    const step2 = document.getElementById("modalStep2");
    const step3 = document.getElementById("modalStep3");

    [step1, step2, step3].forEach(s => s.classList.add("hidden"));
    if (currentStep === 1 && step1) step1.classList.remove("hidden");
    if (currentStep === 2 && step2) step2.classList.remove("hidden");
    if (currentStep === 3 && step3) step3.classList.remove("hidden");

    // update dots
    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById(`stepDot${i}`);
        if (!dot) continue;
        dot.classList.toggle("active", i === currentStep);
    }
}

// ==============================
// INGREDIENT EDITOR (STEP 2)
// ==============================
function renderIngredientsEditor() {
    const container = document.getElementById("ingredientsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!ingredientRows.length) {
        const note = document.createElement("p");
        note.className = "section-note";
        note.textContent = "No ingredients yet. Tap + Add Ingredient to add some.";
        container.appendChild(note);
        return;
    }

    ingredientRows.forEach((row, index) => {
        const div = document.createElement("div");
        div.className = "ingredient-row";
        div.dataset.id = row.id;   // <-- ADD THIS LINE


        const storeOptions = getAllStores()
            .map(s => {
                const selected = row.store === s.name ? "selected" : "";
                return `<option ${selected}>${s.name}</option>`;
            })
            .join("");


        div.innerHTML = `
            <input class="ingName" placeholder="Ingredient name" value="${row.name || ""}">

            <div style="display:flex; gap:0.5rem;">
                <input class="ingQty" type="number" min="1" placeholder="Qty" value="${row.qty || 1}">
                <input class="ingUnit" placeholder="Unit" value="${row.unit || "CT"}">
                <select class="ingStore">${storeOptions}</select>
            </div>

            <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.3rem;">
                <input class="ingGroup" 
                   style="flex:1;" 
                   value="${row.group}" 
                   placeholder="Substitute group"
                   oninput="ingredientRows[${index}].group = this.value; showGroupSuggestions(this, ${index})"
                   onfocus="showGroupSuggestions(this, ${index})"
                      onblur="setTimeout(() => {
                        const menu = document.querySelector('.group-suggest-menu');
                        const picked = window.__clickedGroupItem;

                        if (picked) {
                            ingredientRows[${index}].group = picked;
                            this.value = picked;
                        } else {
                            handleGroupFinished(${index}, this.value);
                        }

                        delete window.__clickedGroupItem;
                        if (menu) menu.remove();
                    }, 120)"
                    >



                <div class="default-toggle ${row.isDefault ? "active" : ""}" onclick="toggleDefault(${index})">
                    ${row.isDefault ? "⭐ Default" : "☆ Make Default"}
                </div>
                <button class="danger" style="margin-left:0.3rem;" onclick="removeIngredientRow(${index})">Remove</button>
            </div>
        `;

        container.appendChild(div);
    });
}

function addIngredientRow() {
    // Sync what the user already typed BEFORE adding a new row
    syncIngredientsFromDOM();

    const allStores = getAllStores();
    const defaultStore = allStores[0]?.name || "";


    ingredientRows.push({
        id: makeId(),   // <-- Correct fixed ID assignment
        name: "",
        qty: 1,
        unit: "CT",
        store: defaultStore,
        group: "",
        isDefault: false
    });

    renderIngredientsEditor();
}



function removeIngredientRow(idx) {
    ingredientRows.splice(idx, 1);
    renderIngredientsEditor();
}
function toggleDefault(idx) {
    // Sync first so nothing gets erased
    syncIngredientsFromDOM();

    const group = ingredientRows[idx].group.trim();

    if (!group) {
        alert("Set a substitute group name first.");
        return;
    }

    // Clear defaults for this group
    ingredientRows.forEach(r => {
        if (r.group === group) r.isDefault = false;
    });

    // Set this one as default
    ingredientRows[idx].isDefault = true;

    // Re-render UI
    renderIngredientsEditor();
}



// read latest values from DOM into ingredientRows before review/save
function syncIngredientsFromDOM() {
    const container = document.getElementById("ingredientsContainer");
    if (!container) return;

    const rows = container.querySelectorAll(".ingredient-row");

    ingredientRows = Array.from(rows).map(rowEl => {
        const id = rowEl.dataset.id || makeId();

        return {
            id,
            name: rowEl.querySelector(".ingName").value.trim(),
            qty: Number(rowEl.querySelector(".ingQty").value) || 1,
            unit: (rowEl.querySelector(".ingUnit").value || "CT").trim(),
            store: rowEl.querySelector(".ingStore").value,
            group: rowEl.querySelector(".ingGroup").value.trim(),
            isDefault: rowEl.querySelector(".default-toggle").classList.contains("active")
        };
    });
}

// Return the list of "active" ingredients for a meal:
//  - all non-grouped ingredients
//  - exactly 1 ingredient per substitute group, default or user-selected
function getActiveIngredientsForMeal(meal) {
    if (!meal || !Array.isArray(meal.ingredients)) {
        console.warn("[ING] Meal has no valid ingredients:", meal);
        return [];
    }

    const ingredients = meal.ingredients;
    const groupsMap = {};
    const ungrouped = [];

    // Separate grouped vs ungrouped
    ingredients.forEach(ing => {
        if (!ing || !ing.id) return; // ignore corrupt ingredient objects

        if (ing.group) {
            if (!groupsMap[ing.group]) groupsMap[ing.group] = [];
            groupsMap[ing.group].push(ing);
        } else {
            ungrouped.push(ing);
        }
    });

    const result = [...ungrouped];

    // Load user's selected substitutes
    const selectionsForMeal =
        state.plannerSubstituteSelections?.[meal.id] || {};

    // Handle groups safely
    Object.keys(groupsMap).forEach(groupName => {
        const groupIngs = groupsMap[groupName];
        if (!groupIngs.length) return;

        const defaultIng =
            groupIngs.find(i => i.isDefault) || groupIngs[0];

        const selectedId =
            selectionsForMeal[groupName] || defaultIng.id;

        const activeIng =
            groupIngs.find(i => i.id === selectedId) || defaultIng;

        if (activeIng) result.push(activeIng);
    });

    return result;
}

function openSubstituteModal(mealId, groupName) {

    // 🔥 SAFETY CHECK:
    // If the recipe editor is using the modal, do NOT open the planner modal.
    // handleGroupFinished() uses "__recipe_edit__" as the indicator.
    if (mealId === "__recipe_edit__") return;

    // Store modal context
    subModalMealId = mealId;
    subModalGroupName = groupName;

    const meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    // ---------------------------------------------------------
    // 1. Collect ALL ingredients across all meals for this group
    // ---------------------------------------------------------
    const options = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                options.push({ ...ing, _mealId: m.id });
            }
        });
    });

    if (!options.length) return; // should never happen

    // ---------------------------------------------------------
    // 2. Determine THIS recipe's default ingredient for this group
    // ---------------------------------------------------------
    const recipeDefaults = (meal.ingredients || []).filter(
        ing => ing.group === groupName && ing.isDefault
    );

    const recipeDefaultId =
        recipeDefaults.length ? recipeDefaults[0].id : null;

    // ---------------------------------------------------------
    // 3. Determine CURRENT selected ingredient (user override)
    // ---------------------------------------------------------
    const selectionsForMeal = state.plannerSubstituteSelections[mealId] || {};

    const selectedId =
        selectionsForMeal[groupName] ||      // user selection
        recipeDefaultId ||                   // recipe default
        options[0].id;                       // fallback

    // ---------------------------------------------------------
    // 4. Render the modal UI
    // ---------------------------------------------------------
    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

    options.forEach(ing => {
        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

        // Only show "default" label if default for THIS recipe
        const isDefaultLabel =
            recipeDefaultId && ing.id === recipeDefaultId
                ? " ⭐ default"
                : "";

        const row = document.createElement("label");
        row.style.display = "block";
        row.style.marginBottom = "0.4rem";
        row.innerHTML = `
            <input 
                type="radio" 
                name="subChoice" 
                value="${ing.id}"
                ${ing.id === selectedId ? "checked" : ""}
            >
            ${ing.name}${qtyPart}${isDefaultLabel}
        `;
        body.appendChild(row);
    });

    // Open modal
    const modal = document.getElementById("subModal");
    if (modal) modal.classList.remove("hidden");
}

// When user finishes typing a group name in recipe editor
function handleGroupFinished(index, groupName) {
    groupName = groupName.trim();
    if (!groupName) return;

    // Build list of ALL ingredients across ALL meals that belong to this group
    const matches = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                matches.push(ing);
            }
        });
    });

    // NEW RULE:
    // If group exists 0 times → do nothing
    if (matches.length === 0) return;

    // Load modal body
    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

    // Show all existing global ingredients (even if only one)
    matches.forEach(ing => {
        const qty = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
        const row = document.createElement("label");
        row.style.display = "block";
        row.style.margin = "0.35rem 0";
        row.innerHTML = `
            <input type="radio" name="reuseChoice" value="${ing.id}">
            ${ing.name}${qty}
        `;
        body.appendChild(row);
    });

    // Always allow creating a brand-new ingredient
    const addNew = document.createElement("label");
    addNew.style.display = "block";
    addNew.style.margin = "0.7rem 0 0.3rem";
    addNew.innerHTML = `
        <input type="radio" name="reuseChoice" value="__new__">
        Add a brand-new ingredient
    `;
    body.appendChild(addNew);

    // Store which ingredient row is being edited
    subModalMealId = "__recipe_edit__";
    subModalGroupName = groupName;
    subModalIngredientIndex = index;

    // Open modal
    document.getElementById("subModal").classList.remove("hidden");
}

function getGlobalGroupIngredients(groupName) {
    const results = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                results.push({ ...ing, _mealId: m.id });
            }
        });
    });
    return results;
}

function closeSubstituteModal() {
    const modal = document.getElementById("subModal");
    if (modal) modal.classList.add("hidden");

    // 🔥 Reset ALL modal context values
    subModalMealId = null;
    subModalGroupName = null;
    subModalIngredientIndex = null;

    // Also clear modal body so old options never appear again
    const body = document.getElementById("subModalBody");
    if (body) body.innerHTML = "";
}


function applySubstituteChoice() {
    // ----------------------------------------------------
    // MODE 1: Choosing an ingredient inside the RECIPE EDITOR
    // ----------------------------------------------------
    if (subModalMealId === "__recipe_edit__") {
        const selected = document.querySelector('input[name="reuseChoice"]:checked');
        if (!selected) {
            closeSubstituteModal();
            return;
        }

        const choice = selected.value;

        // If reusing an existing ingredient from another meal
        if (choice !== "__new__") {
            const ing = findIngredientById(choice);
            if (ing) {
                ingredientRows[subModalIngredientIndex].name = ing.name;
                ingredientRows[subModalIngredientIndex].qty = ing.qty;
                ingredientRows[subModalIngredientIndex].unit = ing.unit;
                ingredientRows[subModalIngredientIndex].store = ing.store;

                // ⚠️ Importantly DO NOT copy over defaults or IDs
                // The ingredient still belongs to THIS recipe as a new instance
            }
        }

        renderIngredientsEditor();
        closeSubstituteModal();
        return;
    }

    // ----------------------------------------------------
    // MODE 2: Selecting a substitute for the Planner
    // ----------------------------------------------------
    const selected = document.querySelector('input[name="subChoice"]:checked');
    if (!selected) {
        closeSubstituteModal();
        return;
    }

    const ingId = selected.value;

    // Ensure dictionary entry exists
    if (!state.plannerSubstituteSelections[subModalMealId]) {
        state.plannerSubstituteSelections[subModalMealId] = {};
    }

    // Save selection
    state.plannerSubstituteSelections[subModalMealId][subModalGroupName] = ingId;

    saveState();
    closeSubstituteModal();
    renderPlanner();
}

function findIngredientById(id) {
    for (const meal of getAllMeals()) {
        for (const ing of (meal.ingredients || [])) {
            if (ing.id === id) return ing;
        }
    }
    return null;
}


// ==============================
// PLANNER TAB
// ==============================
function renderPlanner() {
    const container = document.getElementById("plannerContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!getAllMeals().length) {
        container.innerHTML = `<p class="section-note">No meals yet. Add recipes first.</p>`;
        renderPlannerExtras();
        return;
    }

    // Group meals by category
    const byCategory = {};
    getAllMeals().forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    // Sort categories alphabetically for consistency
    Object.keys(byCategory).sort().forEach(cat => {
        const catWrapper = document.createElement("div");
        catWrapper.className = "planner-category";

        const isCollapsedCategory = state.collapsedCategories.includes(cat);

        // Category header (accordion)
        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleCategory(cat);
        header.innerHTML = `
            <span class="chevron">${isCollapsedCategory ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;
        catWrapper.appendChild(header);

        // Meals list (only if category is not collapsed)
        if (!isCollapsedCategory) {
            byCategory[cat].forEach(meal => {
                const mealRow = document.createElement("div");
                mealRow.className = "planner-meal-block";

                const isSelected = state.plannerMeals.includes(meal.id);

                // main row container
                const mainRow = document.createElement("label");
                mainRow.className = "planner-meal-row";

                const multiplier = state.plannerMealMultipliers[meal.id] || 1;
                const isMealCollapsed = state.collapsedMeals[meal.id] === true;

                mainRow.innerHTML = `
                    <input 
                        type="checkbox"
                        ${isSelected ? "checked" : ""}
                        onchange="togglePlannerMeal('${meal.id}')"
                        onclick="event.stopPropagation();"
                    >

                    <span 
                        class="meal-collapse-toggle"
                        onclick="event.stopPropagation(); toggleMealCollapse('${meal.id}')"
                        style="cursor:pointer; user-select:none; margin-right:6px;"
                    >
                        ${isMealCollapsed ? "▶" : "▼"}
                    </span>

                    <span>${meal.name}</span>

                    <select 
                        class="meal-multiplier"
                        onchange="updateMealMultiplier('${meal.id}', this.value)"
                        style="margin-left:8px; padding:2px 6px;"
                    >
                        <option value="1" ${multiplier==1 ? "selected" : ""}>1×</option>
                        <option value="2" ${multiplier==2 ? "selected" : ""}>2×</option>
                        <option value="3" ${multiplier==3 ? "selected" : ""}>3×</option>
                        <option value="4" ${multiplier==4 ? "selected" : ""}>4×</option>
                        <option value="5" ${multiplier==5 ? "selected" : ""}>5×</option>
                    </select>
                `;

                mealRow.appendChild(mainRow);

                // If selected & not collapsed at meal or category level, show ingredients
                if (isSelected && !isMealCollapsed && !isCollapsedCategory) {
                    const ingDiv = document.createElement("div");
                    ingDiv.className = "planner-ingredients";

                    let activeIngredients = [];
                    try {
                        activeIngredients = getActiveIngredientsForMeal(meal) || [];
                    } catch (e) {
                        console.error("Error in getActiveIngredientsForMeal (planner) for meal:", meal.id, e);
                        activeIngredients = [];
                    }

                    if (!activeIngredients.length) {
                        const placeholder = document.createElement("div");
                        placeholder.className = "planner-ingredient-check";
                        placeholder.innerHTML = `<span class="muted">(No ingredients)</span>`;
                        ingDiv.appendChild(placeholder);
                        mealRow.appendChild(ingDiv);
                    } else {
                        activeIngredients.forEach(ing => {
                            const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

                            if (!state.plannerIngredientChecks[meal.id]) {
                                state.plannerIngredientChecks[meal.id] = {};
                            }
                            if (state.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                                state.plannerIngredientChecks[meal.id][ing.id] = true;
                            }

                            const checked = state.plannerIngredientChecks[meal.id][ing.id];
                            const existingComment =
                                state.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

                            const line = document.createElement("div");
                            line.className = "planner-ingredient-check";

                            let inner = `
                                <input 
                                    type="checkbox"
                                    ${checked ? "checked" : ""}
                                    onclick="togglePlannerIngredient('${meal.id}', '${ing.id}')"
                                >
                                <span>${ing.name}${qtyPart} <span class="muted">– ${ing.store}</span></span>

                                <input 
                                    type="text"
                                    class="ing-comment"
                                    placeholder="Comment"
                                    value="${existingComment}"
                                    oninput="updateIngredientComment('${meal.id}', '${ing.id}', this.value)"
                                    style="margin-left:8px; flex:1;"
                                >
                            `;

                            if (ing.group) {
                                inner += `
                                    <button 
                                        class="primary" 
                                        style="margin-left:8px; white-space:nowrap;"
                                        onclick="openSubstituteModal('${meal.id}', '${ing.group}')"
                                    >
                                        Swap
                                    </button>
                                `;
                            }

                            line.innerHTML = inner;
                            ingDiv.appendChild(line);
                        });

                        mealRow.appendChild(ingDiv);
                    }
                }

                catWrapper.appendChild(mealRow);
            });
        }

        container.appendChild(catWrapper);
    });

    // Render extras under planner
    renderPlannerExtras();
}


function updateMealMultiplier(mealId, value) {
    state.plannerMealMultipliers[mealId] = Number(value);
    saveState();
    renderPlanner(); // optional: re-render preview
}

function toggleCategory(cat) {
    const idx = state.collapsedCategories.indexOf(cat);
    if (idx === -1) {
        state.collapsedCategories.push(cat);
    } else {
        state.collapsedCategories.splice(idx, 1);
    }
    saveState();
    renderPlanner();
}
function toggleMealCollapse(mealId) {
    state.collapsedMeals[mealId] = !state.collapsedMeals[mealId];
    saveState();
    renderPlanner();
}

function updateIngredientComment(mealId, ingId, text) {
    if (!state.plannerIngredientComments[mealId]) {
        state.plannerIngredientComments[mealId] = {};
    }
    state.plannerIngredientComments[mealId][ingId] = text;
    saveState();
}


function togglePlannerMeal(mealId) {
    const idx = state.plannerMeals.indexOf(mealId);
    if (idx === -1) {
        state.plannerMeals.push(mealId);
    } else {
        state.plannerMeals.splice(idx, 1);
    }
    saveState();
    renderPlanner();
}
function togglePlannerIngredient(mealId, ingId) {
    if (!state.plannerIngredientChecks[mealId]) {
        state.plannerIngredientChecks[mealId] = {};
    }

    const prev = state.plannerIngredientChecks[mealId][ingId];
    state.plannerIngredientChecks[mealId][ingId] = !prev;

    saveState();
    renderPlanner();
}
    
function renderPlannerExtras() {

    // 🔥 Always repopulate store dropdown
   const sel = document.getElementById("plannerExtraStore");
    if (sel) {
        const allStores = getAllStores();
        sel.innerHTML = allStores
            .map(s => `<option>${s.name}</option>`)
               .join("");
    }


    const list = document.getElementById("plannerExtrasList");
    if (!list) return;

    list.innerHTML = "";

    if (!state.plannerExtras.length) {
        list.innerHTML = `<p class="small-note">No other items yet.</p>`;
        return;
    }

    state.plannerExtras.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "planner-extra-item";
        row.innerHTML = `
            <span>${item.name} (${item.qty}) — <em>${item.store}</em></span>
            <button class="danger" onclick="removePlannerExtra(${idx})">Remove</button>
        `;
        list.appendChild(row);
    });
}
function renderStoresTab() {
    const globalDiv = document.getElementById("globalStoresList");
    const userDiv = document.getElementById("userStoresList");
    
    // Render global stores
    globalDiv.innerHTML = GLOBAL_STORES
        .map(s => `<div class="store-row">${s.name} (default)</div>`)
        .join("");

    // Render user stores
    userDiv.innerHTML = (state.userStores || [])
        .map((s, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${s.name}</span>
                <button class="danger" onclick="removeUserStore(${idx})">Remove</button>
            </div>
        `)
        .join("");
}
function addUserStore() {
    const input = document.getElementById("newStoreName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.userStores) state.userStores = [];

    // For now we only store name + id; delivery links
    // come from DELIVERY_SERVICES and use the store name.
    state.userStores.push({
        id: makeId(),
        name
    });

    saveState();
    input.value = "";
    renderStoresTab();
}


function removeUserStore(index) {
    if (!state.userStores) return;

    state.userStores.splice(index, 1);
    saveState();
    renderStoresTab();
}


function addPlannerExtra() {
    const nameEl = document.getElementById("plannerExtraInput");
    const qtyEl = document.getElementById("plannerExtraQty");
    const storeEl = document.getElementById("plannerExtraStore");

    const name = nameEl.value.trim();
    if (!name) return;

    const qty = Number(qtyEl.value) || 1;
    const store = storeEl.value || "";

    // Save as full object
    state.plannerExtras.push({
        id: makeId(),
        name,
        qty,
        unit: "CT",
        store
      });


    saveState();
    renderPlannerExtras(); // ONLY update the list; do NOT rerender the whole planner

    nameEl.value = "";
    qtyEl.value = 1;
}


function removePlannerExtra(index) {
    state.plannerExtras.splice(index, 1);
    saveState();
    renderPlannerExtras();
}

// ==============================
// GROCERY LIST TAB
// ==============================
function buildGroceryList() {
    saveState();

    // 🔥 FORCE grocery tab visible BEFORE rendering the list
    document.querySelectorAll(".tab-page").forEach(t => t.classList.remove("active"));
    document.getElementById("groceryTab").classList.add("active");

    // 🔥 Update tab buttons too
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === "groceryTab");
    });

    // 🔥 Now render the grocery list while the tab is visible
    renderGroceryList();
}
function renderGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) {
        console.warn("[GL] #groceryContainer NOT FOUND");
        return;
    }

    console.group("renderGroceryList");

    container.innerHTML = "";

    const selectedMeals = getAllMeals().filter(m => state.plannerMeals.includes(m.id));

    if (!selectedMeals.length && !state.plannerExtras.length) {
        container.innerHTML = `<p class="section-note">Select meals in the Planner and click "Build Grocery List".</p>`;
        console.groupEnd();
        return;
    }

    const itemsByStore = {};

    function addItem(store, ingObj) {
        const key = store || "Other";
        if (!itemsByStore[key]) itemsByStore[key] = [];

        itemsByStore[key].push({
            name: ingObj.name,
            qty: ingObj.qty || 1,
            unit: ingObj.unit || "CT",
            comment: ingObj.comment || ""
        });
    }

    // 1. ADD INGREDIENTS FROM SELECTED MEALS
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

            if (!state.plannerIngredientChecks[meal.id]) {
                state.plannerIngredientChecks[meal.id] = {};
            }
            if (state.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                state.plannerIngredientChecks[meal.id][ing.id] = true;
            }
            if (state.plannerIngredientChecks[meal.id][ing.id] === false) return;

            const comment =
                state.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

            const mult = state.plannerMealMultipliers[meal.id] || 1;

            addItem(ing.store, {
                name: ing.name,
                qty: ing.qty * mult,
                unit: ing.unit,
                comment
            });

        });
    });

    // 2. ADD PLANNER EXTRAS
    state.plannerExtras.forEach(item => {
        addItem(item.store, {
            name: item.name,
            qty: item.qty,
            unit: item.unit || "CT"
        });
    });

    // 3. MERGE DUPLICATES
    for (const store of Object.keys(itemsByStore)) {
        const merged = {};

        itemsByStore[store].forEach(item => {
            const name = item.name.trim();
            const unit = (item.unit || "CT").trim();
            const qty  = item.qty || 1;

            const key = name.toLowerCase() + "|" + unit.toLowerCase();

            if (!merged[key]) {
                merged[key] = { name, qty, unit };
            } else {
                merged[key].qty += qty;
            }
        });

        itemsByStore[store] = Object.values(merged);
    }

    // 4. RENDER GROCERY LIST TO SCREEN
    const storeKeys = Object.keys(itemsByStore).sort();

    storeKeys.forEach(store => {
        const card = document.createElement("div");
        card.className = "grocery-store-card";

        const headerRow = document.createElement("div");
        headerRow.className = "grocery-store-header";
        headerRow.style.display = "flex";
        headerRow.style.alignItems = "center";
        headerRow.style.justifyContent = "space-between";

        const title = document.createElement("h3");
        title.textContent = store;

        const storeInfo = findStoreByName(store);
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "grocery-store-actions";

        // SHOP button (only for global stores with a home link)
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

        // DELIVERY SERVICE BUTTONS (Instacart, DoorDash, etc.)
        DELIVERY_SERVICES.forEach(service => {
            const url = service.storeUrl.replace(
                "{STORE}",
                encodeURIComponent(store)
            );

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

        // ITEMS
        itemsByStore[store].forEach(item => {
            const qtyPart = item.qty > 1 ? ` (${item.qty} ${item.unit})` : "";
            const line = document.createElement("div");
            line.className = "grocery-item";
            // NO ITEM LINKS — plain text only
            line.textContent = `${item.name}${qtyPart}`;

            

            card.appendChild(line);
        });

        container.appendChild(card);
    });

    console.groupEnd();
}

// ==============================
// REVIEW PANEL (STEP 3)
// ==============================
function updateReview() {
    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document.getElementById("modalRecipeCategory").value.trim();

    document.getElementById("reviewName").textContent = name || "(none)";
    document.getElementById("reviewCategory").textContent = category || "(none)";

    const list = document.getElementById("reviewIngredients");
    list.innerHTML = "";

    ingredientRows.forEach(ing => {
        const li = document.createElement("li");
        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
        const groupPart = ing.group ? ` [${ing.group}]` : "";
        li.textContent = `${ing.name}${qtyPart}${groupPart} – ${ing.store}`;
        list.appendChild(li);
    });
}
// ==============================
// SAVE RECIPE (FROM STEP 3)
// ==============================
function saveRecipe() {
    syncIngredientsFromDOM();

    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document.getElementById("modalRecipeCategory").value.trim();

    const mealData = {
        id: editingMealId || makeId(),
        name,
        category,
        ingredients: ingredientRows
    };

    const isGlobal = GLOBAL_RECIPES.some(m => m.id === mealData.id);

    if (isGlobal) {
        alert("Starter recipes cannot be edited.");
        return;
    }

    // Update existing user recipe
    const idx = state.userMeals.findIndex(m => m.id === mealData.id);

    if (idx !== -1) {
        state.userMeals[idx] = mealData;
    } else {
        state.userMeals.push(mealData);
    }

    saveState();
    closeRecipeModal();
    renderRecipes();
}

