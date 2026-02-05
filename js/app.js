// ==============================
// MAIN APP ENTRY POINT
// Bootstrap and initialization
// ==============================

import { loadIngredientIndex } from './ingredients/matching.js';
import { setupAuthHandlers } from './auth/handlers.js';
import { renderApp } from './shared/ui.js';
import { setupAllGlobals } from './setup-globals.js';
import { scheduleGroceryRebuild } from './utils/helpers.js';

// ==============================
// EXPOSE HELPER FOR INLINE USE
// ==============================
window.scheduleGroceryRebuild = (renderGroceryList) => scheduleGroceryRebuild(renderGroceryList);

// ==============================
// BOOTSTRAP
// ==============================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Meal Planner app starting...");
    
    // Setup all window.* global exports (for onclick handlers)
    setupAllGlobals();
    console.log("✅ Global exports ready");
    
    // Load ingredient index
    await loadIngredientIndex();
    console.log("✅ Ingredient index loaded");
    
    // Setup auth handlers (includes state listener)
    setupAuthHandlers(() => {
        // This callback runs when user is authenticated
        renderApp();
        console.log("✅ App rendered");
    });
    
    console.log("✅ App initialized successfully");
});

// ==============================
// GLOBAL ERROR HANDLER
// ==============================

window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
});

// ==============================
// DEBUG HELPERS (Browser Console)
// ==============================

import { state } from './state/state.js';
import { forceSave, clearFirestore } from './state/persistence.js';

window.debugState = () => {
    console.log("📊 Current state:", state);
    console.log("👤 User ID:", state.user.id);
    console.log("🍽️ Meals:", state.data.userMeals.length);
    console.log("☁️ Firestore enabled:", !!state.user.id);
    return state;
};

window.forceSave = forceSave;
window.clearFirestore = clearFirestore;

console.log("💡 Debug helpers available: debugState(), forceSave(), clearFirestore()");
