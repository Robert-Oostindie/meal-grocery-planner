// ==============================
// STORAGE & APP STATE
// ==============================
const LS_KEY = "mealPlanner_rebuild_v1";

let state = {
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
    stores: ["Aldi", "Walmart", "Festival Foods", "Woodmans"],
    plannerMeals: [],       // array of meal IDs that are checked in Planner
    plannerExtras: [],   // each item: { id, name, qty, unit, store }
    collapsedCategories: [], // which category accordions are collapsed
   plannerIngredientChecks: {},
   plannerIngredientComments: {},
   plannerSubstituteSelections: {}  // { [mealId]: { [groupName]: ingredientId } } 
};


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
    state.meals.forEach(meal => {
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
        item.onclick = () => {
            inputEl.value = g;
            ingredientRows[index].group = g;
            menu.remove();
        };
        menu.appendChild(item);
    });

   // Position inside the modal so the menu stays aligned
const rect = inputEl.getBoundingClientRect();
const modalRect = document.getElementById("recipeModal").getBoundingClientRect();

menu.style.position = "absolute";
menu.style.left = (rect.left - modalRect.left) + "px";
menu.style.top = (rect.bottom - modalRect.top) + "px";
menu.style.width = rect.width + "px";
menu.style.zIndex = 9999;


    document.getElementById("recipeModal").appendChild(menu);

}

