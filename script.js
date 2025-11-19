// ===============================
// Meal & Grocery Planner - script.js
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

let state = {
  version: 1,
  categoriesDefault: [...DEFAULT_CATEGORIES],
  categoriesCustom: [],
  stores: [...DEFAULT_STORES],
  meals: [], // {id,name,category,ingredients:[{id,name,qty,unit,store,group,isDefault}]}
  otherItems: [], // {id,name,store}
  planner: {
    selectedMealIds: [],
    mealGroupStates: {}, // mealId -> groupKey -> {selectedIngredientId,included,comment}
    selectedOtherItemIds: []
  }
};

const byName = (a, b) => a.name.localeCompare(b.name);
const byString = (a, b) => a.localeCompare(b);
const makeId = () =>
  "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Save error", e);
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
      categoriesDefault: [...DEFAULT_CATEGORIES],
      categoriesCustom: parsed.categoriesCustom || []
    };
  } catch (e) {
    console.error("Load error", e);
  }
}

function getAllCategories() {
  const set = new Set([...state.categoriesDefault, ...state.categoriesCustom]);
  return Array.from(set).sort(byString);
}

// DOM refs
let navButtons, tabs, fabBtn;
let recipesContainer,
  categoriesContainer,
  plannerMealsContainer,
  plannerCustomContainer,
  otherItemsContainer,
  storesContainer,
  groceryListContainer;
let collapseAllBtn, copyListBtn;

// Modals & fields
let recipeModal,
  recipeModalTitle,
  recipeNameInput,
  recipeCategoryInput,
  ingredientList,
  addIngredientBtn,
  saveRecipeBtn,
  closeRecipeModalBtn;

let otherItemModal,
  otherItemNameInput,
  otherItemStoreInput,
  saveOtherItemBtn,
  closeOtherItemModalBtn;

let storeModal,
  storeNameInput,
  saveStoreBtn,
  closeStoreModalBtn;

let plannerCustomModal,
  plannerCustomNameInput,
  plannerCustomStoreSelect,
  savePlannerCustomBtn,
  closePlannerCustomModalBtn;

let currentTabId = "recipesTab";
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
  categoriesContainer = document.getElementById("categoriesContainer");
  plannerMealsContainer = document.getElementById("plannerMealsContainer");
  plannerCustomContainer = document.getElementById("plannerCustomContainer");
  otherItemsContainer = document.getElementById("otherItemsContainer");
  storesContainer = document.getElementById("storesContainer");
  groceryListContainer = document.getElementById("groceryListContainer");

  collapseAllBtn = document.getElementById("collapseAllBtn");
  copyListBtn = document.getElementById("copyListBtn");

  recipeModal = document.getElementById("recipeModal");
  recipeModalTitle = document.getElementById("recipeModalTitle");
  recipeNameInput = document.getElementById("recipeNameInput");
  recipeCategoryInput = document.getElementById("recipeCategoryInput");
  ingredientList = document.getElementById("ingredientList");
  addIngredientBtn = document.getElementById("addIngredientBtn");
  saveRecipeBtn = document.getElementById("saveRecipeBtn");
  closeRecipeModalBtn = document.getElementById("closeRecipeModal");

  otherItemModal = document.getElementById("otherItemModal");
  otherItemNameInput = document.getElementById("otherItemNameInput");
  otherItemStoreInput = document.getElementById("otherItemStoreInput");
  saveOtherItemBtn = document.getElementById("saveOtherItemBtn");
  closeOtherItemModalBtn = document.getElementById("closeOtherItemModal");

  storeModal = document.getElementById("storeModal");
  storeNameInput = document.getElementById("storeNameInput");
  saveStoreBtn = document.getElementById("saveStoreBtn");
  closeStoreModalBtn = document.getElementById("closeStoreModal");

  plannerCustomModal = document.getElementById("plannerCustomModal");
  plannerCustomNameInput = document.getElementById("plannerCustomName");
  plannerCustomStoreSelect = document.getElementById("plannerCustomStore");
  savePlannerCustomBtn = document.getElementById("savePlannerCustomBtn");
  closePlannerCustomModalBtn = document.getElementById(
    "closePlannerCustomModal"
  );

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      switchTab(tabId);
    });
  });

  fabBtn.addEventListener("click", handleFabClick);

  collapseAllBtn.addEventListener("click", () => {
    // just hide ingredient blocks, keep selections
    const blocks = plannerMealsContainer.querySelectorAll(".planner-ingredients");
    blocks.forEach((b) => (b.style.display = "none"));
  });

  copyListBtn.addEventListener("click", () => {
    const text = buildGroceryText();
    if (!text.trim()) {
      alert("Your grocery list is empty.");
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Grocery list copied. Paste into Notes."))
      .catch(() =>
        alert("Copy failed. You can still select and copy manually.")
      );
  });

  addIngredientBtn.addEventListener("click", () =>
    addIngredientRowToModal()
  );
  saveRecipeBtn.addEventListener("click", saveRecipeFromModal);
  closeRecipeModalBtn.addEventListener("click", () =>
    hideModal(recipeModal)
  );

  saveOtherItemBtn.addEventListener("click", saveOtherItemFromModal);
  closeOtherItemModalBtn.addEventListener("click", () =>
    hideModal(otherItemModal)
  );

  saveStoreBtn.addEventListener("click", saveStoreFromModal);
  closeStoreModalBtn.addEventListener("click", () =>
    hideModal(storeModal)
  );

  savePlannerCustomBtn.addEventListener("click", savePlannerCustomFromModal);
  closePlannerCustomModalBtn.addEventListener("click", () =>
    hideModal(plannerCustomModal)
  );

  syncCategoryDropdown();
  syncStoreSelects();

  renderRecipes();
  renderCategories();
  renderPlanner();
  renderOtherItems();
  renderStores();
  renderGroceryList();
  updateFabVisibility();
});

