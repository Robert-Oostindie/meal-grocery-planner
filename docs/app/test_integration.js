// ============================================================
// ENHANCED TEST KIT INTEGRATION - 15 RECIPES + 3 STORES
// Add this script to your HTML page after the main app.js
// ============================================================

// Enhanced test recipes data with 15 diverse recipes across 3 stores
const TEST_RECIPES_DATA = [
    // Original 10 recipes
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
    },
    // NEW COMPLEX RECIPES
    {
        name: "Seafood Paella",
        category: "High Prep / Longer Cook Times",
        ingredients: [
            { name: "Arborio Rice", qty: 2, unit: "cups", store: "Target", group: "rice", isDefault: true },
            { name: "Bomba Rice", qty: 2, unit: "cups", store: "Target", group: "rice", isDefault: false },
            { name: "Shrimp", qty: 1, unit: "lb", store: "Walmart", group: "seafood", isDefault: true },
            { name: "Scallops", qty: 0.5, unit: "lb", store: "Walmart", group: "seafood", isDefault: false },
            { name: "Mussels", qty: 1, unit: "lb", store: "Walmart", group: "shellfish", isDefault: true },
            { name: "Clams", qty: 1, unit: "lb", store: "Walmart", group: "shellfish", isDefault: false },
            { name: "Chicken Stock", qty: 4, unit: "cups", store: "Target", group: "broth", isDefault: true },
            { name: "Seafood Stock", qty: 4, unit: "cups", store: "Target", group: "broth", isDefault: false },
            { name: "Saffron", qty: 1, unit: "pinch", store: "Target", group: "", isDefault: false },
            { name: "Bell Peppers", qty: 2, unit: "medium", store: "Aldi", group: "", isDefault: false },
            { name: "Peas", qty: 1, unit: "cup", store: "Aldi", group: "", isDefault: false },
            { name: "Garlic", qty: 6, unit: "cloves", store: "Aldi", group: "", isDefault: false },
            { name: "Tomatoes", qty: 2, unit: "large", store: "Aldi", group: "", isDefault: false },
            { name: "Olive Oil", qty: 4, unit: "tbsp", store: "Target", group: "", isDefault: false }
        ]
    },
    {
        name: "Thai Green Curry",
        category: "Medium Prep",
        ingredients: [
            { name: "Chicken Thighs", qty: 1.5, unit: "lbs", store: "Walmart", group: "protein", isDefault: true },
            { name: "Tofu", qty: 14, unit: "oz", store: "Target", group: "protein", isDefault: false },
            { name: "Green Curry Paste", qty: 3, unit: "tbsp", store: "Target", group: "curry", isDefault: true },
            { name: "Red Curry Paste", qty: 3, unit: "tbsp", store: "Target", group: "curry", isDefault: false },
            { name: "Coconut Milk", qty: 2, unit: "cans", store: "Target", group: "milk", isDefault: true },
            { name: "Coconut Cream", qty: 1, unit: "can", store: "Target", group: "milk", isDefault: false },
            { name: "Thai Basil", qty: 1, unit: "bunch", store: "Target", group: "herbs", isDefault: true },
            { name: "Regular Basil", qty: 1, unit: "bunch", store: "Aldi", group: "herbs", isDefault: false },
            { name: "Japanese Eggplant", qty: 2, unit: "medium", store: "Aldi", group: "vegetables", isDefault: true },
            { name: "Baby Eggplant", qty: 4, unit: "small", store: "Target", group: "vegetables", isDefault: false },
            { name: "Fish Sauce", qty: 2, unit: "tbsp", store: "Target", group: "", isDefault: false },
            { name: "Palm Sugar", qty: 1, unit: "tbsp", store: "Target", group: "", isDefault: false },
            { name: "Lime Juice", qty: 2, unit: "tbsp", store: "Aldi", group: "", isDefault: false },
            { name: "Jasmine Rice", qty: 2, unit: "cups", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Beef Bourguignon",
        category: "High Prep / Longer Cook Times",
        ingredients: [
            { name: "Beef Chuck Roast", qty: 3, unit: "lbs", store: "Walmart", group: "beef", isDefault: true },
            { name: "Beef Short Ribs", qty: 3, unit: "lbs", store: "Walmart", group: "beef", isDefault: false },
            { name: "Red Wine", qty: 1, unit: "bottle", store: "Target", group: "wine", isDefault: true },
            { name: "Port Wine", qty: 1, unit: "bottle", store: "Target", group: "wine", isDefault: false },
            { name: "Thick Cut Bacon", qty: 6, unit: "strips", store: "Walmart", group: "pork", isDefault: true },
            { name: "Pancetta", qty: 4, unit: "oz", store: "Target", group: "pork", isDefault: false },
            { name: "Pearl Onions", qty: 1, unit: "bag", store: "Target", group: "onions", isDefault: true },
            { name: "Shallots", qty: 6, unit: "medium", store: "Target", group: "onions", isDefault: false },
            { name: "Cremini Mushrooms", qty: 1, unit: "lb", store: "Aldi", group: "mushrooms", isDefault: true },
            { name: "Shiitake Mushrooms", qty: 8, unit: "oz", store: "Target", group: "mushrooms", isDefault: false },
            { name: "Beef Stock", qty: 3, unit: "cups", store: "Target", group: "", isDefault: false },
            { name: "Tomato Paste", qty: 2, unit: "tbsp", store: "Aldi", group: "", isDefault: false },
            { name: "Fresh Thyme", qty: 4, unit: "sprigs", store: "Target", group: "", isDefault: false },
            { name: "Bay Leaves", qty: 2, unit: "leaves", store: "Target", group: "", isDefault: false },
            { name: "All Purpose Flour", qty: 3, unit: "tbsp", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Homemade Ramen",
        category: "High Prep / Longer Cook Times", 
        ingredients: [
            { name: "Pork Shoulder", qty: 2, unit: "lbs", store: "Walmart", group: "protein", isDefault: true },
            { name: "Chicken Thighs", qty: 1.5, unit: "lbs", store: "Walmart", group: "protein", isDefault: false },
            { name: "Fresh Ramen Noodles", qty: 4, unit: "portions", store: "Target", group: "noodles", isDefault: true },
            { name: "Dried Ramen Noodles", qty: 4, unit: "portions", store: "Target", group: "noodles", isDefault: false },
            { name: "White Miso Paste", qty: 3, unit: "tbsp", store: "Target", group: "miso", isDefault: true },
            { name: "Red Miso Paste", qty: 3, unit: "tbsp", store: "Target", group: "miso", isDefault: false },
            { name: "Soft Boiled Eggs", qty: 4, unit: "large", store: "Walmart", group: "eggs", isDefault: true },
            { name: "Marinated Eggs", qty: 4, unit: "large", store: "Target", group: "eggs", isDefault: false },
            { name: "Nori Sheets", qty: 4, unit: "sheets", store: "Target", group: "", isDefault: false },
            { name: "Green Onions", qty: 4, unit: "stalks", store: "Aldi", group: "", isDefault: false },
            { name: "Bean Sprouts", qty: 2, unit: "cups", store: "Target", group: "", isDefault: false },
            { name: "Corn", qty: 1, unit: "cup", store: "Aldi", group: "", isDefault: false },
            { name: "Sesame Oil", qty: 1, unit: "tbsp", store: "Target", group: "", isDefault: false },
            { name: "Garlic", qty: 6, unit: "cloves", store: "Aldi", group: "", isDefault: false },
            { name: "Ginger", qty: 2, unit: "inch", store: "Aldi", group: "", isDefault: false }
        ]
    },
    {
        name: "Chocolate Lava Cake",
        category: "High Prep / Longer Cook Times",
        ingredients: [
            { name: "Dark Chocolate", qty: 8, unit: "oz", store: "Target", group: "chocolate", isDefault: true },
            { name: "Semi Sweet Chocolate", qty: 8, unit: "oz", store: "Target", group: "chocolate", isDefault: false },
            { name: "European Butter", qty: 6, unit: "tbsp", store: "Target", group: "butter", isDefault: true },
            { name: "Regular Butter", qty: 6, unit: "tbsp", store: "Walmart", group: "butter", isDefault: false },
            { name: "Large Eggs", qty: 2, unit: "whole", store: "Walmart", group: "eggs", isDefault: true },
            { name: "Extra Large Eggs", qty: 2, unit: "whole", store: "Target", group: "eggs", isDefault: false },
            { name: "Egg Yolks", qty: 2, unit: "yolks", store: "Walmart", group: "", isDefault: false },
            { name: "Granulated Sugar", qty: 0.25, unit: "cup", store: "Aldi", group: "sugar", isDefault: true },
            { name: "Superfine Sugar", qty: 0.25, unit: "cup", store: "Target", group: "sugar", isDefault: false },
            { name: "All Purpose Flour", qty: 2, unit: "tbsp", store: "Aldi", group: "flour", isDefault: true },
            { name: "Cake Flour", qty: 2, unit: "tbsp", store: "Target", group: "flour", isDefault: false },
            { name: "Vanilla Extract", qty: 1, unit: "tsp", store: "Aldi", group: "", isDefault: false },
            { name: "Heavy Cream", qty: 0.5, unit: "cup", store: "Walmart", group: "", isDefault: false },
            { name: "Powdered Sugar", qty: 2, unit: "tbsp", store: "Aldi", group: "", isDefault: false },
            { name: "Fresh Berries", qty: 1, unit: "cup", store: "Aldi", group: "", isDefault: false }
        ]
    }
];

// Main test function - Quick 5 recipes
window.runQuickTests = async function() {
    console.log("🚀 Running Quick Test Suite (5 recipes)");
    console.log("=".repeat(45));
    
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

// Comprehensive test function with all 15 recipes
window.runFullTestSuite = async function() {
    console.log("🚀 Running FULL Test Suite (All 15 Recipes)");
    console.log("=".repeat(50));
    
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
        
        // Add ALL 15 test recipes
        console.log("📝 Adding all 15 test recipes...");
        for (let i = 0; i < TEST_RECIPES_DATA.length; i++) {
            const recipe = TEST_RECIPES_DATA[i];
            await addTestRecipe(recipe);
            console.log(`  ✅ Added: ${recipe.name}`);
        }
        
        // Add them all to the meal plan
        console.log("🍽️ Creating comprehensive meal plan...");
        const allMealIds = window.state.data.userMeals.map(meal => meal.id);
        window.state.ui.plannerMeals = [...allMealIds];
        
        // Set varied multipliers for testing
        const multipliers = [1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1]; // 15 values
        allMealIds.forEach((mealId, index) => {
            if (multipliers[index] > 1) {
                if (!window.state.ui.plannerMealMultipliers) {
                    window.state.ui.plannerMealMultipliers = {};
                }
                window.state.ui.plannerMealMultipliers[mealId] = multipliers[index];
            }
        });
        
        // Test extensive substitutes
        console.log("🔄 Testing advanced substitutes...");
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
        
        // Add extensive extra items
        console.log("➕ Adding premium extra items...");
        const extras = [
            { name: "Paper Towels", qty: 3, store: "Walmart" },
            { name: "Laundry Detergent", qty: 1, store: "Target" },
            { name: "Premium Coffee", qty: 1, store: "Target" },
            { name: "Organic Ice Cream", qty: 2, store: "Target" },
            { name: "Aluminum Foil", qty: 1, store: "Aldi" },
            { name: "Wine Glasses", qty: 4, store: "Target" }
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
        console.log(`  ✅ Added ${extras.length} premium extra items`);
        
        // Save and render
        await window.persistState();
        window.renderApp();
        
        // Build comprehensive grocery list
        console.log("🛒 Building comprehensive grocery list...");
        if (window.switchTab) window.switchTab('groceryTab');
        if (window.renderGroceryList) window.renderGroceryList();
        
        // Print comprehensive summary
        console.log("\n📊 COMPREHENSIVE TEST SUMMARY");
        console.log("=".repeat(35));
        console.log(`✅ Recipes Added: ${TEST_RECIPES_DATA.length}`);
        console.log(`🏪 Stores Used: 3 (Walmart, Aldi, Target)`);
        console.log(`🔄 Substitutes Tested: ${substituteTested}`);
        console.log(`➕ Extra Items: ${extras.length}`);
        console.log(`📱 Firebase User: ${window.state.user.email || window.state.user.id}`);
        console.log(`🍽️ New Complex Recipes:`);
        console.log(`   • Seafood Paella (14 ingredients)`);
        console.log(`   • Thai Green Curry (14 ingredients)`);
        console.log(`   • Beef Bourguignon (15 ingredients)`);
        console.log(`   • Homemade Ramen (15 ingredients)`);
        console.log(`   • Chocolate Lava Cake (15 ingredients)`);
        console.log(`✅ Full test suite completed successfully! 🎉`);
        
        alert(`✅ Full test suite completed! Added ${TEST_RECIPES_DATA.length} recipes across 3 stores. Check the grocery list!`);
        
    } catch (error) {
        console.error("❌ Full test failed:", error);
        alert(`❌ Full test failed: ${error.message}`);
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

// Function to add all 15 recipes
window.addAllTestRecipes = async function() {
    if (!window.state || !window.state.user || !window.state.user.id) {
        alert("Please sign in first!");
        return;
    }
    
    console.log("📝 Adding all 15 test recipes...");
    
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
        const multipliers = [1, 1, 2, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1, 1];
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

// Auto-add enhanced test buttons to the app
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
                <h4 style="margin: 0 0 10px 0; color: #007bff;">🧪 Enhanced Test Kit (15 Recipes • 3 Stores)</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                    <button onclick="runQuickTests()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        🚀 Quick Tests (5 recipes)
                    </button>
                    <button onclick="runFullTestSuite()" style="background: #6f42c1; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        🔥 Full Suite (15 recipes)
                    </button>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="addAllTestRecipes()" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        📝 Add All Recipes
                    </button>
                    <button onclick="createTestMealPlan()" style="background: #fd7e14; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        🍽️ Create Meal Plan
                    </button>
                    <button onclick="clearTestData()" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        🗑️ Clear Data
                    </button>
                </div>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #6c757d; line-height: 1.3;">
                    <strong>Quick:</strong> 5 recipes • <strong>Full:</strong> 15 recipes with complex dishes (Seafood Paella, Thai Curry, Beef Bourguignon, Ramen, Lava Cake)
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

console.log("🧪 Enhanced Test Kit Integration Loaded!");
console.log("📊 Available: 15 test recipes across 3 stores (Walmart, Aldi, Target)");
console.log("🍽️ New complex recipes: Seafood Paella, Thai Green Curry, Beef Bourguignon, Homemade Ramen, Chocolate Lava Cake");
console.log("Available functions:");
console.log("  runQuickTests() - Run 5 recipes + meal plan + grocery list");
console.log("  runFullTestSuite() - Run all 15 recipes + complete workflow");
console.log("  addAllTestRecipes() - Add all 15 test recipes");
console.log("  createTestMealPlan() - Create meal plan from existing recipes");
console.log("  clearTestData() - Clear all test data");
