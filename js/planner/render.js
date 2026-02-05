// Main planner rendering logic
import { state } from '../state/state.js';
import { getAllMeals, getActiveIngredientsForMeal } from '../state/selectors.js';
import { persistState } from '../state/persistence.js';
import { scheduleGroceryRebuild } from '../utils/helpers.js';

export function renderPlanner() {
    const container = document.getElementById("plannerContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!getAllMeals().length) {
        container.innerHTML = `<p class="section-note">No meals yet. Add recipes first.</p>`;
        renderPlannerExtras();
        return;
    }

    const byCategory = {};
    getAllMeals().forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    Object.keys(byCategory).sort().forEach(cat => {
        const catWrapper = document.createElement("div");
        catWrapper.className = "planner-category";

        const isCollapsedCategory = state.ui.collapsedCategories.includes(cat);

        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleCategory(cat);
        header.innerHTML = `
            <span class="chevron">${isCollapsedCategory ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;
        catWrapper.appendChild(header);

        if (!isCollapsedCategory) {
            byCategory[cat].forEach(meal => {
                const mealRow = document.createElement("div");
                mealRow.className = "planner-meal-block";

                const isSelected = state.ui.plannerMeals.includes(meal.id);
                const mainRow = document.createElement("label");
                mainRow.className = "planner-meal-row";

                const multiplier = state.ui.plannerMealMultipliers[meal.id] || 1;
                const isMealCollapsed = state.ui.collapsedMeals[meal.id] === true;

                mainRow.innerHTML = `
                    <input 
                        type="checkbox"
                        ${isSelected ? "checked" : ""}
                        onchange="togglePlannerMeal('${meal.id}')"
                        onclick="event.stopPropagation();"
                    >
                    <span 
                        class="meal-collapse-toggle"
                        onclick="event.stopPropagation(); toggleMealCollapse('${meal.id}')"
                        style="cursor:pointer; user-select:none; margin-right:6px;"
                    >
                        ${isMealCollapsed ? "▶" : "▼"}
                    </span>
                    <span>${meal.name}</span>
                    <select 
                        class="meal-multiplier"
                        onchange="updateMealMultiplier('${meal.id}', this.value)"
                        style="margin-left:8px; padding:2px 6px;"
                    >
                        <option value="1" ${multiplier==1 ? "selected" : ""}>1×</option>
                        <option value="2" ${multiplier==2 ? "selected" : ""}>2×</option>
                        <option value="3" ${multiplier==3 ? "selected" : ""}>3×</option>
                        <option value="4" ${multiplier==4 ? "selected" : ""}>4×</option>
                        <option value="5" ${multiplier==5 ? "selected" : ""}>5×</option>
                    </select>
                `;

                mealRow.appendChild(mainRow);

                // Render ingredients if expanded
                if (isSelected && !isMealCollapsed && !isCollapsedCategory) {
                    const ingDiv = document.createElement("div");
                    ingDiv.className = "planner-ingredients";

                    let activeIngredients = [];
                    try {
                        activeIngredients = getActiveIngredientsForMeal(meal) || [];
                    } catch (e) {
                        console.error("Error in getActiveIngredientsForMeal:", e);
                        activeIngredients = [];
                    }

                    if (!activeIngredients.length) {
                        ingDiv.innerHTML = `<span class="muted">(No ingredients)</span>`;
                    } else {
                        activeIngredients.forEach(ing => {
                            const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

                            if (!state.ui.plannerIngredientChecks[meal.id]) {
                                state.ui.plannerIngredientChecks[meal.id] = {};
                            }
                            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
                            }

                            const checked = state.ui.plannerIngredientChecks[meal.id][ing.id];
                            const existingComment = state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

                            const line = document.createElement("div");
                            line.className = "planner-ingredient-check";

                            let inner = `
                                <input 
                                    type="checkbox"
                                    ${checked ? "checked" : ""}
                                    onclick="togglePlannerIngredient('${meal.id}', '${ing.id}')"
                                >
                                <span>${ing.name}${qtyPart} <span class="muted">– ${ing.store}</span></span>
                                <input 
                                    type="text"
                                    class="ing-comment"
                                    placeholder="Comment"
                                    value="${existingComment}"
                                    oninput="updateIngredientComment('${meal.id}', '${ing.id}', this.value)"
                                    style="margin-left:8px; flex:1;"
                                >
                            `;

                            if (ing.group) {
                                inner += `
                                    <button 
                                        class="primary" 
                                        style="margin-left:8px; white-space:nowrap;"
                                        onclick="openSubstituteModal('${meal.id}', '${ing.group}')"
                                    >
                                        Swap
                                    </button>
                                `;
                            }

                            line.innerHTML = inner;
                            ingDiv.appendChild(line);
                        });
                    }

                    mealRow.appendChild(ingDiv);
                }

                catWrapper.appendChild(mealRow);
            });
        }

        container.appendChild(catWrapper);
    });

    renderPlannerExtras();
}

export async function toggleCategory(cat) {
    const idx = state.ui.collapsedCategories.indexOf(cat);
    if (idx === -1) {
        state.ui.collapsedCategories.push(cat);
    } else {
        state.ui.collapsedCategories.splice(idx, 1);
    }
    await persistState();
    renderPlanner();
}

export async function toggleMealCollapse(mealId) {
    state.ui.collapsedMeals[mealId] = !state.ui.collapsedMeals[mealId];
    await persistState();
    renderPlanner();
}

export async function togglePlannerMeal(mealId) {
    const idx = state.ui.plannerMeals.indexOf(mealId);
    if (idx === -1) {
        state.ui.plannerMeals.push(mealId);
    } else {
        state.ui.plannerMeals.splice(idx, 1);
    }
    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();
}

// Expand/collapse all functions
export async function expandAllPlannerCategories() {
    state.ui.collapsedCategories = [];
    state.ui.collapsedMeals = {};
    await persistState();
    renderPlanner();
}

export async function collapseAllPlannerCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );
    state.ui.collapsedCategories = [...categories];
    state.ui.collapsedMeals = {};
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });
    await persistState();
    renderPlanner();
}

export async function showAllIngredients() {
    state.ui.collapsedCategories = [];
    Object.keys(state.ui.collapsedMeals).forEach(id => {
        state.ui.collapsedMeals[id] = false;
    });
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = false;
    });
    await persistState();
    renderPlanner();
}

export async function collapseAllIngredients() {
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });
    await persistState();
    renderPlanner();
}

export async function selectAllPlannerMeals() {
    state.ui.plannerMeals = getAllMeals().map(m => m.id);
    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();
}

export async function unselectAllPlannerMeals() {
    state.ui.plannerMeals = [];
    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();
}

// EXPOSE TO WINDOW (TEMP)
export function setupPlannerGlobals() {
    window.togglePlannerMeal = togglePlannerMeal;
    window.toggleMealCollapse = toggleMealCollapse;
    window.expandAllPlannerCategories = expandAllPlannerCategories;
    window.collapseAllPlannerCategories = collapseAllPlannerCategories;
    window.showAllIngredients = showAllIngredients;
    window.collapseAllIngredients = collapseAllIngredients;
    window.selectAllPlannerMeals = selectAllPlannerMeals;
    window.unselectAllPlannerMeals = unselectAllPlannerMeals;
}