// ---------- Tabs & FAB ----------

function switchTab(tabId) {
  currentTabId = tabId;

  Object.entries(tabs).forEach(([id, el]) => {
    el.classList.toggle("active", id === tabId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  if (tabId === "plannerTab") {
    renderPlanner();
  } else if (tabId === "otherTab") {
    renderOtherItems();
  } else if (tabId === "storesTab") {
    renderStores();
  } else if (tabId === "recipesTab") {
    renderRecipes();
    renderCategories();
  } else if (tabId === "groceryTab") {
    renderGroceryList();
  }

  updateFabVisibility();
}

function updateFabVisibility() {
  if (
    currentTabId === "recipesTab" ||
    currentTabId === "plannerTab" ||
    currentTabId === "otherTab" ||
    currentTabId === "storesTab"
  ) {
    fabBtn.style.display = "flex";
  } else {
    fabBtn.style.display = "none";
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

// ---------- Modal helpers ----------

function showModal(el) {
  el.classList.remove("hidden");
}

function hideModal(el) {
  el.classList.add("hidden");
}

// ---------- Categories ----------

function syncCategoryDropdown() {
  const cats = getAllCategories();
  recipeCategoryInput.innerHTML = "";
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    recipeCategoryInput.appendChild(opt);
  });
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
        renderCategories();
      } else {
        syncCategoryDropdown();
      }
    }
  };
}

function renderCategories() {
  categoriesContainer.innerHTML = "";
  const all = getAllCategories();
  all.forEach((cat) => {
    const pill = document.createElement("div");
    pill.className = "category-pill";

    const span = document.createElement("span");
    span.textContent = cat;
    pill.appendChild(span);

    if (state.categoriesCustom.includes(cat)) {
      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.title = "Delete custom category";
      btn.addEventListener("click", () => {
        if (
          !confirm(
            `Delete custom category "${cat}"? Meals will show as Uncategorized.`
          )
        )
          return;
        state.categoriesCustom = state.categoriesCustom.filter(
          (c) => c !== cat
        );
        state.meals.forEach((m) => {
          if (m.category === cat) m.category = "";
        });
        saveState();
        syncCategoryDropdown();
        renderCategories();
        renderRecipes();
        renderPlanner();
      });
      pill.appendChild(btn);
    }

    categoriesContainer.appendChild(pill);
  });
}

// ---------- Stores ----------

function syncStoreSelects() {
  const selects = [otherItemStoreInput, plannerCustomStoreSelect];
  selects.forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    state.stores
      .slice()
      .sort(byString)
      .forEach((store) => {
        const opt = document.createElement("option");
        opt.value = store;
        opt.textContent = store;
        sel.appendChild(opt);
      });
  });
}

