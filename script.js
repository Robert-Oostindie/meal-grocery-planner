// ===============================
// Meal Planner App - script.js
// ===============================

const STORAGE_KEY = "mealPlannerApp_v1";

const DEFAULT_CATEGORIES = [
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

const DEFAULT_STORES = ["Aldi", "Walmart", "Festival Foods", "Woodmans"];

// ---------- STATE ----------
let state = {
  version: 1,
  categoriesDefault: [...DEFAULT_CATEGORIES],
  categoriesCustom: [],
  stores: [...DEFAULT_STORES],
  meals: [],
  otherItems: [],
  planner: {
    selectedMealIds: [],
    mealGroupStates: {}, // mealId -> groupKey -> {selectedIngredientId, included, comment}
    selectedOtherItemIds: []
  }
};

// ---------- UTIL ----------
const byName = (a, b) => a.name.localeCompare(b.name);
const byString = (a, b) => a.localeCompare(b);
const makeId = () =>
  "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = {
      ...state,
      ...parsed,
      categoriesDefault: [...DEFAULT_CATEGORIES], // don't allow changing defaults
      categoriesCustom: parsed.categoriesCustom || []
    };
  } catch (e) {
    console.error("Failed to load state", e);
  }
}

// Combined categories
function getAllCategories() {
  const set = new Set([...state.categoriesDefault, ...state.categoriesCustom]);
  return Array.from(set).sort(byString);
}

// ---------- DOM REFS ----------
let navButtons;
let tabs;
let fabBtn;

// Recipe modal
let recipeModal,
  recipeNameInput,
  recipeCategoryInput,
  ingredientList,
  addIngredientBtn,
  saveRecipeBtn,
  closeRecipeModalBtn;

// Other item modal
let otherItemModal,
  otherItemNameInput,
  otherItemStoreInput,
  saveOtherItemBtn,
  closeOtherItemModalBtn;

// Store modal
let storeModal, storeNameInput, saveStoreBtn, closeStoreModalBtn;

// Planner custom item modal
let plannerCustomModal,
  plannerCustomNameInput,
  plannerCustomStoreSelect,
  savePlannerCustomBtn,
  closePlannerCustomModalBtn;

// Containers
let recipesContainer,
  plannerMealsContainer,
  plannerCustomContainer,
  otherItemsContainer,
  storesContainer,
  groceryListContainer;

// Buttons
let collapseAllBtn, copyListBtn;

// Keep track of which tab is active
let currentTabId = "recipesTab";

