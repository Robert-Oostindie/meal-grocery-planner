// ==============================
// UTILITY HELPERS
// ID generation, debouncing, etc.
// ==============================

// ==============================
// ID GENERATION
// ==============================

export function makeId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'id-' + ([1e7]+-1e3+-4e3+-8e3+-1e11)
        .replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
}

// ==============================
// DEBOUNCED GROCERY REBUILD
// ==============================

export function scheduleGroceryRebuild(renderGroceryList) {
    clearTimeout(window._groceryDebounce);
    window._groceryDebounce = setTimeout(() => {
        const groceryTab = document.getElementById("groceryTab");
        if (groceryTab && groceryTab.classList.contains("active")) {
            // Import dynamically if renderGroceryList not provided
            if (!renderGroceryList) {
                import('../grocery/list.js').then(({ renderGroceryList: render }) => {
                    render();
                });
            } else {
                renderGroceryList();
            }
        }
    }, 250);
}