function openStoreModal() {
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
  storesContainer.innerHTML = "";
  const sorted = state.stores.slice().sort(byString);
  if (!sorted.length) {
    storesContainer.textContent = "No stores yet.";
    return;
  }

  sorted.forEach((store) => {
    const card = document.createElement("div");
    card.className = "store-card";

    const label = document.createElement("span");
    label.textContent = store;

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary small";
    btn.textContent = "Delete";
    btn.addEventListener("click", () => {
      const usedInMeals = state.meals.some((m) =>
        m.ingredients.some((ing) => ing.store === store)
      );
      const usedInOthers = state.otherItems.some(
        (it) => it.store === store
      );

      if (usedInMeals || usedInOthers) {
        alert(
          `Cannot delete "${store}" because it is used in recipes or other items.`
        );
        return;
      }
      if (!confirm(`Delete store "${store}"?`)) return;
      state.stores = state.stores.filter((s) => s !== store);
      saveState();
      syncStoreSelects();
      renderStores();
    });

    card.appendChild(label);
    card.appendChild(btn);
    storesContainer.appendChild(card);
  });
}

// ---------- Recipes ----------

function renderRecipes() {
  recipesContainer.innerHTML = "";

  if (!state.meals.length) {
    const empty = document.createElement("div");
    empty.textContent = "No recipes yet. Tap + to add one.";
    recipesContainer.appendChild(empty);
    return;
  }

  const sorted = state.meals.slice().sort(byName);
  sorted.forEach((meal) => {
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
  syncCategoryDropdown();

  if (mealId) {
    recipeModalTitle.textContent = "Edit Recipe";
    const meal = state.meals.find((m) => m.id === mealId);
    if (!meal) return;
    recipeNameInput.value = meal.name;
    recipeCategoryInput.value = meal.category || DEFAULT_CATEGORIES[0];

    meal.ingredients.forEach((ing) => addIngredientRowToModal(ing));
  } else {
    recipeModalTitle.textContent = "Add Recipe";
    recipeNameInput.value = "";
    recipeCategoryInput.value = DEFAULT_CATEGORIES[0];
    addIngredientRowToModal();
  }

  showModal(recipeModal);
}

function addIngredientRowToModal(ing = null) {
  const row = document.createElement("div");
  row.className = "ingredient-edit-row";

  const main = document.createElement("div");
  main.className = "ingredient-main-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Ingredient name";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.placeholder = "1";

  const unitInput = document.createElement("input");
  unitInput.type = "text";
  unitInput.placeholder = "CT";

  const storeSelect = document.createElement("select");

  state.stores
    .slice()
    .sort(byString)
    .forEach((store) => {
      const opt = document.createElement("option");
      opt.value = store;
      opt.textContent = store;
      storeSelect.appendChild(opt);
    });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "ing-remove-btn";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", () => {
    row.remove();
  });

  main.appendChild(nameInput);
  main.appendChild(qtyInput);
  main.appendChild(unitInput);
  main.appendChild(storeSelect);
  main.appendChild(removeBtn);

  const groupRow = document.createElement("div");
  groupRow.className = "ingredient-group-row";

  const groupInput = document.createElement("input");
  groupInput.type = "text";
  groupInput.placeholder = "Substitute group (optional)";
  groupInput.className = "ingredient-group-input";

  const defaultBtn = document.createElement("button");
  defaultBtn.type = "button";
  defaultBtn.className = "ingredient-default-toggle";
  defaultBtn.textContent = "☆ Make Default";
  defaultBtn.dataset.isDefault = "false";

  defaultBtn.addEventListener("click", () => {
    const isDef = defaultBtn.dataset.isDefault === "true";
    if (isDef) {
      defaultBtn.dataset.isDefault = "false";
      defaultBtn.classList.remove("is-default");
      defaultBtn.textContent = "☆ Make Default";
    } else {
      defaultBtn.dataset.isDefault = "true";
      defaultBtn.classList.add("is-default");
      defaultBtn.textContent = "⭐ Default";
    }
  });

  groupRow.appendChild(groupInput);
  groupRow.appendChild(defaultBtn);

  row.appendChild(main);
  row.appendChild(groupRow);
  ingredientList.appendChild(row);

  if (ing) {
    nameInput.value = ing.name || "";
    qtyInput.value = ing.qty || "";
    unitInput.value = ing.unit || "";
    storeSelect.value = ing.store || state.stores[0] || "";
    groupInput.value = ing.group || "";
    if (ing.isDefault) {
      defaultBtn.dataset.isDefault = "true";
      defaultBtn.classList.add("is-default");
      defaultBtn.textContent = "⭐ Default";
    }
  } else {
    qtyInput.value = "1";
    unitInput.value = "CT";
  }
}

