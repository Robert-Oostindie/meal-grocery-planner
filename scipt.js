// ---------- DATA MODEL ----------
const STORAGE_KEY = "mealGroceryPlanner_v2";

let state = {
  stores: ["Aldi", "Walmart", "Festival Foods", "Woodmans", "Other"],
  meals: [],          // {id, name, notes, ingredients[]}
  weekPlan: {         // which meals are selected for this week
    selectedMealIds: []
  },
  pantry: {           // ingredientKey -> {have, updated}
  },
  groceryList: {      // key -> {name, store, qty, unit, checked}
  },
  extras: []          // [{id, name, qty, unit, store, include}]
};

// DOM refs (assigned in init)
let tabSections = {};
let mealNameInput, mealNotesInput, addMealBtn, mealListEl, mealCountBadge, mealsEmptyState;
let plannerMealsEl, plannerEmptyEl, generateListBtn;
let pantrySearchInput, pantryListEl, pantryEmptyEl;
let storeNameInput, addStoreBtn, storeListEl, exportBtn, resetBtn, exportStatusEl;
let groceryGroupsEl, groceryEmptyEl, refreshFromPlanBtn, clearChecksBtn;
let extraNameInput, extraQtyInput, extraUnitInput, extraStoreSelect, addExtraBtn, extrasListEl, extrasEmptyEl;
let ingredientModal, ingredientModalTitle, ingredientNameInput, ingredientQtyInput,
    ingredientUnitInput, ingredientStoreSelect, ingredientGroupInput, ingredientGroupDatalist,
    ingredientDefaultCheckbox, ingredientSaveBtn;
let ingredientCancelBtn, ingredientCancelBtn2;
let subsModal, subsBody, subsApplyBtn, subsCancelBtn, subsCancelBtn2;

let currentMealForIngredient = null;
let currentIngredientId = null;

