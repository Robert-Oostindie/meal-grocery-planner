const DataService = {
    async saveMeals(meals) {
        state.data.userMeals = meals;
        await persistState();
    },

    async saveStores(stores) {
        state.data.userStores = stores;
        await persistState();
    },

    async saveCategories(categories) {
        state.data.userCategories = categories;
        await persistState();
    },

    getMeals() {
        return state.data.userMeals;
    },

    getStores() {
        return state.data.userStores;
    },

    getCategories() {
        return state.data.userCategories;
    }
};
