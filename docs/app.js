// FORCE GITHUB PAGES REDEPLOY - 12/11/25

const CURRENT_SCHEMA_VERSION = 2;

function migrateState(loadedState) {
    const v = loadedState.schemaVersion || 1;

    if (v < 2) {
        // meals / stores / categories used to live at the root
        loadedState.data = {
            userMeals: loadedState.userMeals || [],
            userStores: loadedState.userStores || [],
            userCategories: loadedState.userCategories || []
        };
        delete loadedState.userMeals;
        delete loadedState.userStores;
        delete loadedState.userCategories;

        // old UI fields may or may not exist
        const oldUi = loadedState.ui || {};

        loadedState.ui = {
            plannerMeals: oldUi.plannerMeals || [],
            plannerExtras: oldUi.plannerExtras || [],
            collapsedCategories: oldUi.collapsedCategories || [],
            collapsedMeals: oldUi.collapsedMeals || {},
            plannerIngredientChecks: oldUi.plannerIngredientChecks || {},
            plannerIngredientComments: oldUi.plannerIngredientComments || {},
            plannerSubstituteSelections: oldUi.plannerSubstituteSelections || {},
            plannerMealMultipliers: oldUi.plannerMealMultipliers || {},
            collapsedRecipeCategories: oldUi.collapsedRecipeCategories || []
        };

        loadedState.schemaVersion = 2;
    }

    // if you bump to 3, 4, etc. add more blocks here

    return loadedState;
}


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
    "Appetizers"
];
const GLOBAL_RECIPES = [];


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
// ==============================
// INGREDIENT NORMALIZATION + INDEX LOOKUP
// ==============================

// Normalize ingredient name the same way the Python script does
function normalizeIngredientName(name) {
    if (!name) return "";
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s\-]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 1)
        .join(" ")
        .trim();
}

// Find best match in USDA ingredient index
function findIngredientInIndex(rawName) {
    if (!window.INGREDIENT_INDEX) return null;
    if (!rawName) return null;

    const normalized = normalizeIngredientName(rawName);

    // Direct exact match first
    for (const fdcId in window.INGREDIENT_INDEX) {
        const entry = window.INGREDIENT_INDEX[fdcId];
        if (entry.usda.normalized === normalized) {
            return entry;
        }
    }

    // Fallback fuzzy contains match
    for (const fdcId in window.INGREDIENT_INDEX) {
        const entry = window.INGREDIENT_INDEX[fdcId];
        if (entry.usda.normalized.includes(normalized)) {
            return entry;
        }
        if (normalized.includes(entry.usda.normalized)) {
            return entry;
        }
    }

    // Nothing matched
    return null;
}

