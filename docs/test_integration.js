// ============================================================
// TEST KIT INTEGRATION FOR EXISTING APP
// Add this script to your HTML page after the main app.js
// ============================================================

// Test recipes data (compact version with 10 diverse recipes)
const TEST_RECIPES_DATA = [
    {
        name: "Classic Chicken Alfredo",
        category: "Medium Prep", 
        ingredients: [
            { name: "Chicken Breast", qty: 2, unit: "lbs", store: "Walmart", group: "protein", isDefault: true },
            { name: "Turkey Breast", qty: 2, unit: "lbs", store: "Walmart", group: "protein", isDefault: false },
            { name: "Fettuccine Pasta", qty: 1, unit: "box", store: "Aldi", group: "", isDefault: false },
            { name: "Heavy Cream", qty: 1, unit: "cup", store: "Walmart", group: "dairy", isDefault: true },
            { name: "Half and Half", qty: 1, unit: "cup", store: "Walmart", group: "dairy", isDefault: false },
            { name: "Parmesan Cheese", qty: 1, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Garlic", qty: 4, unit: "cloves", store: "Aldi", group: "", isDefault: false },
            { name: "Butter", qty: 4, unit: "tbsp", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "Beef Taco Bowl",
        category: "Low Prep",
        ingredients: [
            { name: "Ground Beef", qty: 1, unit: "lb", store: "Walmart", group: "meat", isDefault: true },
            { name: "Ground Turkey", qty: 1, unit: "lb", store: "Walmart", group: "meat", isDefault: false },
            { name: "Black Beans", qty: 1, unit: "can", store: "Aldi", group: "beans", isDefault: true },
            { name: "Pinto Beans", qty: 1, unit: "can", store: "Aldi", group: "beans", isDefault: false },
            { name: "White Rice", qty: 1, unit: "cup", store: "Aldi", group: "grain", isDefault: true },
            { name: "Brown Rice", qty: 1, unit: "cup", store: "Aldi", group: "grain", isDefault: false },
            { name: "Cheddar Cheese", qty: 1, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Lettuce", qty: 1, unit: "head", store: "Aldi", group: "", isDefault: false },
            { name: "Tomatoes", qty: 2, unit: "medium", store: "Aldi", group: "", isDefault: false },
            { name: "Taco Seasoning", qty: 1, unit: "packet", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "Breakfast Pancakes",
        category: "Breakfast",
        ingredients: [
            { name: "All Purpose Flour", qty: 2, unit: "cups", store: "Aldi", group: "flour", isDefault: true },
            { name: "Whole Wheat Flour", qty: 2, unit: "cups", store: "Aldi", group: "flour", isDefault: false },
            { name: "Whole Milk", qty: 1.5, unit: "cups", store: "Walmart", group: "milk", isDefault: true },
            { name: "Almond Milk", qty: 1.5, unit: "cups", store: "Walmart", group: "milk", isDefault: false },
            { name: "Eggs", qty: 2, unit: "large", store: "Walmart", group: "", isDefault: false },
            { name: "Baking Powder", qty: 2, unit: "tsp", store: "Aldi", group: "", isDefault: false },
            { name: "Sugar", qty: 2, unit: "tbsp", store: "Aldi", group: "", isDefault: false },
            { name: "Salt", qty: 1, unit: "tsp", store: "Aldi", group: "", isDefault: false },
            { name: "Butter", qty: 4, unit: "tbsp", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "Slow Cooker Chili",
        category: "Crock Pot",
        ingredients: [
            { name: "Ground Beef", qty: 2, unit: "lbs", store: "Walmart", group: "meat", isDefault: true },
            { name: "Ground Turkey", qty: 2, unit: "lbs", store: "Walmart", group: "meat", isDefault: false },
            { name: "Kidney Beans", qty: 2, unit: "cans", store: "Aldi", group: "beans", isDefault: true },
            { name: "Black Beans", qty: 2, unit: "cans", store: "Aldi", group: "beans", isDefault: false },
            { name: "Diced Tomatoes", qty: 2, unit: "cans", store: "Aldi", group: "", isDefault: false },
            { name: "Onion", qty: 1, unit: "large", store: "Aldi", group: "", isDefault: false },
            { name: "Bell Pepper", qty: 2, unit: "medium", store: "Aldi", group: "", isDefault: false },
            { name: "Chili Powder", qty: 2, unit: "tbsp", store: "Walmart", group: "", isDefault: false },
            { name: "Cumin", qty: 1, unit: "tbsp", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "BBQ Grilled Chicken",
        category: "Grilling",
        ingredients: [
            { name: "Chicken Thighs", qty: 8, unit: "pieces", store: "Walmart", group: "chicken", isDefault: true },
            { name: "Chicken Breast", qty: 4, unit: "pieces", store: "Walmart", group: "chicken", isDefault: false },
            { name: "BBQ Sauce", qty: 1, unit: "bottle", store: "Walmart", group: "sauce", isDefault: true },
            { name: "Honey Mustard", qty: 1, unit: "bottle", store: "Walmart", group: "sauce", isDefault: false },
            { name: "Olive Oil", qty: 3, unit: "tbsp", store: "Walmart", group: "", isDefault: false },
            { name: "Garlic Powder", qty: 1, unit: "tsp", store: "Walmart", group: "", isDefault: false },
            { name: "Paprika", qty: 1, unit: "tsp", store: "Walmart", group: "", isDefault: false },
            { name: "Salt", qty: 1, unit: "tsp", store: "Aldi", group: "", isDefault: false },
            { name: "Black Pepper", qty: 1, unit: "tsp", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Vegetable Stir Fry",
        category: "Medium Prep",
        ingredients: [
            { name: "Broccoli", qty: 2, unit: "cups", store: "Aldi", group: "vegetables", isDefault: true },
            { name: "Mixed Vegetables", qty: 2, unit: "cups", store: "Aldi", group: "vegetables", isDefault: false },
            { name: "Soy Sauce", qty: 3, unit: "tbsp", store: "Walmart", group: "sauce", isDefault: true },
            { name: "Teriyaki Sauce", qty: 3, unit: "tbsp", store: "Walmart", group: "sauce", isDefault: false },
            { name: "Jasmine Rice", qty: 2, unit: "cups", store: "Aldi", group: "rice", isDefault: true },
            { name: "Brown Rice", qty: 2, unit: "cups", store: "Aldi", group: "rice", isDefault: false },
            { name: "Carrots", qty: 2, unit: "large", store: "Aldi", group: "", isDefault: false },
            { name: "Snap Peas", qty: 1, unit: "cup", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Bacon Mac and Cheese",
        category: "High Prep / Longer Cook Times",
        ingredients: [
            { name: "Elbow Macaroni", qty: 1, unit: "box", store: "Aldi", group: "pasta", isDefault: true },
            { name: "Penne Pasta", qty: 1, unit: "box", store: "Aldi", group: "pasta", isDefault: false },
            { name: "Sharp Cheddar", qty: 2, unit: "cups", store: "Walmart", group: "cheese", isDefault: true },
            { name: "Mild Cheddar", qty: 2, unit: "cups", store: "Walmart", group: "cheese", isDefault: false },
            { name: "Bacon", qty: 6, unit: "strips", store: "Walmart", group: "meat", isDefault: true },
            { name: "Ham", qty: 1, unit: "cup", store: "Walmart", group: "meat", isDefault: false },
            { name: "Heavy Cream", qty: 1, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Butter", qty: 4, unit: "tbsp", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "Caprese Salad",
        category: "Sides",
        ingredients: [
            { name: "Fresh Mozzarella", qty: 8, unit: "oz", store: "Walmart", group: "cheese", isDefault: true },
            { name: "Burrata Cheese", qty: 8, unit: "oz", store: "Walmart", group: "cheese", isDefault: false },
            { name: "Tomatoes", qty: 4, unit: "large", store: "Aldi", group: "tomatoes", isDefault: true },
            { name: "Cherry Tomatoes", qty: 2, unit: "cups", store: "Aldi", group: "tomatoes", isDefault: false },
            { name: "Fresh Basil", qty: 1, unit: "bunch", store: "Aldi", group: "", isDefault: false },
            { name: "Balsamic Vinegar", qty: 2, unit: "tbsp", store: "Walmart", group: "", isDefault: false },
            { name: "Extra Virgin Olive Oil", qty: 2, unit: "tbsp", store: "Walmart", group: "", isDefault: false }
        ]
    },
    {
        name: "Spinach Artichoke Dip",
        category: "Appetizers",
        ingredients: [
            { name: "Frozen Spinach", qty: 1, unit: "box", store: "Walmart", group: "spinach", isDefault: true },
            { name: "Fresh Spinach", qty: 5, unit: "oz", store: "Aldi", group: "spinach", isDefault: false },
            { name: "Cream Cheese", qty: 8, unit: "oz", store: "Walmart", group: "cream", isDefault: true },
            { name: "Sour Cream", qty: 0.5, unit: "cup", store: "Walmart", group: "cream", isDefault: false },
            { name: "Artichoke Hearts", qty: 1, unit: "can", store: "Walmart", group: "", isDefault: false },
            { name: "Parmesan Cheese", qty: 0.5, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Mozzarella Cheese", qty: 0.5, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Garlic", qty: 3, unit: "cloves", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Banana Bread",
        category: "High Prep / Longer Cook Times",
        ingredients: [
            { name: "All Purpose Flour", qty: 2, unit: "cups", store: "Aldi", group: "flour", isDefault: true },
            { name: "Whole Wheat Flour", qty: 2, unit: "cups", store: "Aldi", group: "flour", isDefault: false },
            { name: "Ripe Bananas", qty: 4, unit: "large", store: "Aldi", group: "", isDefault: false },
            { name: "Sugar", qty: 0.75, unit: "cup", store: "Aldi", group: "sweetener", isDefault: true },
            { name: "Honey", qty: 0.75, unit: "cup", store: "Walmart", group: "sweetener", isDefault: false },
            { name: "Butter", qty: 6, unit: "tbsp", store: "Walmart", group: "fat", isDefault: true },
            { name: "Coconut Oil", qty: 6, unit: "tbsp", store: "Walmart", group: "fat", isDefault: false },
            { name: "Eggs", qty: 2, unit: "large", store: "Walmart", group: "", isDefault: false },
            { name: "Baking Soda", qty: 1, unit: "tsp", store: "Aldi", group: "", isDefault: false }
        ]
    }
];

// Main test function that runs everything
window.runQuickTests = async function() {
    console.log("🚀 Running Quick Test Suite");
    console.log("===========================");
    
    if (!window.state || !window.state.user || !window.state.user.id) {
        console.error("❌ Please sign in first!");
        alert("Please sign in to your account before running tests.");
        return;
    }
    
    console.log(`✅ User authenticated: ${window.state.user.email || window.state.user.id}`);
    
    try {
        // Clear existing data
        console.log("🗑️ Clearing existing data...");
        window.state.data.userMeals = [];
        window.state.ui.plannerMeals = [];
        window.state.ui.plannerExtras = [];
        window.state.ui.plannerSubstituteSelections = {};
        
        // Add first 5 test recipes
        console.log("📝 Adding 5 test recipes...");
        for (let i = 0; i < 5; i++) {
            const recipe = TEST_RECIPES_DATA[i];
            await addTestRecipe(recipe);
            console.log(`  ✅ Added: ${recipe.name}`);
        }
        
        // Add them all to the meal plan
        console.log("🍽️ Creating meal plan...");
        const allMealIds = window.state.data.userMeals.map(meal => meal.id);
        window.state.ui.plannerMeals = [...allMealIds];
        
        // Test substitutes
        console.log("🔄 Testing substitutes...");
        let substituteTested = 0;
        window.state.data.userMeals.forEach(meal => {
            const groups = {};
            meal.ingredients.forEach(ing => {
                if (ing.group && !groups[ing.group]) {
                    groups[ing.group] = ing;
                }
            });
            
            // Select non-default for each group
            Object.keys(groups).forEach(groupName => {
                const nonDefault = meal.ingredients.find(ing => 
                    ing.group === groupName && !ing.isDefault
                );
                if (nonDefault) {
                    if (!window.state.ui.plannerSubstituteSelections[meal.id]) {
                        window.state.ui.plannerSubstituteSelections[meal.id] = {};
                    }
                    window.state.ui.plannerSubstituteSelections[meal.id][groupName] = nonDefault.id;
                    substituteTested++;
                    console.log(`  🔄 ${meal.name}: Selected ${nonDefault.name} for ${groupName}`);
                }
            });
        });
        
        // Add some extra items
        console.log("➕ Adding extra items...");
        const extras = [
            { name: "Paper Towels", qty: 2, store: "Walmart" },
            { name: "Coffee", qty: 1, store: "Aldi" },
            { name: "Ice Cream", qty: 1, store: "Walmart" }
        ];
        
        if (!window.state.ui.plannerExtras) window.state.ui.plannerExtras = [];
        extras.forEach(item => {
            window.state.ui.plannerExtras.push({
                id: window.makeId(),
                name: item.name,
                qty: item.qty,
                unit: "CT",
                store: item.store
            });
        });
        console.log(`  ✅ Added ${extras.length} extra items`);
        
        // Save and render
        await window.persistState();
        window.renderApp();
        
        // Build grocery list
        console.log("🛒 Building grocery list...");
        if (window.switchTab) window.switchTab('groceryTab');
        if (window.renderGroceryList) window.renderGroceryList();
        
        // Print summary
        console.log("\n📊 TEST SUMMARY");
        console.log("===============");
        console.log(`✅ Recipes Added: 5`);
        console.log(`🔄 Substitutes Tested: ${substituteTested}`);
        console.log(`➕ Extra Items: ${extras.length}`);
        console.log(`📱 Firebase User: ${window.state.user.email || window.state.user.id}`);
        console.log(`✅ All tests completed successfully! 🎉`);
        
        alert("✅ Quick tests completed! Check the console for details.");
        
    } catch (error) {
        console.error("❌ Test failed:", error);
        alert(`❌ Test failed: ${error.message}`);
    }
};

// Helper function to add a single recipe
async function addTestRecipe(recipeData) {
    const ingredients = recipeData.ingredients.map(ing => ({
        id: window.makeId(),
        name: ing.name,
        qty: ing.qty,
        unit: ing.unit,
        store: ing.store,
        group: ing.group,
        isDefault: ing.isDefault
    }));

    const meal = {
        id: window.makeId(),
        name: recipeData.name,
        category: recipeData.category,
        ingredients: ingredients
    };

    if (!window.state.data.userMeals) window.state.data.userMeals = [];
    window.state.data.userMeals.push(meal);
    
    await window.persistState();
}

// Function to add all 10 recipes
window.addAllTestRecipes = async function() {
    if (!window.state || !window.state.user || !window.state.user.id) {
        alert("Please sign in first!");
        return;
    }
    
    console.log("📝 Adding all 10 test recipes...");
    
    try {
        for (let i = 0; i < TEST_RECIPES_DATA.length; i++) {
            const recipe = TEST_RECIPES_DATA[i];
            await addTestRecipe(recipe);
            console.log(`  ✅ Added: ${recipe.name}`);
        }
        
        window.renderApp();
        console.log("✅ All recipes added successfully!");
        alert(`✅ Added all ${TEST_RECIPES_DATA.length} test recipes!`);
        
    } catch (error) {
        console.error("❌ Failed to add recipes:", error);
        alert(`❌ Failed: ${error.message}`);
    }
};

// Function to create a full meal plan
window.createTestMealPlan = async function() {
    if (!window.state || !window.state.data.userMeals.length) {
        alert("No recipes found! Add recipes first.");
        return;
    }
    
    console.log("🍽️ Creating full meal plan...");
    
    try {
        // Add all meals to planner
        const allMealIds = window.state.data.userMeals.map(meal => meal.id);
        window.state.ui.plannerMeals = [...allMealIds];
        
        // Set random multipliers
        const multipliers = [1, 1, 2, 1, 3, 1, 2, 1, 1, 2];
        allMealIds.forEach((mealId, index) => {
            if (multipliers[index] > 1) {
                if (!window.state.ui.plannerMealMultipliers) {
                    window.state.ui.plannerMealMultipliers = {};
                }
                window.state.ui.plannerMealMultipliers[mealId] = multipliers[index];
            }
        });
        
        await window.persistState();
        window.renderApp();
        
        console.log(`✅ Added ${allMealIds.length} meals to planner`);
        alert(`✅ Created meal plan with ${allMealIds.length} meals!`);
        
    } catch (error) {
        console.error("❌ Failed to create meal plan:", error);
        alert(`❌ Failed: ${error.message}`);
    }
};

// Function to clear all test data
window.clearTestData = async function() {
    if (!window.state) return;
    
    if (confirm("⚠️ Clear all recipes and meal plan data?")) {
        console.log("🗑️ Clearing all data...");
        
        window.state.data.userMeals = [];
        window.state.ui.plannerMeals = [];
        window.state.ui.plannerExtras = [];
        window.state.ui.plannerSubstituteSelections = {};
        window.state.ui.plannerMealMultipliers = {};
        
        await window.persistState();
        window.renderApp();
        
        console.log("✅ Data cleared");
        alert("✅ All data cleared!");
    }
};

// Auto-add test button to the app if we're in the main page
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const recipesTab = document.querySelector('#recipesTab');
        if (recipesTab && !document.getElementById('testKitControls')) {
            const testControls = document.createElement('div');
            testControls.id = 'testKitControls';
            testControls.style.cssText = `
                background: #f0f8ff;
                border: 2px solid #007bff;
                border-radius: 12px;
                padding: 15px;
                margin: 15px 0;
            `;
            
            testControls.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: #007bff;">🧪 Test Kit</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="runQuickTests()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        🚀 Run Quick Tests
                    </button>
                    <button onclick="addAllTestRecipes()" style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        📝 Add All Recipes
                    </button>
                    <button onclick="createTestMealPlan()" style="background: #fd7e14; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        🍽️ Create Meal Plan
                    </button>
                    <button onclick="clearTestData()" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                        🗑️ Clear Data
                    </button>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #6c757d;">
                    Quick tests: 5 recipes + meal plan + grocery list. Or use individual buttons.
                </p>
            `;
            
            // Insert after the "Add Recipe" button
            const addBtn = recipesTab.querySelector('.add-recipe-btn');
            if (addBtn) {
                addBtn.parentNode.insertBefore(testControls, addBtn.nextSibling);
            }
        }
    }, 2000); // Wait for app to load
});

console.log("🧪 Test Kit Integration Loaded!");
console.log("Available functions:");
console.log("  runQuickTests() - Run 5 recipes + meal plan + grocery list");
console.log("  addAllTestRecipes() - Add all 10 test recipes");
console.log("  createTestMealPlan() - Create meal plan from existing recipes");
console.log("  clearTestData() - Clear all test data");
