// Categories tab management
import { state } from '../state/state.js';
import { getAllCategories } from '../state/selectors.js';
import { persistState } from '../state/persistence.js';
import { GLOBAL_CATEGORIES } from '../config/constants.js';

export function renderCategoriesTab() {
    const globalDiv = document.getElementById("globalCategoryList");
    const userDiv = document.getElementById("userCategoryList");

    if (!globalDiv || !userDiv) return;

    globalDiv.innerHTML = GLOBAL_CATEGORIES
        .map(cat => `<div class="store-row">${cat}</div>`)
        .join("");

    userDiv.innerHTML = (state.data.userCategories || [])
        .map((cat, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${cat}</span>
                <button class="danger" onclick="removeUserCategory(${idx})">Remove</button>
            </div>
        `)
        .join("");
}

export async function addUserCategory() {
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userCategories) state.data.userCategories = [];

    if (GLOBAL_CATEGORIES.includes(name) || state.data.userCategories.includes(name)) {
        alert("Category already exists.");
        return;
    }

    state.data.userCategories.push(name);

    await persistState();
    input.value = "";
    renderCategoriesTab();
}

export async function removeUserCategory(index) {
    if (!state.data.userCategories) return;

    state.data.userCategories.splice(index, 1);

    await persistState();
    renderCategoriesTab();
}

// EXPOSE TO WINDOW (TEMP)
export function setupCategoriesGlobals() {
    window.addUserCategory = addUserCategory;
    window.removeUserCategory = removeUserCategory;
}
