// Stores tab management
import { state } from '../state/state.js';
import { persistState } from '../state/persistence.js';
import { makeId } from '../utils/helpers.js';
import { GLOBAL_STORES } from '../config/constants.js';

export function renderStoresTab() {
    const globalDiv = document.getElementById("globalStoresList");
    const userDiv = document.getElementById("userStoresList");
    
    globalDiv.innerHTML = GLOBAL_STORES
        .map(store => `<div class="store-row">${store.name}</div>`)
        .join("");

    userDiv.innerHTML = (state.data.userStores || [])
        .map((s, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${s.name}</span>
                <button class="danger" onclick="removeUserStore(${idx})">Remove</button>
            </div>
        `)
        .join("");
}

export async function addUserStore() {
    const input = document.getElementById("newStoreName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userStores) state.data.userStores = [];

    state.data.userStores.push({
        id: makeId(),
        name
    });

    await persistState();
    input.value = "";
    renderStoresTab();
}

export async function removeUserStore(index) {
    if (!state.data.userStores) return;

    state.data.userStores.splice(index, 1);
    await persistState();
    renderStoresTab();
}

// EXPOSE TO WINDOW (TEMP)
export function setupStoresGlobals() {
    window.addUserStore = addUserStore;
    window.removeUserStore = removeUserStore;
}
