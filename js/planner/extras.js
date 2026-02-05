// "Other Items" management
import { state } from '../state/state.js';
import { getAllStores } from '../state/selectors.js';
import { persistState } from '../state/persistence.js';
import { makeId } from '../utils/helpers.js';
import { scheduleGroceryRebuild } from '../utils/helpers.js';

export function renderPlannerExtras() {
    const sel = document.getElementById("plannerExtraStore");
    if (sel) {
        const allStores = getAllStores();
        sel.innerHTML = allStores
            .map(s => `<option>${s.name}</option>`)
            .join("");
    }

    const list = document.getElementById("plannerExtrasList");
    if (!list) return;

    list.innerHTML = "";

    if (!state.ui.plannerExtras.length) {
        list.innerHTML = `<p class="small-note">No other items yet.</p>`;
        return;
    }

    state.ui.plannerExtras.forEach((item, idx) => {
        const row = document.createElement("div");
        row.className = "planner-extra-item";
        row.innerHTML = `
            <span>${item.name} (${item.qty}) – <em>${item.store}</em></span>
            <button class="danger" onclick="removePlannerExtra(${idx})">Remove</button>
        `;
        list.appendChild(row);
    });
}

export async function addPlannerExtra() {
    const nameEl = document.getElementById("plannerExtraInput");
    const qtyEl = document.getElementById("plannerExtraQty");
    const storeEl = document.getElementById("plannerExtraStore");

    const name = nameEl.value.trim();
    if (!name) return;

    const qty = Number(qtyEl.value) || 1;
    const store = storeEl.value || "";

    state.ui.plannerExtras.push({
        id: makeId(),
        name,
        qty,
        unit: "CT",
        store
    });

    await persistState();
    renderPlannerExtras();
    scheduleGroceryRebuild();

    nameEl.value = "";
    qtyEl.value = 1;
}

export async function removePlannerExtra(index) {
    state.ui.plannerExtras.splice(index, 1);
    await persistState();
    renderPlannerExtras();
    scheduleGroceryRebuild();
}

// EXPOSE TO WINDOW (TEMP)
export function setupPlannerExtrasGlobals() {
    window.addPlannerExtra = addPlannerExtra;
    window.removePlannerExtra = removePlannerExtra;
}
