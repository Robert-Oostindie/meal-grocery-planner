// Tab switching and main render function
import { renderRecipes } from '../recipes/list.js';
import { renderPlanner } from '../planner/render.js';
import { renderGroceryList } from '../grocery/list.js';
import { renderCategoriesTab } from '../settings/categories.js';
import { renderStoresTab } from '../settings/stores.js';

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

export function switchTab(tabId) {
    tabPages.forEach(page => {
        page.classList.toggle("active", page.id === tabId);
    });

    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    if (tabId === "groceryTab") {
        renderGroceryList();
    }
    if (tabId === "storesTab") {
        renderStoresTab();
    }
    if (tabId === "categoriesTab") {
        renderCategoriesTab();
    }
}

export function renderApp() {
    const activeTab = document.querySelector(".tab-page.active")?.id;

    renderRecipes();
    renderPlanner();

    if (activeTab === "groceryTab") {
        renderGroceryList();
    }
}

// Setup tab listeners
tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        switchTab(tabId);
    });
});
