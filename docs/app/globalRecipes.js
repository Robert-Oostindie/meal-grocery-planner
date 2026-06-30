// ============================================================
// GLOBAL RECIPES MODULE  (globalRecipes.js)
// Community recipe sharing — browse, publish, import, remove.
//
// Firestore structure:
//   globalRecipes/{id}
//     { name, category, ingredients[], userCount,
//       createdBy, createdByName, createdAt, updatedAt }
//
//   globalRecipes/{id}/users/{uid}
//     { importedAt, localMealId }
// ============================================================

import { db } from "./firebase.js";
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    getDoc,
    setDoc,
    deleteDoc,
    increment,
    query,
    orderBy,
    where,
    serverTimestamp,
    doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Module-level cache & UI state ─────────────────────────
let _cache = [];
let _loaded = false;
let _searchTerm = "";
let _sortBy = "popular"; // "popular" | "newest" | "az"

// ── Injected dependencies from app.js ─────────────────────
// We receive these via initGlobalRecipes() to avoid circular
// imports while still sharing app state and helpers.
let _state = null;
let _makeId = null;
let _persistState = null;
let _getAllStores = null;
let _renderRecipes = null;
let _renderPlanner = null;

/**
 * Must be called once from app.js after state is initialised.
 * Provides this module access to shared app internals.
 */
export function initGlobalRecipes({
    state,
    makeId,
    persistState,
    getAllStores,
    renderRecipes,
    renderPlanner
}) {
    _state = state;
    _makeId = makeId;
    _persistState = persistState;
    _getAllStores = getAllStores;
    _renderRecipes = renderRecipes;
    _renderPlanner = renderPlanner;
    console.log("✅ globalRecipes module initialised");
}

// ── INTERNAL: fetch from Firestore ────────────────────────
async function fetchGlobalRecipes() {
    try {
        const col = collection(db, "globalRecipes");
        const q = query(col, orderBy("userCount", "desc"));
        const snap = await getDocs(q);
        _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _loaded = true;
        console.log(`📦 Loaded ${_cache.length} global recipes`);
    } catch (err) {
        console.error("❌ fetchGlobalRecipes:", err);
        _cache = [];
    }
}

// ── INTERNAL: Set of globalRecipeIds user already holds ───
function _importedIds() {
    const ids = new Set();
    (_state?.data?.userMeals || []).forEach(m => {
        if (m.globalRecipeId) ids.add(m.globalRecipeId);
    });
    return ids;
}

// ── PUBLISH user recipe → global library ──────────────────
export async function publishToGlobal(mealId) {
    if (!_state?.user?.id) {
        alert("You must be signed in to share recipes.");
        return;
    }

    const meal = _state.data.userMeals.find(m => m.id === mealId);
    if (!meal) return;

    // Block sharing an imported recipe unless ingredients were modified.
    // If the meal came from a global recipe, compare ingredient names
    // against the source. Identical = no value added to the community.
    if (meal.globalRecipeId) {
        const source = _cache.find(r => r.id === meal.globalRecipeId);
        if (source) {
            const sourceNames = new Set((source.ingredients || []).map(i => i.name.toLowerCase().trim()));
            const mealNames = new Set((meal.ingredients || []).map(i => i.name.toLowerCase().trim()));
            const identical =
                sourceNames.size === mealNames.size &&
                [...mealNames].every(n => sourceNames.has(n));
            if (identical) {
                alert(
                    `"${meal.name}" was imported from Global Recipes and hasn't been modified.\n\n` +
                    `Add, remove, or change at least one ingredient before sharing your own version.`
                );
                return;
            }
        }
    }

    // Prevent same user publishing the same name twice
    const col = collection(db, "globalRecipes");
    const dupQ = query(
        col,
        where("name", "==", meal.name),
        where("createdBy", "==", _state.user.id)
    );
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
        alert(`"${meal.name}" is already in the Global Recipes library!`);
        return;
    }

    const confirmed = confirm(
        `Share "${meal.name}" with all users?\n\n` +
        `Ingredients will be visible publicly.\n` +
        `Store assignments will not be shared.`
    );
    if (!confirmed) return;

    try {
        // Publish store-neutral ingredients
        const publicIngredients = (meal.ingredients || []).map(ing => ({
            id: ing.id,
            name: ing.name,
            qty: ing.qty,
            unit: ing.unit,
            group: ing.group || "",
            isDefault: ing.isDefault || false
            // store intentionally omitted
        }));

        const newDoc = {
            name: meal.name,
            category: meal.category || "Uncategorized",
            ingredients: publicIngredients,
            instructions: meal.instructions || "",
            photoUrl: meal.photoUrl || null,
            userCount: 1,
            createdBy: _state.user.id,
            createdByName: _state.data.publicName || _state.user.name || _state.user.email || "Anonymous",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(col, newDoc);

        // Publisher counts as first user
        const userRef = doc(db, "globalRecipes", docRef.id, "users", _state.user.id);
        await setDoc(userRef, {
            importedAt: serverTimestamp(),
            localMealId: mealId,
            active: true
        });

        // Tag local meal with its global counterpart ID
        const mealIdx = _state.data.userMeals.findIndex(m => m.id === mealId);
        if (mealIdx !== -1) {
            _state.data.userMeals[mealIdx].globalRecipeId = docRef.id;
        }
        await _persistState();

        _loaded = false; // bust cache
        alert(`✅ "${meal.name}" is now in Global Recipes!`);
        _renderRecipes();
    } catch (err) {
        console.error("❌ publishToGlobal:", err);
        alert("Something went wrong publishing. Please try again.");
    }
}