// ---------- STORAGE HELPERS ----------
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state = Object.assign(state, parsed);
  } catch (e) {
    console.error("Failed to load state", e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

// ---------- UTILS ----------
function makeId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

function ingredientKey(name) {
  return name.trim().toLowerCase();
}

function groceryItemKey(name, store) {
  return ingredientKey(name) + "::" + (store || "Unassigned");
}

// ensure only one default per group per meal
function setDefaultForGroupOnMeal(meal, groupName, ingredientId) {
  if (!groupName) return;
  meal.ingredients.forEach((ing) => {
    if (ing.subGroup === groupName) {
      ing.isDefault = (ing.id === ingredientId);
    }
  });
}

function makeDefaultIngredient(mealId, ingredientId, groupName) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  setDefaultForGroupOnMeal(meal, groupName, ingredientId);
  saveState();
  renderMeals();
  renderPantry();
  regenerateGroceryFromPlan(false);
}

// ---------- TABS ----------
function switchTab(tabName) {
  Object.entries(tabSections).forEach(([name, el]) => {
    if (name === tabName) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  if (tabName === "pantry") renderPantry();
  if (tabName === "planner") renderPlanner();
  if (tabName === "groceries") renderGroceryList();
  if (tabName === "stores") renderStores();
  if (tabName === "extras") renderExtras();
}

// ---------- MEALS ----------
function addMeal() {
  const name = mealNameInput.value.trim();
  const notes = mealNotesInput.value.trim();
  if (!name) {
    alert("Please enter a meal name.");
    mealNameInput.focus();
    return;
  }
  const newMeal = {
    id: makeId("meal"),
    name,
    notes,
    ingredients: [] // {id, name, qty, unit, store, subGroup, isDefault}
  };
  state.meals.push(newMeal);
  mealNameInput.value = "";
  mealNotesInput.value = "";
  saveState();
  renderMeals();
  renderPlanner();
  renderPantry();
}

function editMeal(mealId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  const newName = prompt("Meal name:", meal.name) ?? meal.name;
  const newNotes = prompt("Notes (optional):", meal.notes || "") ?? meal.notes;
  meal.name = newName.trim() || meal.name;
  meal.notes = (newNotes || "").trim();
  saveState();
  renderMeals();
  renderPlanner();
}

function deleteMeal(mealId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  if (!confirm(`Delete "${meal.name}" and all its ingredients? This cannot be undone.`))
    return;
  state.meals = state.meals.filter((m) => m.id !== mealId);
  state.weekPlan.selectedMealIds =
    state.weekPlan.selectedMealIds.filter((id) => id !== mealId);
  saveState();
  renderMeals();
  renderPlanner();
  renderPantry();
  regenerateGroceryFromPlan(false);
}

function deleteIngredient(mealId, ingId) {
  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;
  const ing = meal.ingredients.find((i) => i.id === ingId);
  if (!ing) return;
  if (!confirm(`Remove ingredient "${ing.name}" from this meal?`)) return;
  meal.ingredients = meal.ingredients.filter((i) => i.id !== ingId);
  saveState();
  renderMeals();
  renderPantry();
  regenerateGroceryFromPlan(false);
}

function renderMeals() {
  mealListEl.innerHTML = "";
  if (!state.meals.length) {
    mealsEmptyState.classList.remove("hidden");
    mealCountBadge.textContent = "0 meals";
    return;
  }
  mealsEmptyState.classList.add("hidden");
  mealCountBadge.textContent =
    state.meals.length === 1 ? "1 meal" : state.meals.length + " meals";

  state.meals.forEach((meal) => {
    const mealEl = document.createElement("div");
    mealEl.className = "meal-item";

    const header = document.createElement("div");
    header.className = "meal-header";

    const left = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "meal-name";
    nameEl.textContent = meal.name;
    left.appendChild(nameEl);

    if (meal.notes) {
      const notesEl = document.createElement("div");
      notesEl.className = "meal-notes";
      notesEl.textContent = meal.notes;
      left.appendChild(notesEl);
    }

    header.appendChild(left);

    const actions = document.createElement("div");
    actions.className = "meal-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost btn-sm";
    editBtn.innerHTML = "✏️";
    editBtn.title = "Edit meal name / notes";
    editBtn.addEventListener("click", () => editMeal(meal.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-ghost btn-sm";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.title = "Delete meal";
    deleteBtn.addEventListener("click", () => deleteMeal(meal.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    header.appendChild(actions);

    mealEl.appendChild(header);

    const ingSummary = document.createElement("div");
    ingSummary.className = "section-note";
    ingSummary.textContent =
      meal.ingredients.length === 0
        ? "No ingredients yet."
        : meal.ingredients.length + " ingredients defined.";
    mealEl.appendChild(ingSummary);

    const ingredientsContainer = document.createElement("div");
    ingredientsContainer.className = "ingredients-list";

    meal.ingredients.forEach((ing) => {
      const row = document.createElement("div");
      row.className = "ingredient-row";

      const main = document.createElement("div");
      main.className = "ingredient-main";

      const name = document.createElement("div");
      name.className = "ingredient-name";
      name.textContent = ing.name;
      main.appendChild(name);

      const meta = document.createElement("div");
      meta.className = "ingredient-meta";
      const parts = [];
      if (ing.qty) parts.push(ing.qty + (ing.unit ? " " + ing.unit : ""));
      if (ing.store) parts.push("🛒 " + ing.store);
      if (ing.subGroup) {
        parts.push(
          "Group: " +
            ing.subGroup +
            (ing.isDefault ? " (default)" : "")
        );
      }
      meta.textContent = parts.join(" • ") || "No quantity / store set";
      main.appendChild(meta);

      row.appendChild(main);

      const actions = document.createElement("div");
      actions.className = "ingredient-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-ghost btn-sm";
      editBtn.innerHTML = "✏️";
      editBtn.addEventListener("click", () =>
        openIngredientModal(meal.id, ing.id)
      );

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm";
      delBtn.innerHTML = "🗑️";
      delBtn.addEventListener("click", () =>
        deleteIngredient(meal.id, ing.id)
      );

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      if (ing.subGroup) {
        const defaultBtn = document.createElement("button");
        defaultBtn.className = "btn btn-ghost btn-sm";
        defaultBtn.textContent = ing.isDefault ? "⭐ Default" : "☆ Make default";
        defaultBtn.title = "Set as default for group '" + ing.subGroup + "'";
        defaultBtn.addEventListener("click", () =>
          makeDefaultIngredient(meal.id, ing.id, ing.subGroup)
        );
        actions.appendChild(defaultBtn);
      }

      row.appendChild(actions);
      ingredientsContainer.appendChild(row);
    });

    mealEl.appendChild(ingredientsContainer);

    const addIngBtn = document.createElement("button");
    addIngBtn.className = "btn btn-outline btn-sm mt-4";
    addIngBtn.textContent = "＋ Add Ingredient";
    addIngBtn.addEventListener("click", () => openIngredientModal(meal.id));
    mealEl.appendChild(addIngBtn);

    mealListEl.appendChild(mealEl);
  });
}

// ---------- INGREDIENT MODAL ----------
function populateStoreSelect(selectEl, selectedStore = "") {
  selectEl.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "No specific store";
  selectEl.appendChild(noneOption);

  state.stores.forEach((store) => {
    const opt = document.createElement("option");
    opt.value = store;
    opt.textContent = store;
    selectEl.appendChild(opt);
  });

  selectEl.value = selectedStore || "";
}

function populateGroupSuggestions(meal) {
  ingredientGroupDatalist.innerHTML = "";
  if (!meal) return;
  const groups = new Set();
  meal.ingredients.forEach((ing) => {
    if (ing.subGroup) groups.add(ing.subGroup);
  });
  groups.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g;
    ingredientGroupDatalist.appendChild(opt);
  });
}

function openIngredientModal(mealId, ingId = null) {
  currentMealForIngredient = mealId;
  currentIngredientId = ingId;

  const meal = state.meals.find((m) => m.id === mealId);
  if (!meal) return;

  populateGroupSuggestions(meal);

  if (ingId) {
    ingredientModalTitle.textContent = "Edit Ingredient";
    const ing = meal.ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    ingredientNameInput.value = ing.name || "";
    ingredientQtyInput.value = ing.qty || "";
    ingredientUnitInput.value = ing.unit || "CT";
    populateStoreSelect(ingredientStoreSelect, ing.store || "");
    ingredientGroupInput.value = ing.subGroup || "";
    ingredientDefaultCheckbox.checked = !!ing.isDefault;
  } else {
    ingredientModalTitle.textContent = "Add Ingredient";
    ingredientNameInput.value = "";
    ingredientQtyInput.value = "";
    ingredientUnitInput.value = "CT";
    populateStoreSelect(ingredientStoreSelect, "");
    ingredientGroupInput.value = "";
    ingredientDefaultCheckbox.checked = false;
  }

  ingredientModal.classList.remove("hidden");
  ingredientNameInput.focus();
}

function closeIngredientModal() {
  ingredientModal.classList.add("hidden");
  currentMealForIngredient = null;
  currentIngredientId = null;
}

function saveIngredientFromModal() {
  if (!currentMealForIngredient) {
    closeIngredientModal();
    return;
  }
  const meal = state.meals.find((m) => m.id === currentMealForIngredient);
  if (!meal) {
    closeIngredientModal();
    return;
  }

  const name = ingredientNameInput.value.trim();
  const qty = ingredientQtyInput.value.trim();
  let unit = ingredientUnitInput.value.trim();
  const store = ingredientStoreSelect.value.trim();
  const subGroup = ingredientGroupInput.value.trim();
  const wantsDefault = ingredientDefaultCheckbox.checked && !!subGroup;

  if (!name) {
    alert("Please enter an ingredient name.");
    ingredientNameInput.focus();
    return;
  }

  if (!unit) unit = "CT";

  let ing;
  if (currentIngredientId) {
    ing = meal.ingredients.find((i) => i.id === currentIngredientId);
    if (!ing) {
      closeIngredientModal();
      return;
    }
    ing.name = name;
    ing.qty = qty;
    ing.unit = unit;
    ing.store = store;
    ing.subGroup = subGroup || "";
    ing.isDefault = false; // recompute below
  } else {
    ing = {
      id: makeId("ing"),
      name,
      qty,
      unit,
      store,
      subGroup: subGroup || "",
      isDefault: false
    };
    meal.ingredients.push(ing);
  }

  if (!subGroup) {
    ing.subGroup = "";
    ing.isDefault = false;
  } else {
    const hasOtherDefault = meal.ingredients.some(
      (i) =>
        i.subGroup === subGroup &&
        i.id !== ing.id &&
        i.isDefault
    );
    if (wantsDefault || !hasOtherDefault) {
      setDefaultForGroupOnMeal(meal, subGroup, ing.id);
    }
  }

  saveState();
  renderMeals();
  renderPantry();
  regenerateGroceryFromPlan(false);
  closeIngredientModal();
}

// ---------- PLANNER ----------
function renderPlanner() {
  plannerMealsEl.innerHTML = "";
  const meals = state.meals;
  if (!meals.length) {
    plannerEmptyEl.classList.remove("hidden");
    return;
  }
  plannerEmptyEl.classList.add("hidden");

  meals.forEach((meal) => {
    const row = document.createElement("div");
    row.className = "checkbox-row mt-4";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.weekPlan.selectedMealIds.includes(meal.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!state.weekPlan.selectedMealIds.includes(meal.id)) {
          state.weekPlan.selectedMealIds.push(meal.id);
        }
      } else {
        state.weekPlan.selectedMealIds =
          state.weekPlan.selectedMealIds.filter((id) => id !== meal.id);
      }
      saveState();
    });

    const label = document.createElement("div");
    label.className = "grocery-item-main";
    const name = document.createElement("div");
    name.className = "grocery-item-name";
    name.textContent = meal.name;
    const meta = document.createElement("div");
    meta.className = "grocery-item-meta";
    meta.textContent =
      meal.ingredients.length === 0
        ? "No ingredients yet"
        : meal.ingredients.length + " ingredients";

    label.appendChild(name);
    label.appendChild(meta);

    row.appendChild(checkbox);
    row.appendChild(label);

    plannerMealsEl.appendChild(row);
  });
}

// ---------- SUBSTITUTE SELECTION MODAL (OPTION B, GROUPED BY MEAL) ----------
function buildSubstituteGroupsForSelectedMeals() {
  const selectedMeals = state.meals.filter((m) =>
    state.weekPlan.selectedMealIds.includes(m.id)
  );
  const result = {};

  selectedMeals.forEach((meal) => {
    const groups = {};
    meal.ingredients.forEach((ing) => {
      if (ing.subGroup) {
        if (!groups[ing.subGroup]) groups[ing.subGroup] = [];
        groups[ing.subGroup].push(ing);
      }
    });
    // only keep groups with actual substitutes (>1 ingredient)
    const filtered = {};
    Object.entries(groups).forEach(([gname, arr]) => {
      if (arr.length > 1) filtered[gname] = arr;
    });
    if (Object.keys(filtered).length > 0) {
      result[meal.id] = {
        meal,
        groups: filtered
      };
    }
  });

  return result;
}

function openSubsModal() {
  const groupsByMeal = buildSubstituteGroupsForSelectedMeals();
  const mealIds = Object.keys(groupsByMeal);
  if (mealIds.length === 0) {
    // no substitutes to choose -> go straight to list generation
    regenerateGroceryFromPlan(true, null);
    return;
  }

  subsBody.innerHTML = "";

  mealIds.forEach((mealId) => {
    const { meal, groups } = groupsByMeal[mealId];
    const mealBlock = document.createElement("div");
    mealBlock.className = "subs-meal-block";
    const mealTitle = document.createElement("div");
    mealTitle.className = "subs-meal-title";
    mealTitle.textContent = meal.name;
    mealBlock.appendChild(mealTitle);

    Object.entries(groups).forEach(([groupName, ings]) => {
      const groupTitle = document.createElement("div");
      groupTitle.className = "subs-group-title";
      groupTitle.textContent = groupName;
      mealBlock.appendChild(groupTitle);

      const defaultIds = ings.filter(i => i.isDefault).map(i => i.id);

      ings.forEach((ing, idx) => {
        const row = document.createElement("label");
        row.className = "subs-option-row sub-group-block";
        row.dataset.mealId = mealId;
        row.dataset.group = groupName;

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = mealId + "__" + groupName;
        radio.value = ing.id;
        radio.dataset.mealId = mealId;
        radio.dataset.group = groupName;
        radio.dataset.subRadio = "1";

        if (defaultIds.length > 0) {
          radio.checked = defaultIds.includes(ing.id);
        } else if (idx === 0) {
          radio.checked = true;
        }

        const text = document.createElement("span");
        text.textContent = ing.name;

        const meta = document.createElement("span");
        meta.className = "muted";
        const metaParts = [];
        if (ing.qty) metaParts.push(ing.qty + (ing.unit ? " " + ing.unit : ""));
        if (ing.store) metaParts.push(ing.store);
        meta.textContent = metaParts.length ? "• " + metaParts.join(" • ") : "";

        row.appendChild(radio);
        row.appendChild(text);
        row.appendChild(meta);

        mealBlock.appendChild(row);
      });
    });

    subsBody.appendChild(mealBlock);
  });

  subsModal.classList.remove("hidden");
}

function closeSubsModal() {
  subsModal.classList.add("hidden");
}

function collectSubSelectionsAndGenerate() {
  const groupBlocks = subsBody.querySelectorAll(".sub-group-block");
  if (!groupBlocks.length) {
    closeSubsModal();
    regenerateGroceryFromPlan(true, null);
    return;
  }

  const groupKeys = new Set();
  groupBlocks.forEach((block) => {
    const mealId = block.dataset.mealId;
    const group = block.dataset.group;
    groupKeys.add(mealId + "__" + group);
  });

  const selections = {};
  let missing = false;

  groupKeys.forEach((key) => {
    const [mealId, group] = key.split("__");
    const radio = subsBody.querySelector(
      `input[type="radio"][name="${mealId}__${group}"]:checked`
    );
    if (!radio) {
      missing = true;
      return;
    }
    if (!selections[mealId]) selections[mealId] = {};
    selections[mealId][group] = radio.value;
  });

  if (missing) {
    alert("Please choose an option for each substitute group.");
    return;
  }

  closeSubsModal();
  regenerateGroceryFromPlan(true, selections);
}

// ---------- GENERATE GROCERY LIST ----------
function regenerateGroceryFromPlan(showAlert = false, subSelections = null) {
  const selectedMeals = state.meals.filter((m) =>
    state.weekPlan.selectedMealIds.includes(m.id)
  );
  if (!selectedMeals.length) {
    if (showAlert) alert("Select at least one meal for this week first.");
    return;
  }

  const items = {};

  selectedMeals.forEach((meal) => {
    const groupInfo = {};
    meal.ingredients.forEach((ing) => {
      if (ing.subGroup) {
        if (!groupInfo[ing.subGroup]) {
          groupInfo[ing.subGroup] = { items: [], defaultIds: [] };
        }
        groupInfo[ing.subGroup].items.push(ing);
        if (ing.isDefault) groupInfo[ing.subGroup].defaultIds.push(ing.id);
      }
    });

    meal.ingredients.forEach((ing) => {
      if (!ing.name || !ing.name.trim()) return;

      if (ing.subGroup) {
        const groupName = ing.subGroup;
        const mealSubs = subSelections ? subSelections[meal.id] : null;
        if (mealSubs && mealSubs[groupName]) {
          if (ing.id !== mealSubs[groupName]) return;
        } else {
          const info = groupInfo[groupName];
          if (info && info.defaultIds.length > 0 && !info.defaultIds.includes(ing.id)) {
            return;
          }
        }
      }

      const key = groceryItemKey(ing.name, ing.store);
      const current = items[key] || {
        name: ing.name,
        store: ing.store || "",
        qty: 0,
        unit: ing.unit || "CT",
        checked: state.groceryList[key]?.checked || false
      };

      const qtyNum = parseFloat(ing.qty);
      if (!isNaN(qtyNum)) {
        current.qty += qtyNum;
      } else if (!current.qty && ing.qty) {
        current.qty = ing.qty;
      }

      items[key] = current;
    });
  });

  // pantry filter
  Object.keys(items).forEach((key) => {
    const ingKey = ingredientKey(items[key].name);
    const pantryItem = state.pantry[ingKey];
    if (pantryItem && pantryItem.have) {
      delete items[key];
    }
  });

  // extras
  (state.extras || []).forEach((extra) => {
    if (!extra.include) return;
    if (!extra.name || !extra.name.trim()) return;
    const key = groceryItemKey(extra.name, extra.store);
    const current = items[key] || {
      name: extra.name,
      store: extra.store || "",
      qty: 0,
      unit: extra.unit || "CT",
      checked: state.groceryList[key]?.checked || false
    };

    const qtyNum = parseFloat(extra.qty);
    if (!isNaN(qtyNum)) {
      current.qty += qtyNum;
    } else if (!current.qty && extra.qty) {
      current.qty = extra.qty;
    }

    items[key] = current;
  });

  state.groceryList = items;
  saveState();
  renderGroceryList();
  if (showAlert) {
    alert("Grocery list generated from your weekly plan, substitutes, and extras.");
  }
}

// ---------- PANTRY ----------
function getAllIngredientsUnique() {
  const map = {};
  state.meals.forEach((meal) => {
    meal.ingredients.forEach((ing) => {
      if (!ing.name || !ing.name.trim()) return;
      const key = ingredientKey(ing.name);
      if (!map[key]) {
        map[key] = {
          name: ing.name.trim(),
          stores: new Set()
        };
      }
      if (ing.store) {
        map[key].stores.add(ing.store);
      }
    });
  });
  return map;
}

function renderPantry() {
  const ingMap = getAllIngredientsUnique();
  const keys = Object.keys(ingMap);
  pantryListEl.innerHTML = "";

  if (!keys.length) {
    pantryEmptyEl.classList.remove("hidden");
    return;
  }
  pantryEmptyEl.classList.add("hidden");

  const filter = pantrySearchInput.value.trim().toLowerCase();
  const filteredKeys = keys.filter((k) =>
    ingMap[k].name.toLowerCase().includes(filter)
  );

  if (!filteredKeys.length) {
    pantryListEl.innerHTML =
      '<div class="muted">No matching ingredients.</div>';
    return;
  }

  filteredKeys.sort((a, b) =>
    ingMap[a].name.localeCompare(ingMap[b].name)
  );

  filteredKeys.forEach((key) => {
    const data = ingMap[key];
    const row = document.createElement("div");
    row.className = "checkbox-row mt-4";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const pantryItem = state.pantry[key];
    checkbox.checked = pantryItem?.have || false;
    checkbox.addEventListener("change", () => {
      state.pantry[key] = {
        have: checkbox.checked,
        updated: Date.now()
      };
      saveState();
    });

    const main = document.createElement("div");
    main.className = "grocery-item-main";
    const name = document.createElement("div");
    name.className = "grocery-item-name";
    name.textContent = data.name;
    const meta = document.createElement("div");
    meta.className = "grocery-item-meta";
    const storesText = Array.from(data.stores).join(", ");
    meta.textContent = storesText
      ? "Used in meals • Stores: " + storesText
      : "Used in meals";
    main.appendChild(name);
    main.appendChild(meta);

    row.appendChild(checkbox);
    row.appendChild(main);

    pantryListEl.appendChild(row);
  });
}

// ---------- STORES ----------
function renderStores() {
  storeListEl.innerHTML = "";
  if (!state.stores.length) {
    storeListEl.innerHTML =
      '<span class="muted">No stores yet. Add one above.</span>';
    return;
  }
  state.stores.forEach((store, index) => {
    const pill = document.createElement("div");
    pill.className = "store-pill" + (index === 0 ? " primary" : "");
    const icon = document.createElement("span");
    icon.className = "icon";
    icon.textContent = "🏬";
    const label = document.createElement("span");
    label.textContent = store;
    const remove = document.createElement("span");
    remove.className = "remove";
    remove.textContent = "✕";
    remove.title = "Remove store";
    remove.addEventListener("click", () => removeStore(store));
    pill.appendChild(icon);
    pill.appendChild(label);
    if (state.stores.length > 1) {
      pill.appendChild(remove);
    }
    storeListEl.appendChild(pill);
  });

  // keep store dropdowns up to date
  populateStoreSelect(ingredientStoreSelect, ingredientStoreSelect.value);
  populateStoreSelect(extraStoreSelect, extraStoreSelect.value);
}

function removeStore(storeName) {
  if (!confirm(
    `Remove store "${storeName}"? Ingredients and extras using this store will be set to "Unassigned".`
  )) return;
  state.stores = state.stores.filter((s) => s !== storeName);
  state.meals.forEach((meal) => {
    meal.ingredients.forEach((ing) => {
      if (ing.store === storeName) ing.store = "";
    });
  });
  state.extras.forEach((ex) => {
    if (ex.store === storeName) ex.store = "";
  });
  saveState();
  renderStores();
  renderMeals();
  renderPantry();
  regenerateGroceryFromPlan(false);
}

// ---------- EXTRAS ----------
function addExtra() {
  const name = extraNameInput.value.trim();
  const qty = extraQtyInput.value.trim();
  let unit = extraUnitInput.value.trim();
  const store = extraStoreSelect.value.trim();

  if (!name) {
    alert("Please enter an item name.");
    extraNameInput.focus();
    return;
  }
  if (!unit) unit = "CT";

  const ex = {
    id: makeId("extra"),
    name,
    qty,
    unit,
    store,
    include: true
  };
  state.extras.push(ex);

  extraNameInput.value = "";
  extraQtyInput.value = "";
  extraUnitInput.value = "CT";
  extraStoreSelect.value = "";

  saveState();
  renderExtras();
}

function toggleExtraInclude(extraId, checked) {
  const ex = state.extras.find((e) => e.id === extraId);
  if (!ex) return;
  ex.include = checked;
  saveState();
}

function deleteExtra(extraId) {
  const ex = state.extras.find((e) => e.id === extraId);
  if (!ex) return;
  if (!confirm(`Remove extra item "${ex.name}"?`)) return;
  state.extras = state.extras.filter((e) => e.id !== extraId);
  saveState();
  renderExtras();
  regenerateGroceryFromPlan(false);
}

function editExtra(extraId) {
  const ex = state.extras.find((e) => e.id === extraId);
  if (!ex) return;
  const newName = prompt("Item name:", ex.name) ?? ex.name;
  const newQty = prompt("Quantity (optional):", ex.qty || "") ?? ex.qty;
  const newUnit = prompt("Unit:", ex.unit || "CT") ?? ex.unit;
  ex.name = newName.trim() || ex.name;
  ex.qty = (newQty || "").trim();
  ex.unit = (newUnit || "CT").trim();
  saveState();
  renderExtras();
  regenerateGroceryFromPlan(false);
}

function renderExtras() {
  extrasListEl.innerHTML = "";
  const extras = state.extras || [];
  if (!extras.length) {
    extrasEmptyEl.classList.remove("hidden");
    return;
  }
  extrasEmptyEl.classList.add("hidden");

  extras.forEach((ex) => {
    const row = document.createElement("div");
    row.className = "grocery-item-row";

    const includeBox = document.createElement("input");
    includeBox.type = "checkbox";
    includeBox.checked = ex.include;
    includeBox.addEventListener("change", () =>
      toggleExtraInclude(ex.id, includeBox.checked)
    );

    const main = document.createElement("div");
    main.className = "grocery-item-main";
    const name = document.createElement("div");
    name.className = "grocery-item-name";
    name.textContent = ex.name;

    const meta = document.createElement("div");
    meta.className = "grocery-item-meta";
    const parts = [];
    if (ex.qty) parts.push(ex.qty + (ex.unit ? " " + ex.unit : ""));
    if (ex.store) parts.push(ex.store);
    meta.textContent = parts.join(" • ") || "No quantity set";
    main.appendChild(name);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "ingredient-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost btn-sm";
    editBtn.innerHTML = "✏️";
    editBtn.addEventListener("click", () => editExtra(ex.id));
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-ghost btn-sm";
    delBtn.innerHTML = "🗑️";
    delBtn.addEventListener("click", () => deleteExtra(ex.id));
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(includeBox);
    row.appendChild(main);
    row.appendChild(actions);

    extrasListEl.appendChild(row);
  });
}

// ---------- GROCERY LIST ----------
function renderGroceryList() {
  const items = state.groceryList || {};
  const keys = Object.keys(items);
  groceryGroupsEl.innerHTML = "";

  if (!keys.length) {
    groceryEmptyEl.classList.remove("hidden");
    return;
  }
  groceryEmptyEl.classList.add("hidden");

  const groups = {};
  keys.forEach((key) => {
    const item = items[key];
    const store = item.store || "Unassigned";
    if (!groups[store]) groups[store] = [];
    groups[store].push({ key, ...item });
  });

  const sortedStores = Object.keys(groups).sort((a, b) => {
    const ia = state.stores.indexOf(a);
    const ib = state.stores.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  sortedStores.forEach((store) => {
    const groupItems = groups[store];
    const groupEl = document.createElement("div");
    groupEl.className = "grocery-group";

    const header = document.createElement("div");
    header.className = "grocery-group-header";

    const title = document.createElement("div");
    title.className = "grocery-group-title";
    title.textContent = store === "Unassigned" ? "Other / Any Store" : store;

    const count = document.createElement("div");
    count.className = "pill-muted";
    const total = groupItems.length;
    const checked = groupItems.filter((i) => i.checked).length;
    count.textContent = `${checked}/${total} done`;

    header.appendChild(title);
    header.appendChild(count);
    groupEl.appendChild(header);

    groupItems.forEach((item) => {
      const row = document.createElement("div");
      row.className = "grocery-item-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.checked || false;
      checkbox.addEventListener("change", () => {
        state.groceryList[item.key].checked = checkbox.checked;
        saveState();
        renderGroceryList();
      });

      const main = document.createElement("div");
      main.className = "grocery-item-main";

      const name = document.createElement("div");
      name.className = "grocery-item-name";
      name.textContent = item.name;

      const meta = document.createElement("div");
      meta.className = "grocery-item-meta";
      const parts = [];
      if (item.qty) {
        parts.push(
          typeof item.qty === "number" && !isNaN(item.qty)
            ? `${item.qty} ${item.unit || ""}`.trim()
            : `${item.qty} ${item.unit || ""}`.trim()
        );
      } else if (item.unit) {
        parts.push(item.unit);
      }
      meta.textContent = parts.join(" • ") || "No quantity set";
      main.appendChild(name);
      main.appendChild(meta);

      row.appendChild(checkbox);
      row.appendChild(main);
      groupEl.appendChild(row);
    });

    groceryGroupsEl.appendChild(groupEl);
  });
}

// ---------- INIT ----------
function init() {
  // tab sections
  tabSections = {
    meals: document.getElementById("tab-meals"),
    planner: document.getElementById("tab-planner"),
    pantry: document.getElementById("tab-pantry"),
    stores: document.getElementById("tab-stores"),
    extras: document.getElementById("tab-extras"),
    groceries: document.getElementById("tab-groceries")
  };

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // meals
  mealNameInput = document.getElementById("meal-name");
  mealNotesInput = document.getElementById("meal-notes");
  addMealBtn = document.getElementById("add-meal-btn");
  mealListEl = document.getElementById("meal-list");
  mealCountBadge = document.getElementById("meal-count-badge");
  mealsEmptyState = document.getElementById("meals-empty-state");
  addMealBtn.addEventListener("click", addMeal);

  // planner
  plannerMealsEl = document.getElementById("planner-meals");
  plannerEmptyEl = document.getElementById("planner-empty");
  generateListBtn = document.getElementById("generate-list-btn");
  generateListBtn.addEventListener("click", openSubsModal);

  // pantry
  pantrySearchInput = document.getElementById("pantry-search");
  pantryListEl = document.getElementById("pantry-list");
  pantryEmptyEl = document.getElementById("pantry-empty");
  pantrySearchInput.addEventListener("input", renderPantry);

  // stores + data
  storeNameInput = document.getElementById("store-name");
  addStoreBtn = document.getElementById("add-store-btn");
  storeListEl = document.getElementById("store-list");
  exportBtn = document.getElementById("export-data-btn");
  resetBtn = document.getElementById("reset-app-btn");
  exportStatusEl = document.getElementById("export-status");

  addStoreBtn.addEventListener("click", () => {
    const name = storeNameInput.value.trim();
    if (!name) {
      alert("Enter a store name.");
      return;
    }
    if (state.stores.includes(name)) {
      alert("That store is already in your list.");
      return;
    }
    state.stores.push(name);
    storeNameInput.value = "";
    saveState();
    renderStores();
  });

  exportBtn.addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "meal-grocery-planner-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      exportStatusEl.textContent = "Exported data as JSON file.";
    } catch (e) {
      exportStatusEl.textContent = "Failed to export data.";
    }
  });

  resetBtn.addEventListener("click", () => {
    if (
      !confirm(
        "This will erase all meals, extras, pantry items, and grocery lists in this browser. Are you sure?"
      )
    )
      return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // grocery list
  groceryGroupsEl = document.getElementById("grocery-groups");
  groceryEmptyEl = document.getElementById("grocery-empty");
  refreshFromPlanBtn = document.getElementById("refresh-from-plan-btn");
  clearChecksBtn = document.getElementById("clear-checks-btn");

  refreshFromPlanBtn.addEventListener("click", () => {
    openSubsModal();
  });

  clearChecksBtn.addEventListener("click", () => {
    Object.values(state.groceryList).forEach((item) => {
      item.checked = false;
    });
    saveState();
    renderGroceryList();
  });

  // extras
  extraNameInput = document.getElementById("extra-name");
  extraQtyInput = document.getElementById("extra-qty");
  extraUnitInput = document.getElementById("extra-unit");
  extraStoreSelect = document.getElementById("extra-store");
  addExtraBtn = document.getElementById("add-extra-btn");
  extrasListEl = document.getElementById("extras-list");
  extrasEmptyEl = document.getElementById("extras-empty");
  addExtraBtn.addEventListener("click", addExtra);

  // ingredient modal
  ingredientModal = document.getElementById("ingredient-modal");
  ingredientModalTitle = document.getElementById("ingredient-modal-title");
  ingredientNameInput = document.getElementById("ingredient-name");
  ingredientQtyInput = document.getElementById("ingredient-qty");
  ingredientUnitInput = document.getElementById("ingredient-unit");
  ingredientStoreSelect = document.getElementById("ingredient-store");
  ingredientGroupInput = document.getElementById("ingredient-group");
  ingredientGroupDatalist = document.getElementById("ingredient-group-suggestions");
  ingredientDefaultCheckbox = document.getElementById("ingredient-default");
  ingredientSaveBtn = document.getElementById("ingredient-save");
  ingredientCancelBtn = document.getElementById("ingredient-cancel");
  ingredientCancelBtn2 = document.getElementById("ingredient-cancel-2");

  ingredientCancelBtn.addEventListener("click", closeIngredientModal);
  ingredientCancelBtn2.addEventListener("click", closeIngredientModal);
  ingredientSaveBtn.addEventListener("click", saveIngredientFromModal);
  ingredientModal.addEventListener("click", (e) => {
    if (e.target === ingredientModal) closeIngredientModal();
  });

  // substitute modal
  subsModal = document.getElementById("subs-modal");
  subsBody = document.getElementById("subs-modal-body");
  subsApplyBtn = document.getElementById("subs-apply");
  subsCancelBtn = document.getElementById("subs-cancel");
  subsCancelBtn2 = document.getElementById("subs-cancel-2");

  subsApplyBtn.addEventListener("click", collectSubSelectionsAndGenerate);
  subsCancelBtn.addEventListener("click", closeSubsModal);
  subsCancelBtn2.addEventListener("click", closeSubsModal);
  subsModal.addEventListener("click", (e) => {
    if (e.target === subsModal) closeSubsModal();
  });

  // load state & initial render
  loadState();

  // make sure dropdowns are populated before first render
  populateStoreSelect(ingredientStoreSelect, "");
  populateStoreSelect(extraStoreSelect, "");

  renderMeals();
  renderPlanner();
  renderPantry();
  renderStores();
  renderExtras();
  renderGroceryList();
}

window.addEventListener("DOMContentLoaded", init);
