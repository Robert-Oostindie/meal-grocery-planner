// ==============================
// DATA EXPORT / IMPORT
// Backup and restore functionality
// ==============================

import { state } from '../state/state.js';
import { persistState } from '../state/persistence.js';

// ==============================
// EXPORT DATA
// ==============================

export function exportAppData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    a.download = `mealplanner_backup_${timestamp}.json`;

    a.click();
    URL.revokeObjectURL(url);
}

// ==============================
// IMPORT DATA
// ==============================

export async function importAppData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            if (typeof imported !== "object") {
                alert("Invalid backup file.");
                return;
            }

            // If meals existed in the old schema, map them into userMeals
            if (imported.meals && !imported.userMeals) {
                imported.userMeals = imported.meals;
            }

            // APPLY IMPORTED DATA
            state.data.userMeals = imported.userMeals || imported.data?.userMeals || [];
            state.data.userStores = imported.userStores || imported.data?.userStores || [];
            state.data.userCategories = imported.userCategories || imported.data?.userCategories || [];

            state.ui.plannerMeals = imported.plannerMeals || imported.ui?.plannerMeals || [];
            state.ui.plannerExtras = imported.plannerExtras || imported.ui?.plannerExtras || [];
            state.ui.collapsedCategories = imported.collapsedCategories || imported.ui?.collapsedCategories || [];
            state.ui.collapsedMeals = imported.collapsedMeals || imported.ui?.collapsedMeals || {};
            state.ui.plannerIngredientChecks = imported.plannerIngredientChecks || imported.ui?.plannerIngredientChecks || {};
            state.ui.plannerIngredientComments = imported.plannerIngredientComments || imported.ui?.plannerIngredientComments || {};
            state.ui.plannerSubstituteSelections = imported.plannerSubstituteSelections || imported.ui?.plannerSubstituteSelections || {};
            state.ui.plannerMealMultipliers = imported.plannerMealMultipliers || imported.ui?.plannerMealMultipliers || {};

            // SAVE + RENDER
            await persistState();
            
            // Render app
            const { renderApp } = await import('../shared/ui.js');
            renderApp();

            alert("Data imported successfully!");
        } catch (err) {
            console.error(err);
            alert("There was an error importing the file.");
        }
    };

    reader.readAsText(file);
}

// ==============================
// EXPOSE TO WINDOW (TEMP)
// ==============================

export function setupExportImportGlobals() {
    window.exportAppData = exportAppData;
    window.importAppData = importAppData;
}