// ── IMPORT global recipe → user's personal meals ──────────
export async function importGlobalRecipe(globalId) {
    if (!_state?.user?.id) {
        alert("You must be signed in to import recipes.");
        return;
    }

    // Local state is source of truth — if they already have it, stop here
    const alreadyInLocal = _state.data.userMeals.some(m => m.globalRecipeId === globalId);
    if (alreadyInLocal) {
        alert("You already have this recipe in your library!");
        return;
    }

    const recipe = _cache.find(r => r.id === globalId);
    if (!recipe) return;

    try {
        const defaultStore = _state.data.defaultStoreName || _getAllStores()[0]?.name || "";

        const localMeal = {
            id: _makeId(),
            name: recipe.name,
            category: recipe.category,
            globalRecipeId: globalId,
            instructions: recipe.instructions || "",
            photoUrl: recipe.photoUrl || null,
            ingredients: (recipe.ingredients || []).map(ing => ({
                ...ing,
                id: _makeId(),
                store: defaultStore
            }))
        };

        _state.data.userMeals.push(localMeal);
        await _persistState();

        // Check if this user has a tracking doc (possibly inactive from a prior removal)
        const userRef = doc(db, "globalRecipes", globalId, "users", _state.user.id);
        const userSnap = await getDoc(userRef);
        const wasActive = userSnap.exists() && userSnap.data()?.active === true;
        const hadDoc = userSnap.exists();

        // Write/update the tracking doc as active
        await setDoc(userRef, {
            importedAt: serverTimestamp(),
            localMealId: localMeal.id,
            active: true
        });

        // Increment if user wasn't already counted as active
        // (!hadDoc = brand new, !wasActive = previously removed and re-adding)
        if (!wasActive) {
            const globalRef = doc(db, "globalRecipes", globalId);
            await updateDoc(globalRef, { userCount: increment(1) });

            const cacheIdx = _cache.findIndex(r => r.id === globalId);
            if (cacheIdx !== -1) _cache[cacheIdx].userCount += 1;
        }

        _renderRecipes();
        _renderPlanner();
        renderGlobalRecipesTab();
    } catch (err) {
        console.error("❌ importGlobalRecipe:", err);
        alert("Something went wrong importing. Please try again.");
    }
}

// ── REMOVE user's import, decrement count ─────────────────
export async function removeGlobalImport(globalId) {
    if (!_state?.user?.id) return;

    try {
        // Remove local copy
        _state.data.userMeals = _state.data.userMeals.filter(
            m => m.globalRecipeId !== globalId
        );
        await _persistState();

        // Soft-delete: mark tracking doc inactive rather than deleting it.
        // This prevents the count inflating if the user re-adds later.
        const userRef = doc(db, "globalRecipes", globalId, "users", _state.user.id);
        await setDoc(userRef, { active: false }, { merge: true });

        // Decrement count, never below 0
        const globalRef = doc(db, "globalRecipes", globalId);
        const snap = await getDoc(globalRef);
        const current = snap.data()?.userCount || 0;
        if (current > 0) {
            await updateDoc(globalRef, { userCount: increment(-1) });
        }

        // Update local cache
        const cacheIdx = _cache.findIndex(r => r.id === globalId);
        if (cacheIdx !== -1) _cache[cacheIdx].userCount = Math.max(0, current - 1);

        _renderRecipes();
        _renderPlanner();
        renderGlobalRecipesTab();
    } catch (err) {
        console.error("❌ removeGlobalImport:", err);
        alert("Something went wrong. Please try again.");
    }
}

