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
    plannerExtras: [],      // array of free-text "other items"
    collapsedCategories: [] // which category accordions are collapsed
};


// for the recipe modal
let ingredientRows = [];
let editingMealId = null;
let currentStep = 1;
// ==============================
// SUBSTITUTE GROUP SUGGESTIONS
// ==============================
function getExistingGroups() {
    const groups = new Set();
    ingredientRows.forEach(r => {
        if (r.group && r.group.trim() !== "") {
            groups.add(r.group.trim());
        }
    });
    return Array.from(groups);
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

    // position right under the input
    const rect = inputEl.getBoundingClientRect();
    menu.style.position = "absolute";
    menu.style.left = rect.left + "px";
    menu.style.top = rect.bottom + window.scrollY + "px";
    menu.style.width = rect.width + "px";
    menu.style.zIndex = 9999;

    document.body.appendChild(menu);
}

document.addEventListener("click", () => {
    const menu = document.querySelector(".group-suggest-menu");
    if (menu) menu.remove();
});

loadState();
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

// initial render
renderApp();
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
                   onfocus="showGroupSuggestions(this, ${index})">

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

                    (meal.ingredients || []).forEach(ing => {
                        // Respect substitute groups: only include default in a group
                        if (ing.group && !ing.isDefault) return;

                        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
                        const line = document.createElement("div");
                        line.className = "planner-ingredient";
                        line.innerHTML = `• ${ing.name}${qtyPart} <span class="muted">– ${ing.store}</span>`;
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

function togglePlannerMeal(mealId) {Meal(mealId) {
    const idx = state.plannerMeals.indexOf(mealId);
    if (idx === -1) {
        state.plannerMeals.push(mealId);
    } else {
        state.plannerMeals.splice(idx, 1);
    }
    saveState();
    renderPlanner();
}
function renderPlannerExtras() {
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
            <span>${item}</span>
            <button class="danger" onclick="removePlannerExtra(${idx})">Remove</button>
        `;
        list.appendChild(row);
    });
}

function addPlannerExtra() {
    const input = document.getElementById("plannerExtraInput");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    state.plannerExtras.push(text);
    input.value = "";
    saveState();
    renderPlannerExtras();
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
        (meal.ingredients || []).forEach(ing => {
            // Again: respect substitute groups (only default)
            if (ing.group && !ing.isDefault) return;

            const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
            addItem(ing.store, `${ing.name}${qtyPart}`);
        });
    });

    // Add planner extras under "Other"
    state.plannerExtras.forEach(item => addItem("Other", item));

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
