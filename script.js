// ----------------------
// STORAGE SETUP
// ----------------------
const LS_KEY = "mealPlanner_v1";

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

// ingredient rows used by the modal
let ingredientRows = [];

// modal state
let editingMealId = null;
let currentStep = 1;

loadState();
function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
        const saved = JSON.parse(raw);
        state = { ...state, ...saved };
    } catch (e) {
        console.error("Corrupt state, resetting.");
    }
}
function saveState() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ----------------------
// TABS
// ----------------------
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        showTab(tabId);
    });
});

function showTab(tabId) {
    tabPages.forEach(p => p.classList.remove("active"));
    tabButtons.forEach(b => b.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    document.querySelector(`[data-tab='${tabId}']`).classList.add("active");

    renderAll();
}

renderAll();
function renderAll() {
    renderRecipes();
    renderRecipeCategoryDropdown();
    renderIngredientsEditor(); // renders inside hidden modal; safe
    renderCategoryList();
    renderStoreList();
    renderPlanner();
    renderGroceryList();
}

// ----------------------
// RECIPE UI (list + cards)
// ----------------------
function renderRecipes() {
    const c = document.getElementById("recipesContainer");
    c.innerHTML = "";

    if (state.meals.length === 0) {
        c.innerHTML = "<p>No recipes yet. Tap + Add Recipe to create one.</p>";
        return;
    }

    state.meals.forEach(meal => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <div class="recipe-header">
                <div>
                    <div class="recipe-title">${meal.name}</div>
                    <div class="recipe-meta">${meal.category}</div>
                </div>
                <div>
                    <button class="primary" style="margin-right:0.4rem;" onclick="openRecipeModalEdit('${meal.id}')">Edit</button>
                    <button class="danger" onclick="deleteRecipe('${meal.id}')">Delete</button>
                </div>
            </div>
        `;

        c.appendChild(div);
    });
}

function deleteRecipe(id) {
    if (!confirm("Delete this recipe?")) return;
    state.meals = state.meals.filter(m => m.id !== id);
    saveState();
    renderAll();
}

// ----------------------
// CATEGORY DROPDOWN
// ----------------------
function renderRecipeCategoryDropdown() {
    const sel = document.getElementById("modalRecipeCategory");
    if (!sel) return;

    sel.innerHTML = "";
    state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
    });
}

// ----------------------
// INGREDIENT EDITOR (Modal Step 2)
// ----------------------
function renderIngredientsEditor() {
    const container = document.getElementById("recipeIngredientsContainer");
    if (!container) return;

    container.innerHTML = "";

    ingredientRows.forEach((row, index) => {
        const div = document.createElement("div");
        div.className = "ingredient-row";

        div.innerHTML = `
            <input class="ingName" placeholder="Ingredient" value="${row.name || ""}">
            <div style="display:flex; gap:0.5rem; margin-top:0.3rem;">
                <input class="ingQty" type="number" min="1" placeholder="Qty" value="${row.qty || 1}">
                <input class="ingUnit" placeholder="Unit" value="${row.unit || "CT"}">
                <select class="ingStore">
                    ${state.stores
                        .map(
                            s =>
                                `<option ${
                                    row.store === s ? "selected" : ""
                                }>${s}</option>`
                        )
                        .join("")}
                </select>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:0.3rem;">
                <input class="ingGroup" style="flex:1; margin-right:0.5rem;" placeholder="Substitute group (optional)" value="${row.group || ""}">
                <div class="default-toggle ${row.isDefault ? "active" : ""}" onclick="toggleDefault(${index})">
                    ${row.isDefault ? "⭐ Default" : "☆ Make Default"}
                </div>
                <button class="danger" style="margin-left:0.5rem;" onclick="removeIngredientRow(${index})">🗑</button>
            </div>
        `;

        container.appendChild(div);
    });
}

function addIngredientRow() {
    ingredientRows.push({
        name: "",
        qty: 1,
        unit: "CT",
        store: state.stores[0] || "",
        group: "",
        isDefault: false
    });
    renderIngredientsEditor();
}

function removeIngredientRow(i) {
    ingredientRows.splice(i, 1);
    renderIngredientsEditor();
}

function toggleDefault(i) {
    const group = ingredientRows[i].group.trim();
    if (!group) {
        alert("Set a substitute group name first.");
        return;
    }

    ingredientRows.forEach(row => {
        if (row.group.trim() === group) row.isDefault = false;
    });

    ingredientRows[i].isDefault = true;
    renderIngredientsEditor();
}

// ----------------------
// MODAL OPEN / CLOSE
// ----------------------
function openRecipeModalNew() {
    editingMealId = null;
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Add Recipe";
    document.getElementById("modalRecipeName").value = "";
    document.getElementById("modalRecipeCategory").selectedIndex = 0;

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
    document.getElementById("modalRecipeName").value = meal.name;
    document.getElementById("modalRecipeCategory").value = meal.category;

    ingredientRows = meal.ingredients
        ? meal.ingredients.map(i => ({ ...i }))
        : [];
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

// ----------------------
// MODAL STEPS
// ----------------------
function goToStep(step) {
    // basic validation when moving forward
    if (step === 2) {
        const name = document.getElementById("modalRecipeName").value.trim();
        const category = document
            .getElementById("modalRecipeCategory")
            .value.trim();
        if (!name) {
            alert("Meal name is required.");
            return;
        }
        if (!category) {
            alert("Category is required.");
            return;
        }
    }
    if (step === 3) {
        if (ingredientRows.length === 0) {
            if (
                !confirm(
                    "You haven't added any ingredients. Continue anyway?"
                )
            ) {
                return;
            }
        }
        updateReview();
    }

    currentStep = step;
    updateStepUI();
}

function updateStepUI() {
    const step1 = document.getElementById("modalStep1");
    const step2 = document.getElementById("modalStep2");
    const step3 = document.getElementById("modalStep3");

    step1.classList.add("hidden");
    step2.classList.add("hidden");
    step3.classList.add("hidden");

    if (currentStep === 1) step1.classList.remove("hidden");
    if (currentStep === 2) step2.classList.remove("hidden");
    if (currentStep === 3) step3.classList.remove("hidden");

    // dots
    document.getElementById("stepDot1").classList.remove("active");
    document.getElementById("stepDot2").classList.remove("active");
    document.getElementById("stepDot3").classList.remove("active");

    document
        .getElementById(`stepDot${currentStep}`)
        .classList.add("active");
}

function updateReview() {
    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document
        .getElementById("modalRecipeCategory")
        .value.trim();

    document.getElementById("reviewMealName").textContent = name || "(none)";
    document.getElementById("reviewMealCategory").textContent =
        category || "(none)";

    const list = document.getElementById("reviewIngredientsList");
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

// ----------------------
// SAVE RECIPE (Modal Step 3)
// ----------------------
function saveRecipeFromModal() {
    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document
        .getElementById("modalRecipeCategory")
        .value.trim();

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

    // Build final ingredient objects from the latest fields
    const container = document.getElementById("recipeIngredientsContainer");
    const rows = [...container.querySelectorAll(".ingredient-row")];

    const ingredients = rows.map(row => ({
        id: crypto.randomUUID(),
        name: row.querySelector(".ingName").value.trim(),
        qty: Number(row.querySelector(".ingQty").value) || 1,
        unit: row.querySelector(".ingUnit").value.trim() || "CT",
        store: row.querySelector(".ingStore").value,
        group: row.querySelector(".ingGroup").value.trim(),
        isDefault: row
            .querySelector(".default-toggle")
            .classList.contains("active")
    }));

    if (editingMealId) {
        // update existing
        const meal = state.meals.find(m => m.id === editingMealId);
        if (meal) {
            meal.name = name;
            meal.category = category;
            meal.ingredients = ingredients;
        }
    } else {
        // create new
        state.meals.push({
            id: crypto.randomUUID(),
            name,
            category,
            ingredients
        });
    }

    saveState();
    closeRecipeModal();
    renderAll(); // refresh Recipes tab
    showTab("recipesTab"); // jump back to Recipes
}

// ----------------------
// CATEGORIES TAB
// ----------------------
function renderCategoryList() {
    const list = document.getElementById("categoryList");
    list.innerHTML = "";

    state.categories.forEach(cat => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            ${cat}
            ${!isDefaultCategory(cat)
                ? `<button class="danger" onclick="deleteCategory('${cat}')">Delete</button>`
                : ""}
        `;

        list.appendChild(div);
    });
}

