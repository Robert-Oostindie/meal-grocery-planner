// Substitute modal management
import { state } from '../state/state.js';
import { getAllMeals, getGlobalGroupIngredients, findIngredientById } from '../state/selectors.js';
import { persistState } from '../state/persistence.js';
import { ingredientRows } from '../recipes/editor.js';

let subModalMealId = null;
let subModalGroupName = null;
let subModalIngredientIndex = null;

export function openSubstituteModal(mealId, groupName) {
    if (mealId === "__recipe_edit__") return;

    subModalMealId = mealId;
    subModalGroupName = groupName;

    const meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    const options = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                options.push({ ...ing, _mealId: m.id });
            }
        });
    });

    if (!options.length) return;

    const recipeDefaults = (meal.ingredients || []).filter(
        ing => ing.group === groupName && ing.isDefault
    );

    const recipeDefaultId = recipeDefaults.length ? recipeDefaults[0].id : null;

    const selectionsForMeal = state.ui.plannerSubstituteSelections[mealId] || {};

    const selectedId = selectionsForMeal[groupName] || recipeDefaultId || options[0].id;

    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

    options.forEach(ing => {
        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

        const isDefaultLabel = recipeDefaultId && ing.id === recipeDefaultId ? " ⭐ default" : "";

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

    const modal = document.getElementById("subModal");
    if (modal) modal.classList.remove("hidden");
}

export function closeSubstituteModal() {
    const modal = document.getElementById("subModal");
    if (modal) modal.classList.add("hidden");

    subModalMealId = null;
    subModalGroupName = null;
    subModalIngredientIndex = null;

    const body = document.getElementById("subModalBody");
    if (body) body.innerHTML = "";
}

export async function applySubstituteChoice() {
    // Mode 1: Recipe editor
    if (subModalMealId === "__recipe_edit__") {
        const selected = document.querySelector('input[name="reuseChoice"]:checked');
        if (!selected) {
            closeSubstituteModal();
            return;
        }

        const choice = selected.value;

        if (choice !== "__new__") {
            const ing = findIngredientById(choice);
            if (ing) {
                ingredientRows[subModalIngredientIndex].name = ing.name;
                ingredientRows[subModalIngredientIndex].qty = ing.qty;
                ingredientRows[subModalIngredientIndex].unit = ing.unit;
                ingredientRows[subModalIngredientIndex].store = ing.store;
            }
        }

        const { renderIngredientsEditor } = await import('../recipes/editor.js');
        renderIngredientsEditor();
        closeSubstituteModal();
        return;
    }

    // Mode 2: Planner
    const selected = document.querySelector('input[name="subChoice"]:checked');
    if (!selected) {
        closeSubstituteModal();
        return;
    }

    const ingId = selected.value;

    if (!state.ui.plannerSubstituteSelections[subModalMealId]) {
        state.ui.plannerSubstituteSelections[subModalMealId] = {};
    }

    state.ui.plannerSubstituteSelections[subModalMealId][subModalGroupName] = ingId;

    await persistState();
    closeSubstituteModal();
    
    const { renderPlanner } = await import('../planner/render.js');
    renderPlanner();
}

export function handleGroupFinished(index, groupName) {
    groupName = groupName.trim();
    if (!groupName) return;

    const matches = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                matches.push(ing);
            }
        });
    });

    if (matches.length === 0) return;

    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

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

    const addNew = document.createElement("label");
    addNew.style.display = "block";
    addNew.style.margin = "0.7rem 0 0.3rem";
    addNew.innerHTML = `
        <input type="radio" name="reuseChoice" value="__new__">
        Add a brand-new ingredient
    `;
    body.appendChild(addNew);

    subModalMealId = "__recipe_edit__";
    subModalGroupName = groupName;
    subModalIngredientIndex = index;

    document.getElementById("subModal").classList.remove("hidden");
}

// EXPOSE TO WINDOW (TEMP)
export function setupModalsGlobals() {
    window.openSubstituteModal = openSubstituteModal;
    window.closeSubstituteModal = closeSubstituteModal;
    window.applySubstituteChoice = applySubstituteChoice;
}