function determineAisleForIngredient(rawName) {
    const normalized = normalizeIngredientName(rawName);

    let bestMatch = null;
    let bestScore = -1;

    for (const key in window.INGREDIENT_INDEX) {
        const entry = window.INGREDIENT_INDEX[key];
        const entryNorm = entry?.usda?.normalized;
        if (!entryNorm) continue;

        const matches =
            entryNorm.includes(normalized) ||
            normalized.includes(entryNorm);

        if (!matches) continue;

        let score = 0;

        // 1️⃣ Prefer non-Other aisles
        if (entry.aisle && entry.aisle !== "Other") {
            score += 10;
        }

        // 2️⃣ Prefer more specific matches (longer normalized text)
        score += Math.min(entryNorm.length, 50);

        // 3️⃣ Prefer form-based matches if debug exists
        if (entry._debug?.aisleReason && entry._debug.aisleReason !== "no strong signal") {
            score += 20;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    return bestMatch?.aisle || "Other";
}


    return fallbackMatch?.aisle || "Other";
}

// ==============================
// INGREDIENT AUTOCOMPLETE ENGINE
// ==============================

// Config: number of results to show
const AUTOCOMPLETE_LIMIT = 8;

// Autocomplete state tracking (one menu at a time)
let activeAutocompleteMenu = null;
let activeAutocompleteIndex = -1;

function searchIngredientIndex(query) {
    if (!window.INGREDIENT_INDEX || query.length < 2) return [];

    const norm = normalizeIngredientName(query);

    const results = [];

    for (const fdcId in window.INGREDIENT_INDEX) {
        const entry = window.INGREDIENT_INDEX[fdcId];
        const candidate = entry.usda.normalized;

        if (!candidate) continue;

        // Strong match: starts with
        if (candidate.startsWith(norm)) {
            results.push({ fdcId, entry, score: 1 });
        }
        // Medium match: contains
        else if (candidate.includes(norm)) {
            results.push({ fdcId, entry, score: 2 });
        }

        if (results.length >= AUTOCOMPLETE_LIMIT) break;
    }

    return results.sort((a, b) => a.score - b.score);
}

function closeAutocompleteMenu() {
    if (activeAutocompleteMenu) {
        activeAutocompleteMenu.remove();
        activeAutocompleteMenu = null;
        activeAutocompleteIndex = -1;
    }
}

function openAutocompleteMenu(inputEl, results, ingredientIndex) {
    closeAutocompleteMenu();

    if (!results.length) return;

    const rect = inputEl.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "group-suggest-menu"; 
    menu.style.position = "absolute";
    menu.style.top = rect.bottom + window.scrollY + "px";
    menu.style.left = rect.left + window.scrollX + "px";
    menu.style.width = rect.width + "px";
    menu.style.zIndex = 99999;
    menu.style.maxHeight = "200px";
    menu.style.overflowY = "auto";

    results.forEach((r, idx) => {
        const item = document.createElement("div");
        item.className = "group-suggest-item";
        item.textContent = r.entry.usda.description;
        item.dataset.index = idx;

        item.onclick = () => {
            ingredientRows[ingredientIndex].name = r.entry.usda.description;
            renderIngredientsEditor();
            closeAutocompleteMenu();
            markDirty();
        };

        menu.appendChild(item);
    });

    const modalContent = document.querySelector("#recipeModal .modal-content");
    modalContent.appendChild(menu);

    activeAutocompleteMenu = menu;
}

function handleAutocompleteKey(inputEl, e) {
    if (!activeAutocompleteMenu) return false;

    const items = Array.from(activeAutocompleteMenu.querySelectorAll(".group-suggest-item"));

    if (e.key === "ArrowDown") {
        activeAutocompleteIndex = (activeAutocompleteIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
        activeAutocompleteIndex = (activeAutocompleteIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter") {
        if (activeAutocompleteIndex >= 0) {
            items[activeAutocompleteIndex].click();
            return true;
        }
    } else {
        return false;
    }

    items.forEach((el, idx) => {
        el.style.background = idx === activeAutocompleteIndex ? "#e5e7eb" : "white";
    });

    return true;
}

document.addEventListener("click", (e) => {
    if (activeAutocompleteMenu && !activeAutocompleteMenu.contains(e.target)) {
        closeAutocompleteMenu();
    }
});
// Input handler for ingredient name fields
function handleIngredientNameInput(inputEl, ingredientIndex) {
    const q = inputEl.value.trim();

    if (!q) {
        closeAutocompleteMenu();
        ingredientRows[ingredientIndex].name = "";
        return;
    }

    ingredientRows[ingredientIndex].name = q;

    const results = searchIngredientIndex(q);
    openAutocompleteMenu(inputEl, results, ingredientIndex);
}

// Allow arrow keys & Enter to navigate autocomplete
function handleIngredientInputKey(inputEl, e) {
    if (handleAutocompleteKey(inputEl, e)) {
        e.preventDefault();
    }
}

// ==============================
// AUTO REBUILD GROCERY LIST (DEBOUNCED)
// ==============================
function scheduleGroceryRebuild() {
    clearTimeout(window._groceryDebounce);
    window._groceryDebounce = setTimeout(() => {
        const groceryTab = document.getElementById("groceryTab");
        if (groceryTab && groceryTab.classList.contains("active")) {
            renderGroceryList();
        }
    }, 250);
}

// ==============================
// MERGED MEAL LIST (GLOBAL + USER)
// ==============================
function getAllMeals() {
    const userIds = new Set((state.data.userMeals || []).map(m => m.id));

    // global recipes that are NOT overridden (currently none, but future-safe)
    const filteredGlobals = GLOBAL_RECIPES.filter(m => !userIds.has(m.id));

    return [
        ...filteredGlobals,
        ...(state.data.userMeals || [])
    ];
}

// Return global + user stores together
function getAllStores() {
    return [
        ...GLOBAL_STORES,
        ...(state.data.userStores || [])
    ];
}

// Find a store by its display name (for affiliate links & shop button)
function findStoreByName(name) {
    if (!name) return null;
    return getAllStores().find(s => s.name === name) || null;
}


let state = {
    schemaVersion: 2,
    user: {
        id: null,
        email: null,
        name: null,
        createdAt: null,
        lastLogin: null
    },

    data: {
        userMeals: [],
        userStores: [],
        userCategories: []
    },

    ui: {
        plannerMeals: [],
        plannerExtras: [],
        collapsedCategories: [],
        collapsedMeals: {},
        plannerIngredientChecks: {},
        plannerIngredientComments: {},
        plannerSubstituteSelections: {},
        plannerMealMultipliers: {},
        collapsedRecipeCategories: []
    },

    dirty: false
};


// ==============================
// ID HELPER (SAFER THAN crypto.randomUUID DIRECT USE)
// ==============================
function makeId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // fallback
    return 'id-' + ([1e7]+-1e3+-4e3+-8e3+-1e11)
        .replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
}
async function persistState() {
    try {
        const json = JSON.stringify(state);
        localStorage.setItem(LS_KEY, json);
    } catch (err) {
        console.error("Failed to persist state:", err);
    }
}
function markDirty() {
    state.dirty = true;
}
// ==============================
// LOAD INGREDIENT CATEGORY INDEX
// ==============================
async function loadIngredientIndex() {
    try {
        const res = await fetch("ingredient_category_index.json");
        const data = await res.json();
        window.INGREDIENT_INDEX = data;
        console.log("Ingredient index loaded:", Object.keys(data).length, "items");
    } catch (err) {
        console.error("Failed to load ingredient index:", err);
        window.INGREDIENT_INDEX = {};
    }
}

async function resolveConflict(localState, remoteState) {
    // TODO: custom merge logic
    // For now, newest wins:
    if (remoteState.updatedAt > localState.updatedAt) {
        return remoteState;
    }
    return localState;
}



async function toggleMealCollapse(mealId) {
    state.ui.collapsedMeals[mealId] = !state.ui.collapsedMeals[mealId];
    await persistState();
    renderPlanner();
}
function getAllCategories() {
    return [...GLOBAL_CATEGORIES, ...(state.data.userCategories || [])];
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

async function importAppData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // ✅ make the callback async
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            // BASIC VALIDATION
            if (typeof imported !== "object") {
                alert("Invalid backup file.");
                return;
            }

            // If meals existed in the old schema, map them into userMeals
            if (imported.meals && !imported.userMeals) {
                imported.userMeals = imported.meals;
            }

            // APPLY IMPORTED DATA
            state.data.userMeals = imported.userMeals || [];
            state.data.userStores = imported.userStores || [];
            state.data.userCategories = imported.userCategories || [];

            state.ui.plannerMeals = imported.plannerMeals || [];
            state.ui.plannerExtras = imported.plannerExtras || [];
            state.ui.collapsedCategories = imported.collapsedCategories || [];
            state.ui.collapsedMeals = imported.collapsedMeals || {};

            state.ui.plannerIngredientChecks = imported.plannerIngredientChecks || {};
            state.ui.plannerIngredientComments = imported.plannerIngredientComments || {};
            state.ui.plannerSubstituteSelections = imported.plannerSubstituteSelections || {};
            state.ui.plannerMealMultipliers = imported.plannerMealMultipliers || {};

            // SAVE + RENDER
            await persistState();
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



document.addEventListener("DOMContentLoaded", async () => {
    await loadIngredientIndex();   // <-- NEW
    loadState();
    renderApp();
});



function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;

        let loaded = JSON.parse(raw);
        loaded = migrateState(loaded);

        // Merge shallow properties
        state = {
            ...state,
            ...loaded,

            // Merge nested data structures correctly
            data: {
                ...state.data,
                ...(loaded.data || {})
            },

            ui: {
                ...state.ui,
                ...(loaded.ui || {})
            }
        };

    } catch (err) {
        console.error("Failed to load state:", err);
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
function renderCategoriesTab() {
    const globalDiv = document.getElementById("globalCategoryList");
    const userDiv = document.getElementById("userCategoryList");

    if (!globalDiv || !userDiv) return;

    // Render global categories (read-only)
    globalDiv.innerHTML = GLOBAL_CATEGORIES
        .map(cat => `<div class="store-row">${cat}</div>`)
        .join("");


    // Render user categories (editable)
    userDiv.innerHTML = (state.data.userCategories || [])
        .map((cat, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${cat}</span>
                <button class="danger" onclick="removeUserCategory(${idx})">Remove</button>
            </div>
        `)
        .join("");
}
async function addUserCategory() {
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userCategories) state.data.userCategories = [];

    // Prevent duplicates (global or user)
    if (GLOBAL_CATEGORIES.includes(name) || state.data.userCategories.includes(name)) {
        alert("Category already exists.");
        return;
    }

    state.data.userCategories.push(name);

    await persistState();
    input.value = "";
    renderCategoriesTab();
}
async function removeUserCategory(index) {
    if (!state.data.userCategories) return;

    state.data.userCategories.splice(index, 1);

    await persistState();
    renderCategoriesTab();
}

function switchTab(tabId) {
    tabPages.forEach(page => {
        page.classList.toggle("active", page.id === tabId);
    });

    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    if (tabId === "groceryTab") {
        renderGroceryList();
    }
    if (tabId === "storesTab") renderStoresTab();   // 👈 NEW
    if (tabId === "categoriesTab") renderCategoriesTab();

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

    const meals = getAllMeals();
    if (!meals.length) {
        container.innerHTML = `<p class="section-note">No recipes yet. Tap + Add Recipe to create one.</p>`;
        return;
    }

    // 1️⃣ GROUP meals by category
    const byCategory = {};
    meals.forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    // 2️⃣ SORT categories alphabetically
    const categories = Object.keys(byCategory).sort();

    categories.forEach(cat => {
        const isCollapsed = state.ui.collapsedRecipeCategories?.includes(cat);

        // CATEGORY HEADER
        const catDiv = document.createElement("div");
        catDiv.className = "planner-category"; // reuse existing styling

        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleRecipeCategory(cat);
        header.innerHTML = `
            <span>${isCollapsed ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;

        catDiv.appendChild(header);

        // If collapsed → do not render meals inside it
        if (!isCollapsed) {
            // 3️⃣ SORT meals A–Z inside category
            byCategory[cat]
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(meal => {
                    const ingredientCount = meal.ingredients?.length || 0;
                    const countText =
                        ingredientCount === 1
                            ? "1 ingredient"
                            : `${ingredientCount} ingredients`;

                    const card = document.createElement("div");
                    card.className = "card";
                    card.style.marginLeft = "1rem";

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <div style="font-weight:600; font-size:1rem;">${meal.name}</div>
                                <div style="font-size:0.9rem; color:#6b7280;">
                                    ${countText}
                                </div>
                            </div>
                            <div style="display:flex; gap:0.4rem;">
                                <button class="primary" onclick="openRecipeModalEdit('${meal.id}')">Edit</button>
                                <button class="danger" onclick="deleteRecipe('${meal.id}')">Delete</button>
                            </div>
                        </div>
                    `;
                    catDiv.appendChild(card);
                });
        }

        container.appendChild(catDiv);
    });
}

async function deleteRecipe(id) {
    const isUser = state.data.userMeals.some(m => m.id === id);

    if (!isUser) {
        alert("You can't delete starter recipes, but you CAN edit them.");
        return;
    }

    state.data.userMeals = state.data.userMeals.filter(m => m.id !== id);

    await persistState();
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

async function openRecipeModalEdit(mealId) {
    let meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    const isGlobal = GLOBAL_RECIPES.some(m => m.id === mealId);

    // If the user tries to edit a global recipe, clone it into userMeals
    if (isGlobal) {
        meal = JSON.parse(JSON.stringify(meal)); // deep clone
        state.data.userMeals.push(meal);
        await persistState();
    }

    editingMealId = meal.id;
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Edit Recipe";
    document.getElementById("modalRecipeName").value = meal.name || "";

    populateCategoryDropdown(meal.category || "");

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
            <input
                type="text"
                class="ingName"
                value="${row.name || ""}"
                oninput="handleIngredientNameInput(this, ${index})"
                onkeydown="handleIngredientInputKey(this, event)"
                autocomplete="off"
            >




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
        state.ui.plannerSubstituteSelections?.[meal.id] || {};

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
    const selectionsForMeal = state.ui.plannerSubstituteSelections[mealId] || {};

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


async function applySubstituteChoice() {
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
        scheduleGroceryRebuild();
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
    if (!state.ui.plannerSubstituteSelections[subModalMealId]) {
        state.ui.plannerSubstituteSelections[subModalMealId] = {};
    }

    // Save selection
    state.ui.plannerSubstituteSelections[subModalMealId][subModalGroupName] = ingId;

    await persistState();
    closeSubstituteModal();
    renderPlanner();
}

function findIngredientById(id) {
    for (const meal of state.data.userMeals) {
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

        const isCollapsedCategory = state.ui.collapsedCategories.includes(cat);

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

                const isSelected = state.ui.plannerMeals.includes(meal.id);

                // main row container
                const mainRow = document.createElement("label");
                mainRow.className = "planner-meal-row";

                const multiplier = state.ui.plannerMealMultipliers[meal.id] || 1;
                const isMealCollapsed = state.ui.collapsedMeals[meal.id] === true;

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

                            if (!state.ui.plannerIngredientChecks[meal.id]) {
                                state.ui.plannerIngredientChecks[meal.id] = {};
                            }
                            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
                            }

                            const checked = state.ui.plannerIngredientChecks[meal.id][ing.id];
                            const existingComment =
                                state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

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


async function updateMealMultiplier(mealId, value) {
    state.ui.plannerMealMultipliers[mealId] = Number(value);
    await persistState();
    renderPlanner(); // optional: re-render preview
    scheduleGroceryRebuild();
}

async function toggleCategory(cat) {
    const idx = state.ui.collapsedCategories.indexOf(cat);
    if (idx === -1) {
        state.ui.collapsedCategories.push(cat);
    } else {
        state.ui.collapsedCategories.splice(idx, 1);
    }
    await persistState();
    renderPlanner();
}
async function expandAllPlannerCategories() {
    state.ui.collapsedCategories = [];     // open all categories
    state.ui.collapsedMeals = {};          // open all meals too (optional)
    await persistState();
    renderPlanner();
}

async function collapseAllPlannerCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedCategories = [...categories];  // collapse all categories

    // Optional: also collapse all meals
    state.ui.collapsedMeals = {};
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });

    await persistState();
    renderPlanner();
}
async function selectAllPlannerMeals() {
    // Add every meal ID to plannerMeals
    state.ui.plannerMeals = getAllMeals().map(m => m.id);

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();
}

async function unselectAllPlannerMeals() {
    // Empty selected meals list
    state.ui.plannerMeals = [];

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();

}
async function showAllIngredients() {
    // Expand ALL categories
    state.ui.collapsedCategories = [];

    // Expand ALL meals
    Object.keys(state.ui.collapsedMeals).forEach(id => {
        state.ui.collapsedMeals[id] = false;
    });

    // Make sure all meals have entries
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = false;
    });

    await persistState();
    renderPlanner();
}
async function collapseAllIngredients() {
    // Collapse ALL meals (ingredients hidden)
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });

    await persistState();
    renderPlanner();
}

async function toggleRecipeCategory(cat) {
    const list = state.ui.collapsedRecipeCategories || [];
    const idx = list.indexOf(cat);

    if (idx === -1) list.push(cat);
    else list.splice(idx, 1);

    state.ui.collapsedRecipeCategories = list;
    await persistState();
    renderRecipes();
}
async function expandAllRecipeCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedRecipeCategories = []; // expand everything
    await persistState();
    renderRecipes();
}

async function collapseAllRecipeCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedRecipeCategories = [...categories]; // collapse all
    await persistState();
    renderRecipes();
}

async function updateIngredientComment(mealId, ingId, text) {
    if (!state.ui.plannerIngredientComments[mealId]) {
        state.ui.plannerIngredientComments[mealId] = {};
    }
    state.ui.plannerIngredientComments[mealId][ingId] = text;
    await persistState();
}


async function togglePlannerMeal(mealId) {
    const idx = state.ui.plannerMeals.indexOf(mealId);
    if (idx === -1) {
        state.ui.plannerMeals.push(mealId);
    } else {
        state.ui.plannerMeals.splice(idx, 1);
    }

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();   // 🔥 auto-refresh grocery
}

async function togglePlannerIngredient(mealId, ingId) {
    if (!state.ui.plannerIngredientChecks[mealId]) {
        state.ui.plannerIngredientChecks[mealId] = {};
    }

    const prev = state.ui.plannerIngredientChecks[mealId][ingId];
    state.ui.plannerIngredientChecks[mealId][ingId] = !prev;

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();   // 🔥 keep grocery list in sync
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

    if (!state.ui.plannerExtras.length) {
        list.innerHTML = `<p class="small-note">No other items yet.</p>`;
        return;
    }

    state.ui.plannerExtras.forEach((item, idx) => {
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
        .map(store => `<div class="store-row">${store.name}</div>`)
        .join("");


    // Render user stores
    userDiv.innerHTML = (state.data.userStores || [])
        .map((s, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${s.name}</span>
                <button class="danger" onclick="removeUserStore(${idx})">Remove</button>
            </div>
        `)
        .join("");
}
async function addUserStore() {
    const input = document.getElementById("newStoreName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userStores) state.data.userStores = [];

    // For now we only store name + id; delivery links
    // come from DELIVERY_SERVICES and use the store name.
    state.data.userStores.push({
        id: makeId(),
        name
    });

    await persistState();
    input.value = "";
    renderStoresTab();
}


async function removeUserStore(index) {
    if (!state.data.userStores) return;

    state.data.userStores.splice(index, 1);
    await persistState();
    renderStoresTab();
}


async function addPlannerExtra() {
    const nameEl = document.getElementById("plannerExtraInput");
    const qtyEl = document.getElementById("plannerExtraQty");
    const storeEl = document.getElementById("plannerExtraStore");

    const name = nameEl.value.trim();
    if (!name) return;

    const qty = Number(qtyEl.value) || 1;
    const store = storeEl.value || "";

    // Save as full object
    state.ui.plannerExtras.push({
        id: makeId(),
        name,
        qty,
        unit: "CT",
        store
      });


    await persistState();
    renderPlannerExtras(); // ONLY update the list; do NOT rerender the whole planner
    scheduleGroceryRebuild();


    nameEl.value = "";
    qtyEl.value = 1;
}


async function removePlannerExtra(index) {
    state.ui.plannerExtras.splice(index, 1);
    await persistState();
    renderPlannerExtras();
    scheduleGroceryRebuild();
}

// ==============================
// GROCERY LIST TAB
// ==============================
async function buildGroceryList() {
    const meals = getAllMeals();
    const selectedMeals = state.ui.plannerMeals || [];
    const extras = state.ui.plannerExtras || [];

    // Final structure: aisle → [ items ]
    const grouped = {};

    /* ------------------------------
       1. Gather all ingredients
    ------------------------------ */
    selectedMeals.forEach(mealId => {
        const meal = meals.find(m => m.id === mealId);
        if (!meal || !meal.ingredients) return;

        meal.ingredients.forEach(ing => {
            const storeName = ing.store || "Other";
            const rawName = ing.name || "";

            const aisle = determineAisleForIngredient(rawName);

            if (!grouped[aisle]) grouped[aisle] = [];
            grouped[aisle].push({
                name: rawName,
                qty: ing.qty || 1,
                unit: ing.unit || "",
                store: storeName
            });
        });
    });

    /* ------------------------------
       2. Add planner extras
    ------------------------------ */
    extras.forEach(item => {
        const aisle = determineAisleForIngredient(item.name);

        if (!grouped[aisle]) grouped[aisle] = [];
        grouped[aisle].push({
            name: item.name,
            qty: item.qty,
            unit: "",
            store: item.store
        });
    });

    /* ------------------------------
       3. Render Grocery List
    ------------------------------ */
    const container = document.getElementById("groceryContainer");
    container.innerHTML = "";

    const aisles = Object.keys(grouped).sort();

    aisles.forEach(aisle => {
        const card = document.createElement("div");
        card.className = "grocery-store-card";

        card.innerHTML = `<h3>${aisle}</h3>`;

        grouped[aisle].forEach(item => {
            const div = document.createElement("div");
            div.className = "grocery-item";
            div.textContent = `${item.qty} ${item.unit} ${item.name}`;
            card.appendChild(div);
        });

        container.appendChild(card);
    });

    switchTab("groceryTab");
}

function renderGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) {
        console.warn("[GL] #groceryContainer NOT FOUND");
        return;
    }

    console.group("renderGroceryList");

    container.innerHTML = "";

    const selectedMeals = getAllMeals().filter(m => state.ui.plannerMeals.includes(m.id));

    if (!selectedMeals.length && !state.ui.plannerExtras.length) {
        container.innerHTML = `<p class="section-note">Select meals in the Planner and click "Build Grocery List".</p>`;
        console.groupEnd();
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

            if (!state.ui.plannerIngredientChecks[meal.id]) {
                state.ui.plannerIngredientChecks[meal.id] = {};
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === false) return;

            const comment =
                state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

            const mult = state.ui.plannerMealMultipliers[meal.id] || 1;

            addItem(ing.store, {
                name: ing.name,
                qty: ing.qty * mult,
                unit: ing.unit,
                comment
            });

        });
    });

    // 2. ADD PLANNER EXTRAS
    state.ui.plannerExtras.forEach(item => {
        addItem(item.store, {
            name: item.name,
            qty: item.qty,
            unit: item.unit || "CT"
        });
    });

        // 3. MERGE DUPLICATES (per store + aisle)
        for (const storeName of Object.keys(itemsByStore)) {
            const aislesObj = itemsByStore[storeName]; // { aisleName: [items...] }

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

        // 4. RENDER GROCERY LIST TO SCREEN (stores → aisles → items)
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
                    encodeURIComponent(storeName)
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

            // ITEMS, grouped by aisle
            const aislesObj = itemsByStore[storeName];
            const aisleNames = Object.keys(aislesObj).sort();

            // Render items sorted by aisle, but without aisle group headers
            Object.keys(aislesObj).sort().forEach(aisle => {
                aislesObj[aisle].forEach(item => {
                    const qtyPart = item.qty > 1 ? ` (${item.qty} ${item.unit})` : "";

                    const row = document.createElement("div");
                    row.className = "grocery-item";

                    // LEFT SIDE — item text
                    const left = document.createElement("span");
                    left.className = "grocery-item-name";
                    left.textContent = `${item.name}${qtyPart}`;

                    // RIGHT SIDE — aisle text (grey)
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
async function saveRecipe() {
    syncIngredientsFromDOM();

    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document.getElementById("modalRecipeCategory").value.trim();

    const mealData = {
        id: editingMealId || makeId(),
        name,
        category,
        ingredients: ingredientRows
    };

    // Update if exists
    const idx = state.data.userMeals.findIndex(m => m.id === editingMealId);

    if (idx !== -1) {
        state.data.userMeals[idx] = mealData;
    } else {
        // new user meal
        state.data.userMeals.push(mealData);
    }

    await persistState();
    closeRecipeModal();
    renderRecipes();
    renderPlanner();
}