// Recipe being edited (null=new)
let editingMealId = null;

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadState();

  navButtons = document.querySelectorAll(".nav-btn");
  tabs = {
    recipesTab: document.getElementById("recipesTab"),
    plannerTab: document.getElementById("plannerTab"),
    otherTab: document.getElementById("otherTab"),
    storesTab: document.getElementById("storesTab"),
    groceryTab: document.getElementById("groceryTab")
  };

  fabBtn = document.getElementById("fabBtn");

  recipesContainer = document.getElementById("recipesContainer");
  plannerMealsContainer = document.getElementById("plannerMealsContainer");
  plannerCustomContainer = document.getElementById("plannerCustomContainer");
  otherItemsContainer = document.getElementById("otherItemsContainer");
  storesContainer = document.getElementById("storesContainer");
  groceryListContainer = document.getElementById("groceryListContainer");

  collapseAllBtn = document.getElementById("collapseAllBtn");
  copyListBtn = document.getElementById("copyListBtn");

  // Recipe modal elements
  recipeModal = document.getElementById("recipeModal");
  recipeNameInput = document.getElementById("recipeNameInput");
  recipeCategoryInput = document.getElementById("recipeCategoryInput");
  ingredientList = document.getElementById("ingredientList");
  addIngredientBtn = document.getElementById("addIngredientBtn");
  saveRecipeBtn = document.getElementById("saveRecipeBtn");
  closeRecipeModalBtn = document.getElementById("closeRecipeModal");

  // Other item modal
  otherItemModal = document.getElementById("otherItemModal");
  otherItemNameInput = document.getElementById("otherItemNameInput");
  otherItemStoreInput = document.getElementById("otherItemStoreInput");
  saveOtherItemBtn = document.getElementById("saveOtherItemBtn");
  closeOtherItemModalBtn = document.getElementById("closeOtherItemModal");

  // Store modal
  storeModal = document.getElementById("storeModal");
  storeNameInput = document.getElementById("storeNameInput");
  saveStoreBtn = document.getElementById("saveStoreBtn");
  closeStoreModalBtn = document.getElementById("closeStoreModal");

  // Planner custom item modal
  plannerCustomModal = document.getElementById("plannerCustomModal");
  plannerCustomNameInput = document.getElementById("plannerCustomName");
  plannerCustomStoreSelect = document.getElementById("plannerCustomStore");
  savePlannerCustomBtn = document.getElementById("savePlannerCustomBtn");
  closePlannerCustomModalBtn = document.getElementById(
    "closePlannerCustomModal"
  );

  // Wire nav buttons
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  // FAB behavior
  fabBtn.addEventListener("click", handleFabClick);

  // Collapse all in planner (hide ingredient blocks, keep selections)
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener("click", () => {
      const blocks = plannerMealsContainer.querySelectorAll(
        ".planner-ingredients"
      );
      blocks.forEach((b) => (b.style.display = "none"));
    });
  }

  // Copy grocery list
  if (copyListBtn) {
    copyListBtn.addEventListener("click", () => {
      const text = buildGroceryText();
      if (!text.trim()) {
        alert("Your grocery list is empty.");
        return;
      }
      navigator.clipboard
        .writeText(text)
        .then(() => alert("Grocery list copied. Paste into Notes on your phone."))
        .catch(() =>
          alert("Copy failed. You can still select and copy manually.")
        );
    });
  }

  // Recipe modal events
  addIngredientBtn.addEventListener("click", () =>
    addIngredientRowToModal()
  );
  saveRecipeBtn.addEventListener("click", saveRecipeFromModal);
  closeRecipeModalBtn.addEventListener("click", () =>
    hideModal(recipeModal)
  );

  // Other item modal events
  saveOtherItemBtn.addEventListener("click", saveOtherItemFromModal);
  closeOtherItemModalBtn.addEventListener("click", () =>
    hideModal(otherItemModal)
  );

  // Store modal events
  saveStoreBtn.addEventListener("click", saveStoreFromModal);
  closeStoreModalBtn.addEventListener("click", () =>
    hideModal(storeModal)
  );

  // Planner custom item modal events
  savePlannerCustomBtn.addEventListener("click", savePlannerCustomFromModal);
  closePlannerCustomModalBtn.addEventListener("click", () =>
    hideModal(plannerCustomModal)
  );

  // Initial render
  syncCategoryDropdown();
  syncStoreSelects();
  renderRecipes();
  renderPlanner();
  renderOtherItems();
  renderStores();
  renderGroceryList();
  updateFabVisibility();
});

// ---------- NAV / TABS ----------
function switchTab(tabId) {
  currentTabId = tabId;

  Object.entries(tabs).forEach(([id, el]) => {
    el.classList.toggle("active", id === tabId);
  });

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  if (tabId === "groceryTab") {
    renderGroceryList();
  } else if (tabId === "plannerTab") {
    renderPlanner();
  } else if (tabId === "otherTab") {
    renderOtherItems();
  } else if (tabId === "storesTab") {
    renderStores();
  } else if (tabId === "recipesTab") {
    renderRecipes();
  }

  updateFabVisibility();
}

function updateFabVisibility() {
  if (!fabBtn) return;
  // Only show FAB for tabs where "add" makes sense
  if (
    currentTabId === "recipesTab" ||
    currentTabId === "plannerTab" ||
    currentTabId === "otherTab" ||
    currentTabId === "storesTab"
  ) {
    fabBtn.classList.remove("hidden");
  } else {
    fabBtn.classList.add("hidden");
  }
}

function handleFabClick() {
  if (currentTabId === "recipesTab") {
    openRecipeModal();
  } else if (currentTabId === "plannerTab") {
    openPlannerCustomModal();
  } else if (currentTabId === "otherTab") {
    openOtherItemModal();
  } else if (currentTabId === "storesTab") {
    openStoreModal();
  }
}

// ---------- MODAL HELPERS ----------
function showModal(el) {
  el.classList.remove("hidden");
}

function hideModal(el) {
  el.classList.add("hidden");
}