// ── DELETE recipe from Global entirely (owner only) ───────
export async function deleteFromGlobal(globalId) {
    if (!_state?.user?.id) return;

    const recipe = _cache.find(r => r.id === globalId);
    if (!recipe) return;

    // Only the creator can do this
    if (recipe.createdBy !== _state.user.id) {
        alert("Only the creator can delete a recipe from Global.");
        return;
    }

    const confirmed = confirm(
        `Permanently delete "${recipe.name}" from Global Recipes?\n\n` +
        `Other users who already imported it will keep their copy, ` +
        `but it will no longer appear in the Global list.`
    );
    if (!confirmed) return;

    try {
        const globalRef = doc(db, "globalRecipes", globalId);
        await deleteDoc(globalRef);

        // Remove from local cache
        _cache = _cache.filter(r => r.id !== globalId);

        // Also remove the globalRecipeId tag from the user's local copy
        // (the local recipe itself stays — user keeps it)
        _state.data.userMeals.forEach(m => {
            if (m.globalRecipeId === globalId) {
                delete m.globalRecipeId;
            }
        });
        await _persistState();

        _renderRecipes(); // refresh share button state
        renderGlobalRecipesTab();

        alert(`"${recipe.name}" has been removed from Global Recipes.`);
    } catch (err) {
        console.error("❌ deleteFromGlobal:", err);
        alert("Something went wrong. Please try again.");
    }
}
export async function renderGlobalRecipesTab() {
    const container = document.getElementById("globalRecipesContainer");
    if (!container) return;

    container.innerHTML = `<p style="color:#6b7280; padding:1rem 0;">Loading...</p>`;

    if (!_loaded) await fetchGlobalRecipes();

    container.innerHTML = "";

    // Apply search filter
    let recipes = [..._cache];
    if (_searchTerm) {
        const term = _searchTerm.toLowerCase();
        recipes = recipes.filter(r =>
            r.name.toLowerCase().includes(term) ||
            (r.category || "").toLowerCase().includes(term)
        );
    }

    // Apply sort
    if (_sortBy === "popular") {
        recipes.sort((a, b) => (b.userCount || 0) - (a.userCount || 0));
    } else if (_sortBy === "newest") {
        recipes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } else if (_sortBy === "az") {
        recipes.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (!recipes.length) {
        container.innerHTML = `
            <p style="color:#6b7280; margin-top:1rem;">
                ${_searchTerm
                    ? "No recipes match your search."
                    : "No global recipes yet — be the first to share one from your Recipes tab!"}
            </p>`;
        return;
    }

    const imported = _importedIds();

    recipes.forEach(recipe => {
        const alreadyImported = imported.has(recipe.id);
        const isOwn = recipe.createdBy === _state?.user?.id;
        const ingCount = recipe.ingredients?.length || 0;
        const ingLabel = ingCount === 1 ? "1 ingredient" : `${ingCount} ingredients`;
        const popLabel = (recipe.userCount || 0) === 1
            ? "1 person using this"
            : `${recipe.userCount || 0} people using this`;

        const card = document.createElement("div");
        card.className = "card";
        card.style.marginBottom = "0.75rem";

        const actionBtn = alreadyImported
            ? `<button class="danger" onclick="removeGlobalImport('${recipe.id}')" style="font-size:0.85rem;">
                   Remove from My Recipes
               </button>`
            : `<button class="primary" onclick="importGlobalRecipe('${recipe.id}')" style="font-size:0.85rem;">
                   + Add to My Recipes
               </button>`;

        // Owner gets a separate delete-from-global button
        const deleteGlobalBtn = isOwn
            ? `<button onclick="deleteFromGlobal('${recipe.id}')"
                style="font-size:0.8rem; color:#dc2626; background:none; border:1px solid #fca5a5; padding:0.2rem 0.6rem; border-radius:4px; cursor:pointer; margin-top:0.2rem;">
                   🗑 Delete from Global
               </button>`
            : "";

        const byLine = isOwn
            ? `<span style="font-size:0.75rem; color:#9ca3af; font-style:italic;">Shared by you</span>`
            : `<span style="font-size:0.75rem; color:#9ca3af;">by ${recipe.createdByName || "Anonymous"}</span>`;

        const hasInstructions = !!(recipe.instructions && recipe.instructions.trim());
        const instrBtn = hasInstructions
            ? `<button
                onclick="toggleGlobalRecipeInstructions('${recipe.id}')"
                style="font-size:0.8rem; color:#6b7280; background:none; border:1px solid #d1d5db; padding:0.2rem 0.6rem; border-radius:4px; cursor:pointer;">
                📋 Instructions
               </button>`
            : "";

        const photoHtml = recipe.photoUrl
            ? `<img src="${recipe.photoUrl}" alt="${recipe.name}"
                   style="width:140px; height:140px; object-fit:cover; border-radius:10px; flex-shrink:0;">`
            : "";

        card.innerHTML = `
            <div style="display:flex; gap:1rem; align-items:flex-start;">
                ${photoHtml}
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:600; font-size:1rem;">${recipe.name}</div>
                            <div style="font-size:0.85rem; color:#6b7280; margin-top:0.15rem;">
                                ${recipe.category || "Uncategorized"} &middot; ${ingLabel}
                            </div>
                            <div style="font-size:0.85rem; color:#059669; font-weight:500; margin-top:0.2rem;">
                                👥 ${popLabel}
                            </div>
                            ${byLine}
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end; flex-shrink:0;">
                            ${actionBtn}
                            <button
                                onclick="toggleGlobalRecipeIngredients('${recipe.id}')"
                                style="font-size:0.8rem; color:#6b7280; background:none; border:1px solid #d1d5db; padding:0.2rem 0.6rem; border-radius:4px; cursor:pointer;">
                                View Ingredients
                            </button>
                            ${instrBtn}
                            ${deleteGlobalBtn}
                        </div>
                    </div>
                </div>
            </div>
            <div id="globalIngredients_${recipe.id}"
                 style="display:none; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid #e5e7eb;">
                ${buildIngredientListHTML(recipe.ingredients || [])}
            </div>
            ${hasInstructions ? `
            <div id="globalInstructions_${recipe.id}"
                 style="display:none; margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid #e5e7eb; font-size:0.9rem; white-space:pre-line; color:#374151;">
                ${recipe.instructions.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </div>` : ""}
        `;
        container.appendChild(card);
    });
}

// ── Build grouped ingredient list HTML ────────────────────
// Groups substitutes together under a shared label,
// showing the default first and alternatives indented below.
function buildIngredientListHTML(ingredients) {
    // Separate into ungrouped and grouped
    const ungrouped = [];
    const groups = {}; // groupName → [ingredients]

    ingredients.forEach(ing => {
        if (ing.group) {
            if (!groups[ing.group]) groups[ing.group] = [];
            groups[ing.group].push(ing);
        } else {
            ungrouped.push(ing);
        }
    });

    let html = `<ul style="margin:0; padding-left:1.2rem; font-size:0.9rem; color:#374151; line-height:1.8; list-style:none;">`;

    // Render ungrouped ingredients normally
    ungrouped.forEach(ing => {
        const qty = ing.qty && ing.qty > 1 ? ` &mdash; ${ing.qty} ${ing.unit}` : "";
        html += `<li style="padding:0.1rem 0;">&#8226; ${ing.name}${qty}</li>`;
    });

    // Render each substitute group
    Object.entries(groups).forEach(([groupName, members]) => {
        // Default first, then the rest
        const defaultIng = members.find(i => i.isDefault) || members[0];
        const alternatives = members.filter(i => i.id !== defaultIng.id);

        const defaultQty = defaultIng.qty && defaultIng.qty > 1
            ? ` &mdash; ${defaultIng.qty} ${defaultIng.unit}` : "";

        // Default item with group label
        html += `
            <li style="padding:0.1rem 0;">
                &#8226; ${defaultIng.name}${defaultQty}
                <span style="font-size:0.75rem; background:#f3f4f6; color:#6b7280; border-radius:3px; padding:0.1rem 0.4rem; margin-left:0.4rem; vertical-align:middle;">
                    ${groupName}
                </span>
            </li>`;

        // Alternatives indented with "or" label
        alternatives.forEach(alt => {
            const altQty = alt.qty && alt.qty > 1 ? ` &mdash; ${alt.qty} ${alt.unit}` : "";
            html += `
                <li style="padding:0.05rem 0; padding-left:1.4rem; color:#6b7280;">
                    <span style="font-size:0.75rem; color:#9ca3af; margin-right:0.3rem; font-style:italic;">or</span>
                    ${alt.name}${altQty}
                </li>`;
        });
    });

    html += `</ul>`;
    return html;
}

// ── UI helpers exposed to window via app.js ───────────────

// Toggle one panel and close the other so only one is open at a time
export function toggleGlobalRecipeIngredients(recipeId) {
    const showEl = document.getElementById(`globalIngredients_${recipeId}`);
    const hideEl = document.getElementById(`globalInstructions_${recipeId}`);
    if (!showEl) return;
    const isOpen = showEl.style.display !== "none";
    if (hideEl) hideEl.style.display = "none";
    showEl.style.display = isOpen ? "none" : "block";
}

export function toggleGlobalRecipeInstructions(recipeId) {
    const showEl = document.getElementById(`globalInstructions_${recipeId}`);
    const hideEl = document.getElementById(`globalIngredients_${recipeId}`);
    if (!showEl) return;
    const isOpen = showEl.style.display !== "none";
    if (hideEl) hideEl.style.display = "none";
    showEl.style.display = isOpen ? "none" : "block";
}

export function setGlobalRecipesSearch(term) {
    _searchTerm = term;
    renderGlobalRecipesTab();
}

export function setGlobalRecipesSort(sortBy) {
    _sortBy = sortBy;
    renderGlobalRecipesTab();
}

export function refreshGlobalRecipes() {
    _loaded = false;
    renderGlobalRecipesTab();
}