function saveRecipeFromModal() {
  const name = recipeNameInput.value.trim();
  let category = recipeCategoryInput.value;
  if (!name) {
    alert("Please enter a meal name.");
    return;
  }

  if (
    category &&
    category !== "__new__" &&
    !state.categoriesDefault.includes(category) &&
    !state.categoriesCustom.includes(category)
  ) {
    state.categoriesCustom.push(category);
  }

  const rows = ingredientList.querySelectorAll(".ingredient-edit-row");
  const ingredients = [];

  rows.forEach((row) => {
    const nameInput = row.querySelector(".ingredient-main-row input[type=text]");
    const [qtyInput, unitInput, storeSelect] =
      row.querySelectorAll(".ingredient-main-row input, .ingredient-main-row select");

    const groupInput = row.querySelector(".ingredient-group-input");
    const defaultBtn = row.querySelector(".ingredient-default-toggle");

    const ingName = nameInput.value.trim();
    if (!ingName) return;

    const qtyVal = qtyInput.value.trim();
    const unitVal = unitInput.value.trim();
    const storeVal = storeSelect.value;
    const groupVal = groupInput.value.trim();
    const isDefault = defaultBtn.dataset.isDefault === "true";

    let qty = parseFloat(qtyVal);
    if (isNaN(qty) || qty <= 0) qty = 1;

    ingredients.push({
      id: makeId(),
      name: ingName,
      qty,
      unit: unitVal || "CT",
      store: storeVal || "",
      group: groupVal,
      isDefault
    });
  });

  // normalize defaults: one per group
  const groups = {};
  ingredients.forEach((ing) => {
    const key = ing.group || "__solo__" + ing.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ing);
  });
  Object.values(groups).forEach((ings) => {
    const defIndex = ings.findIndex((i) => i.isDefault);
    if (defIndex > -1) {
      ings.forEach((i, idx) => (i.isDefault = idx === defIndex));
    }
  });

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
  renderCategories();
  renderPlanner();
}

// ---------- Other Items ----------

function openOtherItemModal() {
  otherItemNameInput.value = "";
  syncStoreSelects();
  showModal(otherItemModal);
}