document.addEventListener("mousedown", (e) => {
    const menu = document.querySelector(".group-suggest-menu");
    if (!menu) return;

    // If clicking inside suggestions → do NOT close
    if (menu.contains(e.target)) return;

    // If clicking inside input → do NOT close
    if (e.target.classList.contains("ingGroup")) return;

    // Otherwise close
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
}


function renderApp() {
    renderRecipes();
    renderPlanner();
    renderGroceryList();
}


// ==============================
// RECIPES LIST
// ==============================
function renderRecipes() {
    const container = document.getElementById("recipesList");
    if (!container) return;

    container.innerHTML = "";

    if (!state.meals.length) {
        const empty = document.createElement("p");
        empty.className = "section-note";
        empty.textContent = "No recipes yet. Tap + Add Recipe to create one.";
        container.appendChild(empty);
        return;
    }

    state.meals.forEach(meal => {
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
    if (!confirm("Delete this recipe?")) return;
    state.meals = state.meals.filter(m => m.id !== id);
    saveState();
    renderRecipes();
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
    const meal = state.meals.find(m => m.id === mealId);
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
    state.categories.forEach(cat => {
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

        const storeOptions = state.stores
            .map(s => `<option ${row.store === s ? "selected" : ""}>${s}</option>`)
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
                   onblur="setTimeout(() => handleGroupFinished(${index}, this.value), 250)">



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

    const defaultStore = state.stores[0] || "";

    ingredientRows.push({
        id: crypto.randomUUID(),   // <-- Correct fixed ID assignment
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

    ingredientRows = Array.from(rows).map((rowEl, i) => {
        return {
            id: ingredientRows[i] && ingredientRows[i].id ? ingredientRows[i].id : crypto.randomUUID(),
            name: rowEl.querySelector(".ingName").value.trim(),
            qty: Number(rowEl.querySelector(".ingQty").value) || 1,
            unit: (rowEl.querySelector(".ingUnit").value || "CT").trim(),
            store: rowEl.querySelector(".ingStore").value,
            group: rowEl.querySelector(".ingGroup").value.trim(),
            isDefault: rowEl.querySelector(".default-toggle").classList.contains("active")
        }
    });
}
// Return the list of "active" ingredients for a meal:
//  - all non-grouped ingredients
//  - exactly 1 ingredient per substitute group, default or user-selected
function getActiveIngredientsForMeal(meal) {
    const ingredients = meal.ingredients || [];
    const groupsMap = {};
    const ungrouped = [];

    // first, split grouped vs ungrouped
    ingredients.forEach(ing => {
        if (ing.group) {
            if (!groupsMap[ing.group]) groupsMap[ing.group] = [];
            groupsMap[ing.group].push(ing);
        } else {
            ungrouped.push(ing);
        }
    });

    // start results with ungrouped items
    const result = [...ungrouped];

    // check if user has made substitution selections for this meal
    const selectionsForMeal = state.plannerSubstituteSelections[meal.id] || {};

    // for each group pick the selected one if present, otherwise the default, otherwise the first
    Object.keys(groupsMap).forEach(groupName => {
        const groupIngs = groupsMap[groupName];

        const defaultIng =
            groupIngs.find(i => i.isDefault) || groupIngs[0];

        const selectedId = selectionsForMeal[groupName] || defaultIng.id;

        const activeIng =
            groupIngs.find(i => i.id === selectedId) || defaultIng;

        result.push(activeIng);
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

    const meal = state.meals.find(m => m.id === mealId);
    if (!meal) return;

    // ---------------------------------------------------------
    // 1. Collect ALL ingredients across all meals for this group
    // ---------------------------------------------------------
    const options = [];
    state.meals.forEach(m => {
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
    state.meals.forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                matches.push(ing);
            }
        });
    });

    // If only 1 match → nothing to reuse
    if (matches.length <= 1) return;

    // Load modal body
    const body = document.getElementById("subModalBody");
    if (!body) return;
    body.innerHTML = "";

    // Show all existing global ingredients
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

    // Add "new ingredient" option
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
    state.meals.forEach(m => {
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
    for (const meal of state.meals) {
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

    if (!state.meals.length) {
        container.innerHTML = `<p class="section-note">No meals yet. Add recipes first.</p>`;
        renderPlannerExtras();
        return;
    }

    // Group meals by category
    const byCategory = {};
    state.meals.forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    // Sort categories alphabetically for consistency
    Object.keys(byCategory).sort().forEach(cat => {
        const catWrapper = document.createElement("div");
        catWrapper.className = "planner-category";

        const isCollapsed = state.collapsedCategories.includes(cat);

        // Category header (accordion)
        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleCategory(cat);
        header.innerHTML = `
            <span class="chevron">${isCollapsed ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;
        catWrapper.appendChild(header);

        // Meals list (only if not collapsed)
        if (!isCollapsed) {
            byCategory[cat].forEach(meal => {
                const mealRow = document.createElement("div");
                mealRow.className = "planner-meal-block";

                const isSelected = state.plannerMeals.includes(meal.id);

                // Main row with checkbox
                const mainRow = document.createElement("label");
                mainRow.className = "planner-meal-row";
                mainRow.innerHTML = `
                    <input type="checkbox" ${isSelected ? "checked" : ""} onclick="togglePlannerMeal('${meal.id}')">
                    <span>${meal.name}</span>
                `;
                mealRow.appendChild(mainRow);

                // If selected, show ingredients
                if (isSelected) {
                    const ingDiv = document.createElement("div");
                    ingDiv.className = "planner-ingredients";

                   const activeIngredients = getActiveIngredientsForMeal(meal);

                activeIngredients.forEach(ing => {
                    const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

                    // init checks store
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

                    // base content
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

                    // if this ingredient belongs to a substitute group, add Swap button
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

                catWrapper.appendChild(mealRow);
            });
        }

        container.appendChild(catWrapper);
    });

    // Render extras under planner
    renderPlannerExtras();
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
    if (sel && state.stores.length) {
        sel.innerHTML = state.stores
            .map(store => `<option>${store}</option>`)
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
        name,
        qty,
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
    // Just re-render from current planner selections
    saveState();
    renderGroceryList();
    // Auto-switch to Grocery tab
    switchTab("groceryTab");
}

function renderGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) return;

    container.innerHTML = "";

    const selectedMeals = state.meals.filter(m => state.plannerMeals.includes(m.id));

    if (!selectedMeals.length && !state.plannerExtras.length) {
        container.innerHTML = `<p class="section-note">Select meals in the Planner and click "Build Grocery List".</p>`;
        return;
    }

    const itemsByStore = {};

    function addItem(store, text) {
        const key = store || "Other";
        if (!itemsByStore[key]) itemsByStore[key] = [];
        itemsByStore[key].push(text);
    }

   // Pull from selected meals
selectedMeals.forEach(meal => {
    const activeIngredients = getActiveIngredientsForMeal(meal);

    activeIngredients.forEach(ing => {
        // ingredient selection respected
        const checked = state.plannerIngredientChecks[meal.id]?.[ing.id];
        if (!checked) return;

        const comment =
            state.plannerIngredientComments?.[meal.id]?.[ing.id]?.trim() || "";

        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
        const commentPart = comment ? ` (${comment})` : "";

        addItem(ing.store, `${ing.name}${qtyPart}${commentPart}`);
    });
});


   // Add planner extras with full text
state.plannerExtras.forEach(item => {
    const qtyPart = item.qty > 1 ? ` (${item.qty})` : "";
    addItem(item.store, `${item.name}${qtyPart}`);
});


    // Render grouped by store
    Object.keys(itemsByStore).sort().forEach(store => {
        const block = document.createElement("div");
        block.className = "grocery-store-card";
        block.innerHTML = `<h3>${store}</h3>`;

        itemsByStore[store].forEach(text => {
            const line = document.createElement("div");
            line.className = "grocery-item";
            line.textContent = `• ${text}`;
            block.appendChild(line);
        });

        container.appendChild(block);
    });
}

// ==============================
// REVIEW (STEP 3)
// ==============================
function updateReview() {
    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document.getElementById("modalRecipeCategory").value.trim();

    document.getElementById("reviewName").textContent = name || "(no name)";
    document.getElementById("reviewCategory").textContent = category || "(no category)";

    const list = document.getElementById("reviewIngredients");
    list.innerHTML = "";

    if (!ingredientRows.length) {
        const li = document.createElement("li");
        li.textContent = "No ingredients added.";
        list.appendChild(li);
        return;
    }

    ingredientRows.forEach(row => {
        const li = document.createElement("li");
        const qtyPart = row.qty > 1 ? ` (${row.qty} ${row.unit})` : "";
        li.textContent = `${row.name} – ${row.store}${qtyPart}`;
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

    if (!name) {
        alert("Meal name is required.");
        currentStep = 1;
        updateStepUI();
        return;
    }

    if (!category) {
        alert("Category is required.");
        currentStep = 1;
        updateStepUI();
        return;
    }

    const mealData = {
        id: editingMealId || crypto.randomUUID(),
        name,
        category,
        ingredients: ingredientRows
    };

    if (editingMealId) {
        // update existing
        const idx = state.meals.findIndex(m => m.id === editingMealId);
        if (idx !== -1) {
            state.meals[idx] = mealData;
        } else {
            state.meals.push(mealData);
        }
    } else {
        // new recipe
        state.meals.push(mealData);
    }

    saveState();
    closeRecipeModal();
    renderRecipes();
}
