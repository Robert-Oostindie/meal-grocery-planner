// ----------------------
// BASIC STATE MODEL
// (we'll expand this in later phases)
// ----------------------
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

// ----------------------
// TAB SWITCHING
// ----------------------
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

// ----------------------
// INITIAL RENDER
// (no complex UI yet; just structure)
// ----------------------
function render() {
    // In later phases, we'll render recipes, planner, grocery, etc. here.
}

render();
