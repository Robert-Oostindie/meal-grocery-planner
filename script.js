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
    plannerMeals: [],
    plannerExtras: []
};

// for the recipe modal
let ingredientRows = [];
let editingMealId = null;
let currentStep = 1;

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
    // future phases: renderPlanner(), renderGroceryList(), etc.
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
                <input class="ingGroup" style="flex:1;" placeholder="Substitute group (optional)" value="${row.group || ""}">
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
    // default to first store if available
    const defaultStore = state.stores.length ? state.stores[0] : "";
    ingredientRows.push({
        id: crypto.randomUUID(),
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
    // sync latest group names from DOM, then enforce one default per group
    const container = document.getElementById("ingredientsContainer");
    const rows = container.querySelectorAll(".ingredient-row");
    rows.forEach((rowEl, i) => {
        const groupInput = rowEl.querySelector(".ingGroup");
        if (!ingredientRows[i]) return;
        ingredientRows[i].group = groupInput.value.trim();
    });

    const group = ingredientRows[idx].group;
    if (!group) {
        alert("Set a substitute group name first.");
        return;
    }

    // clear defaults for this group
    ingredientRows.forEach(r => {
        if (r.group === group) r.isDefault = false;
    });

    ingredientRows[idx].isDefault = true;
    renderIngredientsEditor();
}

// read latest values from DOM into ingredientRows before review/save
function syncIngredientsFromDOM() {
    const container = document.getElementById("ingredientsContainer");
    if (!container) return;

    const rows = container.querySelectorAll(".ingredient-row");
    ingredientRows = Array.from(rows).map(rowEl => {
        return {
            id: crypto.randomUUID(),
            name: rowEl.querySelector(".ingName").value.trim(),
            qty: Number(rowEl.querySelector(".ingQty").value) || 1,
            unit: (rowEl.querySelector(".ingUnit").value || "CT").trim(),
            store: rowEl.querySelector(".ingStore").value,
            group: rowEl.querySelector(".ingGroup").value.trim(),
            isDefault: rowEl.querySelector(".default-toggle").classList.contains("active")
        };
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
