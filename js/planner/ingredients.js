// Ingredient checks, comments, multipliers
import { state } from '../state/state.js';
import { persistState } from '../state/persistence.js';
import { scheduleGroceryRebuild } from '../utils/helpers.js';

export async function togglePlannerIngredient(mealId, ingId) {
    if (!state.ui.plannerIngredientChecks[mealId]) {
        state.ui.plannerIngredientChecks[mealId] = {};
    }

    const prev = state.ui.plannerIngredientChecks[mealId][ingId];
    state.ui.plannerIngredientChecks[mealId][ingId] = !prev;

    await persistState();
    
    const { renderPlanner } = await import('./render.js');
    renderPlanner();
    scheduleGroceryRebuild();
}

export async function updateIngredientComment(mealId, ingId, text) {
    if (!state.ui.plannerIngredientComments[mealId]) {
        state.ui.plannerIngredientComments[mealId] = {};
    }
    state.ui.plannerIngredientComments[mealId][ingId] = text;
    await persistState();
}

export async function updateMealMultiplier(mealId, value) {
    state.ui.plannerMealMultipliers[mealId] = Number(value);
    await persistState();
    
    const { renderPlanner } = await import('./render.js');
    renderPlanner();
    scheduleGroceryRebuild();
}

// EXPOSE TO WINDOW (TEMP)
export function setupPlannerIngredientsGlobals() {
    window.togglePlannerIngredient = togglePlannerIngredient;
    window.updateIngredientComment = updateIngredientComment;
    window.updateMealMultiplier = updateMealMultiplier;
}