// ---------- CATEGORY MANAGEMENT ----------
function syncCategoryDropdown() {
  // Rebuild the category select in recipe modal
  if (!recipeCategoryInput) return;

  const categories = getAllCategories();
  recipeCategoryInput.innerHTML = "";

  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    recipeCategoryInput.appendChild(opt);
  });

  // "Add new category…" option
  const optNew = document.createElement("option");
  optNew.value = "__new__";
  optNew.textContent = "➕ Add new category…";
  recipeCategoryInput.appendChild(optNew);

  recipeCategoryInput.onchange = () => {
    if (recipeCategoryInput.value === "__new__") {
      const name = prompt("New category name:");
      if (name && name.trim()) {
        const trimmed = name.trim();
        if (
          !state.categoriesDefault.includes(trimmed) &&
          !state.categoriesCustom.includes(trimmed)
        ) {
          state.categoriesCustom.push(trimmed);
          saveState();
        }
        syncCategoryDropdown();
        recipeCategoryInput.value = trimmed;
      } else {
        syncCategoryDropdown();
      }
    }
  };
}

// ---------- STORE MANAGEMENT ----------
function syncStoreSelects() {
  const storeSelects = [
    otherItemStoreInput,
    plannerCustomStoreSelect
    // ingredient rows are built dynamically, we handle there
  ];

  storeSelects.forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    state.stores.slice().sort(byString).forEach((store) => {
      const opt = document.createElement("option");
      opt.value = store;
      opt.textContent = store;
      sel.appendChild(opt);
    });
  });
}

function openStoreModal() {
  if (!storeModal) return;
  storeNameInput.value = "";
  showModal(storeModal);
}

function saveStoreFromModal() {
  const name = storeNameInput.value.trim();
  if (!name) return;
  if (state.stores.includes(name)) {
    alert("Store already exists.");
    return;
  }
  state.stores.push(name);
  saveState();
  syncStoreSelects();
  renderStores();
  hideModal(storeModal);
}

function renderStores() {
  if (!storesContainer) return;
  storesContainer.innerHTML = "";

  const storesSorted = state.stores.slice().sort(byString);

  if (!storesSorted.length) {
    storesContainer.textContent = "No stores yet.";
    return;
  }

  storesSorted.forEach((store) => {
    const div = document.createElement("div");
    div.className = "store-card";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = store;

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary small";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => {
      attemptDeleteStore(store);
    });

    div.appendChild(nameSpan);
    div.appendChild(btn);

    storesContainer.appendChild(div);
  });
}

function attemptDeleteStore(storeName) {
  // Q6: A) prevent deleting if used anywhere
  const usedInMeals = state.meals.some((meal) =>
    meal.ingredients.some((ing) => ing.store === storeName)
  );
  const usedInOther = state.otherItems.some(
    (item) => item.store === storeName
  );

  if (usedInMeals || usedInOther) {
    alert(
      `Cannot delete store "${storeName}" because it is used in recipes or other items. ` +
        `Change those first, then try again.`
    );
    return;
  }

  if (!confirm(`Delete store "${storeName}"?`)) return;

  state.stores = state.stores.filter((s) => s !== storeName);
  saveState();
  syncStoreSelects();
  renderStores();
}

// ---------- RECIPES ----------
function renderRecipes() {
  if (!recipesContainer) return;
  recipesContainer.innerHTML = "";

  if (!state.meals.length) {
    const empty = document.createElement("div");
    empty.textContent = "No recipes yet. Tap + to add one.";
    recipesContainer.appendChild(empty);
    return;
  }

  const sortedMeals = state.meals.slice().sort(byName);

  sortedMeals.forEach((meal) => {
    const card = document.createElement("div");
    card.className = "recipe-card";

    const title = document.createElement("div");
    title.className = "recipe-title";
    title.textContent = meal.name;

    const cat = document.createElement("div");
    cat.className = "recipe-category";
    cat.textContent = meal.category || "Uncategorized";

    const meta = document.createElement("div");
    meta.className = "recipe-meta";
    meta.textContent = `${meal.ingredients.length} ingredient${
      meal.ingredients.length === 1 ? "" : "s"
    }`;

    const actions = document.createElement("div");
    actions.className = "recipe-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary small";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => openRecipeModal(meal.id));

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-secondary small";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteMeal(meal.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(cat);
    card.appendChild(meta);
    card.appendChild(actions);

    recipesContainer.appendChild(card);
  });
}