function saveOtherItemFromModal() {
  const name = otherItemNameInput.value.trim();
  const store = otherItemStoreInput.value || "";
  if (!name) {
    alert("Enter item name.");
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
  otherItemsContainer.innerHTML = "";
  if (!state.otherItems.length) {
    otherItemsContainer.textContent = "No other items added yet.";
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

// ---------- Planner Custom Items From FAB ----------

function openPlannerCustomModal() {
  plannerCustomNameInput.value = "";
  syncStoreSelects();
  showModal(plannerCustomModal);
}

function savePlannerCustomFromModal() {
  const name = plannerCustomNameInput.value.trim();
  const store = plannerCustomStoreSelect.value || "";
  if (!name) {
    alert("Enter item name.");
    return;
  }
  const id = makeId();
  state.otherItems.push({ id, name, store });
  // also mark selected in planner
  state.planner.selectedOtherItemIds.push(id);
  saveState();
  hideModal(plannerCustomModal);
  renderOtherItems();
  renderPlannerCustomItems();
}

// ---------- Planner ----------

function renderPlanner() {
  plannerMealsContainer.innerHTML = "";

  if (!state.meals.length) {
    plannerMealsContainer.textContent =
      "Add recipes first in the Recipes tab.";
    plannerCustomContainer.textContent = "";
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
      if (!meals.length) return;

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
    state.planner.selectedMealIds = state.planner.selectedMealIds.filter(
      (id) => id !== mealId
    );
    // erase comments & reset included for this meal
    delete state.planner.mealGroupStates[mealId];
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

  const groups = {};
  meal.ingredients.forEach((ing) => {
    const key = ing.group ? "grp:" + ing.group : "solo:" + ing.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ing);
  });

  Object.entries(groups).forEach(([groupKey, ingArray]) => {
    if (!mealStates[groupKey]) {
      // pick default-ing or first
      let def = ingArray.find((i) => i.isDefault) || ingArray[0];
      mealStates[groupKey] = {
        selectedIngredientId: def.id,
        included: true,
        comment: ""
      };
    }

    const gs = mealStates[groupKey];
    let selectedIng =
      ingArray.find((i) => i.id === gs.selectedIngredientId) ||
      ingArray[0];
    gs.selectedIngredientId = selectedIng.id;

    const row = document.createElement("div");
    row.className = "planner-ingredient-row";

    const top = document.createElement("div");
    top.className = "planner-ingredient-top";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = gs.included;
    cb.addEventListener("change", () => {
      gs.included = cb.checked;
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

    if (ingArray.length > 1) {
      const sel = document.createElement("select");
      ingArray.forEach((ing) => {
        const opt = document.createElement("option");
        opt.value = ing.id;
        let q = "";
        if (typeof ing.qty === "number" && ing.qty > 1) {
          q = ` (${ing.qty} ${ing.unit || "CT"})`;
        }
        opt.textContent = `${ing.name}${q}`;
        if (ing.id === gs.selectedIngredientId) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => {
        gs.selectedIngredientId = sel.value;
        saveState();
        renderPlanner();
      });
      top.appendChild(sel);
    }

    const commentInput = document.createElement("input");
    commentInput.type = "text";
    commentInput.className = "planner-comment";
    commentInput.placeholder = "Note (optional)";
    commentInput.value = gs.comment || "";
    commentInput.addEventListener("input", () => {
      gs.comment = commentInput.value.trim();
      saveState();
    });

    row.appendChild(top);
    row.appendChild(commentInput);
    container.appendChild(row);
  });

  saveState();
}

function renderPlannerCustomItems() {
  plannerCustomContainer.innerHTML = "";
  if (!state.otherItems.length) {
    plannerCustomContainer.textContent =
      "No extra items yet. Use + in Planner or Other tab.";
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

// ---------- Grocery List ----------

function buildGroceryListStructure() {
  const byStore = {};
  const ensureBucket = (store) => {
    const key = store || "Unassigned";
    if (!byStore[key]) byStore[key] = [];
    return byStore[key];
  };

  // from meals
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
        ingArray.find((i) => i.isDefault) ||
        ingArray[0];

      const bucket = ensureBucket(selectedIng.store);
      let qty = "";
      if (typeof selectedIng.qty === "number" && selectedIng.qty > 1) {
        qty = `${selectedIng.qty} ${selectedIng.unit || "CT"}`;
      }
      const comment = gs.comment || "";

      bucket.push({
        name: selectedIng.name,
        qty,
        comment
      });
    });
  });

  // from other items
  state.planner.selectedOtherItemIds.forEach((id) => {
    const item = state.otherItems.find((o) => o.id === id);
    if (!item) return;
    const bucket = ensureBucket(item.store);
    bucket.push({
      name: item.name,
      qty: "",
      comment: ""
    });
  });

  return byStore;
}

function renderGroceryList() {
  groceryListContainer.innerHTML = "";
  const byStore = buildGroceryListStructure();
  const keys = Object.keys(byStore);
  if (!keys.length) {
    groceryListContainer.textContent =
      "No grocery items yet. Use Planner to select meals and items.";
    return;
  }

  const orderedStores = [...state.stores];
  if (byStore["Unassigned"]) orderedStores.push("Unassigned");

  orderedStores.forEach((store) => {
    const items = byStore[store];
    if (!items || !items.length) return;

    const header = document.createElement("div");
    header.className = "grocery-store-header";
    header.textContent =
      store === "Unassigned" ? "Other / Any Store" : store;

    const line = document.createElement("div");
    line.className = "grocery-divider";

    groceryListContainer.appendChild(header);
    groceryListContainer.appendChild(line);

    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "grocery-item";

      let text = `• ${item.name}`;
      if (item.qty) text += ` (${item.qty})`;
      if (item.comment) text += ` (${item.comment})`;

      row.textContent = text;
      groceryListContainer.appendChild(row);
    });
  });
}

function buildGroceryText() {
  const byStore = buildGroceryListStructure();
  const keys = Object.keys(byStore);
  if (!keys.length) return "";

  const lines = [];
  const orderedStores = [...state.stores];
  if (byStore["Unassigned"]) orderedStores.push("Unassigned");

  orderedStores.forEach((store) => {
    const items = byStore[store];
    if (!items || !items.length) return;
    lines.push(store === "Unassigned" ? "Other / Any Store" : store);
    items.forEach((item) => {
      let text = `• ${item.name}`;
      if (item.qty) text += ` (${item.qty})`;
      if (item.comment) text += ` (${item.comment})`;
      lines.push(text);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
}
