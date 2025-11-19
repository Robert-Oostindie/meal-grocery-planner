// ----------------------
// STORAGE SETUP
// ----------------------
const LS_KEY = "mealPlanner_v1";
let ingredientRows = [];
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
    renderIngredientsEditor();
    renderCategoryList();
    renderStoreList();
    renderPlanner();
    renderGroceryList();
}

// ----------------------
// RECIPE UI
// ----------------------
function renderRecipes() {
    const c = document.getElementById("recipesContainer");
    c.innerHTML = "";

    if (state.meals.length === 0) {
        c.innerHTML = "<p>No recipes yet.</p>";
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
                <button class="danger" onclick="deleteRecipe('${meal.id}')">Delete</button>
            </div>
        `;

        c.appendChild(div);
    });
}

function deleteRecipe(id) {
    if (!confirm("Delete this recipe?")) return;
    state.meals = state.meals.filter(m => m.id !== id);
    saveState();
    renderRecipes();
}

// ----------------------
// CATEGORY DROPDOWN & ENFORCEMENT
// ----------------------
function renderRecipeCategoryDropdown() {
    const sel = document.getElementById("recipeCategory");
    sel.innerHTML = "";

    state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
    });

    // No “blank” option → category is required
}

// ----------------------
// INGREDIENT EDITOR
// ----------------------
let ingredientRows = [];

function renderIngredientsEditor() {
    const container = document.getElementById("recipeIngredientsContainer");
    container.innerHTML = "";

    ingredientRows.forEach((row, index) => {
        const div = document.createElement("div");
        div.className = "ingredient-row card";

        div.innerHTML = `
            <input class="ingName" placeholder="Ingredient" value="${row.name || ""}">
            <input class="ingQty" type="number" min="1" placeholder="Qty" value="${row.qty || 1}">
            <input class="ingUnit" placeholder="Unit" value="${row.unit || "CT"}">

            <label>Store:</label>
            <select class="ingStore">
                ${state.stores.map(s => `<option ${row.store === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>

            <label>Substitute Group:</label>
            <input class="ingGroup" placeholder="Group name" value="${row.group || ""}">

            <div class="default-toggle ${row.isDefault ? "active" : ""}" onclick="toggleDefault(${index})">
                ${row.isDefault ? "⭐ Default" : "☆ Make Default"}
            </div>

            <button class="danger" onclick="removeIngredientRow(${index})">Remove</button>
        `;

        container.appendChild(div);
    });
}

function addIngredientRow() {
    ingredientRows.push({
        name: "",
        qty: 1,
        unit: "CT",
        store: state.stores[0],
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

    // Only one default per group
    ingredientRows.forEach(row => {
        if (row.group.trim() === group) row.isDefault = false;
    });

    ingredientRows[i].isDefault = true;
    renderIngredientsEditor();
}

// ----------------------
// SAVE RECIPE
// ----------------------
function saveRecipe() {
    const name = document.getElementById("recipeName").value.trim();
    const category = document.getElementById("recipeCategory").value.trim();

    if (!name) {
        alert("Meal name required.");
        return;
    }
    if (!category) {
        alert("Category required.");
        return;
    }

    // Collect ingredient data
    const rows = [...document.querySelectorAll("#recipeIngredientsContainer .ingredient-row")];
    const ingredients = rows.map(row => {
        return {
            id: crypto.randomUUID(),
            name: row.querySelector(".ingName").value,
            qty: Number(row.querySelector(".ingQty").value) || 1,
            unit: row.querySelector(".ingUnit").value,
            store: row.querySelector(".ingStore").value,
            group: row.querySelector(".ingGroup").value,
            isDefault: row.querySelector(".default-toggle").classList.contains("active")
        };
    });

    state.meals.push({
        id: crypto.randomUUID(),
        name,
        category,
        ingredients
    });

    ingredientRows = [];
    saveState();
    renderAll();
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
            ${!isDefaultCategory(cat) ? `<button class="danger" onclick="deleteCategory('${cat}')">Delete</button>` : ""}
        `;

        list.appendChild(div);
    });
}

function isDefaultCategory(cat) {
    return [
        "Low Prep", "Medium Prep", "High Prep / Longer Cook Times", "Grilling",
        "Breakfast", "Crock Pot", "Sides", "Appetizers", "Baby Meals"
    ].includes(cat);
}

function addCategory() {
    const value = document.getElementById("newCategory").value.trim();
    if (!value) return;

    if (state.categories.includes(value)) {
        alert("Already exists.");
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

    // Unassign meals
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
        c.innerHTML = "<p>No meals yet.</p>";
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

// Collapse all simply hides expanded-items feature if added; keeping stub
function collapseAllPlanner() {
    alert("Collapsed (future expansion area).");
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
        meal.ingredients.forEach(ing => {
            let qtyText = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
            let final = `${ing.name}${qtyText}`;
            addItem(ing.store, final);
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
        ingredientRows = [];
        document.getElementById("recipeName").value = "";
        renderIngredientsEditor();
        window.scrollTo(0,0);
        alert("Scroll up to add a recipe.");
    }
    if (active === "plannerTab") {
        document.getElementById("customPlannerItem").focus();
    }
    if (active === "otherTab") {
        document.getElementById("newCategory").focus();
    }
    if (active === "storesTab") {
        document.getElementById("newStore").focus();
    }
}
