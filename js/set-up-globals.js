// Temporary globals setup
// Remove once all onclick handlers are converted to event listeners

import { setupAuthHandlers } from './auth/handlers.js';
import { setupRecipeListGlobals } from './recipes/list.js';
import { setupRecipeModalGlobals } from './recipes/modal.js';
import { setupIngredientEditorGlobals } from './recipes/editor.js';
import { setupPlannerGlobals } from './planner/render.js';
import { setupPlannerExtrasGlobals } from './planner/extras.js';
import { setupPlannerIngredientsGlobals } from './planner/ingredients.js';
import { setupGroceryListGlobals } from './grocery/list.js';
import { setupCategoriesGlobals } from './settings/categories.js';
import { setupStoresGlobals } from './settings/stores.js';
import { setupModalsGlobals } from './shared/modals.js';
import { setupExportImportGlobals } from './utils/export-import.js';
import { setupAutocompleteGlobals } from './ingredients/autocomplete.js';

export function setupAllGlobals() {
    setupRecipeListGlobals();
    setupRecipeModalGlobals();
    setupIngredientEditorGlobals();
    setupPlannerGlobals();
    setupPlannerExtrasGlobals();
    setupPlannerIngredientsGlobals();
    setupGroceryListGlobals();
    setupCategoriesGlobals();
    setupStoresGlobals();
    setupModalsGlobals();
    setupExportImportGlobals();
    setupAutocompleteGlobals();
}