function deleteMeal(mealId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  if (!confirm(`Delete recipe "${meal.name}"?`)) return;

  state.meals = state.meals.filter((m) => m.id !== mealId);
  delete state.planner.mealGroupStates[mealId];
  state.planner.selectedMealIds = state.planner.selectedMealIds.filter(
    (id) => id !== mealId
  );
  saveState();
  renderRecipes();
  renderPlanner();
}

function openRecipeModal(mealId = null) {
  editingMealId = mealId;
  ingredientList.innerHTML = "";

  if (mealId) {
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return;
    recipeNameInput.value = meal.name || "";
    syncCategoryDropdown();
    recipeCategoryInput.value = meal.category || "";

    meal.ingredients.forEach((ing) => {
      addIngredientRowToModal(ing);
    });
  } else {
    recipeNameInput.value = "";
    syncCategoryDropdown();
    recipeCategoryInput.value = DEFAULT_CATEGORIES[0];
    addIngredientRowToModal(); // start with one row
  }

  showModal(recipeModal);
}

function addIngredientRowToModal(ing = null) {
  const row = document.createElement("div");
  row.className = "ingredient-edit-row";

  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="Ingredient name" />
    <input type="number" class="ing-qty" placeholder="1" min="1" />
    <input type="text" class="ing-unit" placeholder="CT" />
    <select class="ing-store"></select>
    <input type="text" class="ing-group" placeholder="Group (optional)" />
    <button type="button" class="btn btn-secondary small ing-remove">X</button>
  `;

  ingredientList.appendChild(row);

  // Populate store select
  const storeSelect = row.querySelector(".ing-store");
  state.stores.slice().sort(byString).forEach((store) => {
    const opt = document.createElement("option");
    opt.value = store;
    opt.textContent = store;
    storeSelect.appendChild(opt);
  });

  if (ing) {
    row.querySelector(".ing-name").value = ing.name || "";
    row.querySelector(".ing-qty").value = ing.qty || "";
    row.querySelector(".ing-unit").value = ing.unit || "";
    storeSelect.value = ing.store || state.stores[0] || "";
    row.querySelector(".ing-group").value = ing.group || "";
  } else {
    row.querySelector(".ing-qty").value = "1";
    row.querySelector(".ing-unit").value = "CT";
  }

  row.querySelector(".ing-remove").addEventListener("click", () => {
    row.remove();
  });
}

function saveRecipeFromModal() {
  const name = recipeNameInput.value.trim();
  let category = recipeCategoryInput.value;
  if (!name) {
    alert("Please enter a meal name.");
    return;
  }

  if (category && category !== "__new__") {
    // auto-add custom if needed
    if (
      !state.categoriesDefault.includes(category) &&
      !state.categoriesCustom.includes(category)
    ) {
      state.categoriesCustom.push(category);
    }
  }

  // Gather ingredients
  const rows = ingredientList.querySelectorAll(".ingredient-edit-row");
  const ingredients = [];

  rows.forEach((row) => {
    const n = row.querySelector(".ing-name").value.trim();
    if (!n) return;
    const qtyVal = row.querySelector(".ing-qty").value.trim();
    const unitVal = row.querySelector(".ing-unit").value.trim();
    const storeVal = row.querySelector(".ing-store").value;
    const groupVal = row.querySelector(".ing-group").value.trim();

    const qty = qtyVal ? Number(qtyVal) : 1;
    const unit = unitVal || "CT";

    ingredients.push({
      id: makeId(),
      name: n,
      qty: isNaN(qty) || qty <= 0 ? 1 : qty,
      unit,
      store: storeVal || "",
      group: groupVal
    });
  });

  if (!ingredients.length) {
    if (!confirm("No ingredients added. Save recipe anyway?")) {
      return;
    }
  }

  if (editingMealId) {
    const meal = state.meals.find((m) => m.id === editingMealId);
    if (!meal) return;
    meal.name = name;
    meal.category = category === "__new__" ? "" : category;
    meal.ingredients = ingredients;
  } else {
    state.meals.push({
      id: makeId(),
      name,
      category: category === "__new__" ? "" : category,
      ingredients
    });
  }

  saveState();
  hideModal(recipeModal);
  renderRecipes();
  renderPlanner();
}

// ---------- OTHER ITEMS ----------
function openOtherItemModal() {
  if (!otherItemModal) return;
  otherItemNameInput.value = "";
  syncStoreSelects();
  showModal(otherItemModal);
}

function saveOtherItemFromModal() {
  const name = otherItemNameInput.value.trim();
  const store = otherItemStoreInput.value || "";
  if (!name) {
    alert("Please enter an item name.");
    return;
  }

  const id = makeId();
  state.otherItems.push({ id, name, store });
  saveState();
  hideModal(otherItemModal);
  renderOtherItems();
  renderPlannerCustomItems();
}

function renderOtherItems() {
  if (!otherItemsContainer) return;
  otherItemsContainer.innerHTML = "";

  if (!state.otherItems.length) {
    otherItemsContainer.textContent = "No other items yet.";
    return;
  }

  const sorted = state.otherItems.slice().sort(byName);

  sorted.forEach((item) => {
    const card = document.createElement("div");
    card.className = "other-item-card";

    const label = document.createElement("span");
    label.textContent = item.store
      ? `${item.name} — ${item.store}`
      : item.name;

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary small";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => {
      if (!confirm(`Delete "${item.name}"?`)) return;
      state.otherItems = state.otherItems.filter((o) => o.id !== item.id);
      state.planner.selectedOtherItemIds =
        state.planner.selectedOtherItemIds.filter((id) => id !== item.id);
      saveState();
      renderOtherItems();
      renderPlannerCustomItems();
    });

    card.appendChild(label);
    card.appendChild(btn);

    otherItemsContainer.appendChild(card);
  });
}

// ---------- PLANNER CUSTOM ITEMS ----------
function openPlannerCustomModal() {
  if (!plannerCustomModal) return;
  plannerCustomNameInput.value = "";
  syncStoreSelects();
  showModal(plannerCustomModal);
}

function savePlannerCustomFromModal() {
  const name = plannerCustomNameInput.value.trim();
  const store = plannerCustomStoreSelect.value || "";
  if (!name) {
    alert("Please enter an item name.");
    return;
  }

  const id = makeId();
  state.otherItems.push({ id, name, store });

  // Q5: B -> also appear in planner & selected
  state.planner.selectedOtherItemIds.push(id);

  saveState();
  hideModal(plannerCustomModal);
  renderOtherItems();
  renderPlannerCustomItems();
}

// ---------- PLANNER ----------
function renderPlanner() {
  if (!plannerMealsContainer) return;
  plannerMealsContainer.innerHTML = "";

  if (!state.meals.length) {
    plannerMealsContainer.textContent =
      "Add recipes first in the Recipes tab.";
    return;
  }

  // group meals by category
  const allCats = getAllCategories();
  const mealsByCat = {};
  allCats.forEach((c) => (mealsByCat[c] = []));
  mealsByCat["Uncategorized"] = [];

  state.meals.forEach((meal) => {
    const cat = meal.category || "Uncategorized";
    if (!mealsByCat[cat]) mealsByCat[cat] = [];
    mealsByCat[cat].push(meal);
  });

  Object.keys(mealsByCat)
    .sort(byString)
    .forEach((cat) => {
      const meals = mealsByCat[cat];
      if (!meals || !meals.length) return;

      const header = document.createElement("div");
      header.className = "category-header";
      header.textContent = cat;
      plannerMealsContainer.appendChild(header);

      const line = document.createElement("div");
      line.className = "category-line";
      plannerMealsContainer.appendChild(line);

      meals
        .slice()
        .sort(byName)
        .forEach((meal) => {
          const mealDiv = document.createElement("div");
          mealDiv.className = "planner-meal";

          const row = document.createElement("div");
          row.className = "planner-meal-row";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = state.planner.selectedMealIds.includes(meal.id);
          cb.addEventListener("change", () =>
            handlePlannerMealToggle(meal.id, cb.checked)
          );

          const nameSpan = document.createElement("span");
          nameSpan.className = "planner-meal-name";
          nameSpan.textContent = meal.name;

          row.appendChild(cb);
          row.appendChild(nameSpan);
          mealDiv.appendChild(row);

          const ingBlock = document.createElement("div");
          ingBlock.className = "planner-ingredients";
          ingBlock.id = `planner-ings-${meal.id}`;
          mealDiv.appendChild(ingBlock);

          plannerMealsContainer.appendChild(mealDiv);

          if (cb.checked) {
            renderPlannerMealIngredients(meal, ingBlock);
          }
        });
    });

  // render planner custom area
  renderPlannerCustomItems();
}

function handlePlannerMealToggle(mealId, checked) {
  if (checked) {
    if (!state.planner.selectedMealIds.includes(mealId)) {
      state.planner.selectedMealIds.push(mealId);
    }
    saveState();
    const meal = state.meals.find((m) => m.id === mealId);
    const ingBlock = document.getElementById(`planner-ings-${mealId}`);
    if (meal && ingBlock) {
      renderPlannerMealIngredients(meal, ingBlock);
    }
  } else {
    // Remove from selected
    state.planner.selectedMealIds = state.planner.selectedMealIds.filter(
      (id) => id !== mealId
    );
    // Q4: A => erase comments & reset included
    const groupStates = state.planner.mealGroupStates[mealId];
    if (groupStates) {
      Object.values(groupStates).forEach((gs) => {
        gs.comment = "";
        gs.included = true;
      });
    }
    saveState();
    const ingBlock = document.getElementById(`planner-ings-${mealId}`);
    if (ingBlock) ingBlock.innerHTML = "";
  }
}

function renderPlannerMealIngredients(meal, container) {
  container.innerHTML = "";

  if (!state.planner.mealGroupStates[meal.id]) {
    state.planner.mealGroupStates[meal.id] = {};
  }
  const mealStates = state.planner.mealGroupStates[meal.id];

  // group ingredients: group name or solo per ingredient
  const groups = {};
  meal.ingredients.forEach((ing) => {
    const key = ing.group ? "grp:" + ing.group : "solo:" + ing.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ing);
  });

  Object.entries(groups).forEach(([groupKey, ingArray]) => {
    const first = ingArray[0];

    if (!mealStates[groupKey]) {
      mealStates[groupKey] = {
        selectedIngredientId: first.id,
        included: true,
        comment: ""
      };
    }

    const stateForGroup = mealStates[groupKey];

    let selectedIng =
      ingArray.find((i) => i.id === stateForGroup.selectedIngredientId) ||
      first;
    stateForGroup.selectedIngredientId = selectedIng.id;

    const row = document.createElement("div");
    row.className = "planner-ingredient-row";

    const top = document.createElement("div");
    top.className = "planner-ingredient-top";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = stateForGroup.included;
    cb.addEventListener("change", () => {
      stateForGroup.included = cb.checked;
      saveState();
    });

    const label = document.createElement("span");
    label.className = "planner-ingredient-label";

    let qtyText = "";
    if (typeof selectedIng.qty === "number" && selectedIng.qty > 1) {
      qtyText = ` (${selectedIng.qty} ${selectedIng.unit || "CT"})`;
    }

    const storeText = selectedIng.store ? ` — ${selectedIng.store}` : "";

    label.textContent = `${selectedIng.name}${qtyText}${storeText}`;

    top.appendChild(cb);
    top.appendChild(label);

    // If there are substitutes, show a dropdown
    if (ingArray.length > 1) {
      const sel = document.createElement("select");
      ingArray.forEach((ing) => {
        const opt = document.createElement("option");
        opt.value = ing.id;
        let qText = "";
        if (typeof ing.qty === "number" && ing.qty > 1) {
          qText = ` (${ing.qty} ${ing.unit || "CT"})`;
        }
        opt.textContent = `${ing.name}${qText}`;
        if (ing.id === stateForGroup.selectedIngredientId) {
          opt.selected = true;
        }
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => {
        stateForGroup.selectedIngredientId = sel.value;
        saveState();
        // re-render this group's label
        renderPlanner();
      });
      top.appendChild(sel);
    }

    const commentInput = document.createElement("input");
    commentInput.className = "planner-comment";
    commentInput.type = "text";
    commentInput.placeholder = "Note (optional)";
    commentInput.value = stateForGroup.comment || "";
    commentInput.addEventListener("input", () => {
      stateForGroup.comment = commentInput.value.trim();
      saveState();
    });

    row.appendChild(top);
    row.appendChild(commentInput);
    container.appendChild(row);
  });

  saveState();
}

function renderPlannerCustomItems() {
  if (!plannerCustomContainer) return;
  plannerCustomContainer.innerHTML = "";

  if (!state.otherItems.length) {
    plannerCustomContainer.textContent = "No extra items yet.";
    return;
  }

  const sorted = state.otherItems.slice().sort(byName);

  sorted.forEach((item) => {
    const row = document.createElement("div");
    row.className = "planner-ingredient-row";

    const top = document.createElement("div");
    top.className = "planner-ingredient-top";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.planner.selectedOtherItemIds.includes(item.id);
    cb.addEventListener("change", () => {
      if (cb.checked) {
        if (!state.planner.selectedOtherItemIds.includes(item.id)) {
          state.planner.selectedOtherItemIds.push(item.id);
        }
      } else {
        state.planner.selectedOtherItemIds =
          state.planner.selectedOtherItemIds.filter((id) => id !== item.id);
      }
      saveState();
    });

    const label = document.createElement("span");
    label.className = "planner-ingredient-label";
    label.textContent = item.store
      ? `${item.name} — ${item.store}`
      : item.name;

    top.appendChild(cb);
    top.appendChild(label);
    row.appendChild(top);

    plannerCustomContainer.appendChild(row);
  });
}

// ---------- GROCERY LIST ----------
function buildGroceryListStructure() {
  const byStore = {};

  function ensureStoreBucket(store) {
    const key = store || "Unassigned";
    if (!byStore[key]) byStore[key] = [];
    return byStore[key];
  }

  // Meals
  state.planner.selectedMealIds.forEach((mealId) => {
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return;
    const mealStates = state.planner.mealGroupStates[mealId] || {};

    const groups = {};
    meal.ingredients.forEach((ing) => {
      const key = ing.group ? "grp:" + ing.group : "solo:" + ing.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ing);
    });

    Object.entries(groups).forEach(([groupKey, ingArray]) => {
      const gs = mealStates[groupKey];
      if (!gs || !gs.included) return;

      let selectedIng =
        ingArray.find((i) => i.id === gs.selectedIngredientId) ||
        ingArray[0];
      const bucket = ensureStoreBucket(selectedIng.store);

      const qty =
        typeof selectedIng.qty === "number" && selectedIng.qty > 1
          ? `${selectedIng.qty} ${selectedIng.unit || "CT"}`
          : "";
      const comment = gs.comment || "";

      bucket.push({
        name: selectedIng.name,
        qty,
        comment
      });
    });
  });

  // Other items
  state.planner.selectedOtherItemIds.forEach((id) => {
    const item = state.otherItems.find((o) => o.id === id);
    if (!item) return;
    const bucket = ensureStoreBucket(item.store);
    bucket.push({
      name: item.name,
      qty: "",
      comment: ""
    });
  });

  return byStore;
}

function renderGroceryList() {
  if (!groceryListContainer) return;
  groceryListContainer.innerHTML = "";

  const byStore = buildGroceryListStructure();
  const storeNames = Object.keys(byStore);
  if (!storeNames.length) {
    groceryListContainer.textContent =
      "No grocery items yet. Use the Planner to select meals.";
    return;
  }

  // Prefer state.stores order, then unassigned
  const orderedStores = [...state.stores];
  if (byStore["Unassigned"]) orderedStores.push("Unassigned");

  orderedStores.forEach((store) => {
    if (!byStore[store] || !byStore[store].length) return;

    const header = document.createElement("div");
    header.className = "grocery-store-header";
    header.textContent = store === "Unassigned" ? "Other / Any Store" : store;

    const line = document.createElement("div");
    line.className = "grocery-divider";

    groceryListContainer.appendChild(header);
    groceryListContainer.appendChild(line);

    byStore[store].forEach((item) => {
      const row = document.createElement("div");
      row.className = "grocery-item";

      let lineText = `• ${item.name}`;
      if (item.qty) {
        // only show if >1
        lineText += ` (${item.qty})`;
      }
      if (item.comment) {
        lineText += ` (${item.comment})`;
      }

      row.textContent = lineText;
      groceryListContainer.appendChild(row);
    });
  });
}

function buildGroceryText() {
  const byStore = buildGroceryListStructure();
  const storeNames = Object.keys(byStore);
  if (!storeNames.length) return "";

  const result = [];

  const orderedStores = [...state.stores];
  if (byStore["Unassigned"]) orderedStores.push("Unassigned");

  orderedStores.forEach((store) => {
    if (!byStore[store] || !byStore[store].length) return;
    result.push(
      store === "Unassigned" ? "Other / Any Store" : store
    );
    byStore[store].forEach((item) => {
      let lineText = `• ${item.name}`;
      if (item.qty) lineText += ` (${item.qty})`;
      if (item.comment) lineText += ` (${item.comment})`;
      result.push(lineText);
    });
    result.push(""); // blank line between stores
  });

  return result.join("\n").trim();
}