function isDefaultCategory(cat) {
    return [
        "Low Prep",
        "Medium Prep",
        "High Prep / Longer Cook Times",
        "Grilling",
        "Breakfast",
        "Crock Pot",
        "Sides",
        "Appetizers",
        "Baby Meals"
    ].includes(cat);
}

function addCategory() {
    const value = document.getElementById("newCategory").value.trim();
    if (!value) return;

    if (state.categories.includes(value)) {
        alert("Category already exists.");
        return;
    }

    state.categories.push(value);
    saveState();
    renderAll();
}

function deleteCategory(cat) {
    if (isDefaultCategory(cat)) return;
    if (!confirm("Delete category?")) return;

    state.categories = state.categories.filter(c => c !== cat);

    state.meals.forEach(m => {
        if (m.category === cat) m.category = "";
    });

    saveState();
    renderAll();
}

// ----------------------
// STORES TAB
// ----------------------
function renderStoreList() {
    const list = document.getElementById("storeList");
    list.innerHTML = "";

    state.stores.forEach(store => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            ${store}
            <button class="danger" onclick="removeStore('${store}')">Delete</button>
        `;

        list.appendChild(div);
    });
}

function addStore() {
    const store = document.getElementById("newStore").value.trim();
    if (!store) return;

    if (state.stores.includes(store)) {
        alert("Store already exists.");
        return;
    }

    state.stores.push(store);
    saveState();
    renderAll();
}

function removeStore(store) {
    if (!confirm("Delete store?")) return;
    state.stores = state.stores.filter(s => s !== store);
    saveState();
    renderAll();
}

// ----------------------
// PLANNER TAB
// ----------------------
function renderPlanner() {
    const c = document.getElementById("plannerMeals");
    c.innerHTML = "";

    if (state.meals.length === 0) {
        c.innerHTML = "<p>No meals yet. Add some on the Recipes tab.</p>";
        return;
    }

    state.meals.forEach(meal => {
        const div = document.createElement("div");
        div.className = "card";

        div.innerHTML = `
            <input type="checkbox" ${state.plannerMeals.includes(meal.id) ? "checked" : ""}
                onclick="togglePlannerMeal('${meal.id}')">
            <strong>${meal.name}</strong>
        `;

        c.appendChild(div);
    });
}

function togglePlannerMeal(id) {
    if (state.plannerMeals.includes(id)) {
        state.plannerMeals = state.plannerMeals.filter(m => m !== id);
    } else {
        state.plannerMeals.push(id);
    }
    saveState();
}

function collapseAllPlanner() {
    alert("Collapse all is a placeholder for now.");
}

// ----------------------
// EXTRA ITEMS
// ----------------------
function addCustomPlannerItem() {
    const val = document.getElementById("customPlannerItem").value.trim();
    if (!val) return;

    state.plannerExtras.push(val);
    saveState();
    renderGroceryList();
}

// ----------------------
// GROCERY LIST
// ----------------------
function renderGroceryList() {
    const c = document.getElementById("groceryContainer");
    c.innerHTML = "";

    const chosenMeals = state.meals.filter(m => state.plannerMeals.includes(m.id));

    let itemsByStore = {};

    function addItem(store, text) {
        if (!itemsByStore[store]) itemsByStore[store] = [];
        itemsByStore[store].push(text);
    }

    chosenMeals.forEach(meal => {
        (meal.ingredients || []).forEach(ing => {
            const qtyText = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
            const final = `${ing.name}${qtyText}`;
            addItem(ing.store || "Other", final);
        });
    });

    state.plannerExtras.forEach(item => addItem("Other", item));

    Object.keys(itemsByStore).forEach(store => {
        const div = document.createElement("div");
        div.className = "grocery-store-card";
        div.innerHTML = `<h3>${store}</h3>`;

        itemsByStore[store].forEach(item => {
            div.innerHTML += `<div class="grocery-item">• ${item}</div>`;
        });

        c.appendChild(div);
    });
}

// ----------------------
// FAB ACTION
// ----------------------
function fabAction() {
    const active = document.querySelector(".tab-page.active").id;

    if (active === "recipesTab") {
        openRecipeModalNew();
    } else if (active === "plannerTab") {
        document.getElementById("customPlannerItem").focus();
    } else if (active === "otherTab") {
        document.getElementById("newCategory").focus();
    } else if (active === "storesTab") {
        document.getElementById("newStore").focus();
    }
}
