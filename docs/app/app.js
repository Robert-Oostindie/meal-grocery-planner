// ==============================
// FIREBASE IMPORTS - ALL v10.7.1
// ==============================
import { auth, db, googleProvider, storage } from "./firebase.js";

// Always show the Google account chooser — prevents auto sign-in
// with the last used account, which is confusing especially in incognito
googleProvider.setCustomParameters({ prompt: "select_account" });
import { 
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  getRedirectResult,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
        ref as storageRef,
        uploadBytes,
        getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import {
    initGlobalRecipes,
    publishToGlobal,
    importGlobalRecipe,
    removeGlobalImport,
    deleteFromGlobal,
    renderGlobalRecipesTab,
    toggleGlobalRecipeIngredients,
    toggleGlobalRecipeInstructions,
    setGlobalRecipesSearch,
    setGlobalRecipesSort,
    refreshGlobalRecipes
} from "./globalRecipes.js";

import {
    openPhotoImportModal,
    closePhotoImportModal,
    handleIngredientPhotosSelected,
    handleInstructionPhotosSelected,
    toggleSplitInstructions,
    removePhoto,
    importRecipeFromPhoto
} from "./photoImport.js";

// ==============================
// DOM ELEMENTS
// ==============================
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');
const googleSignInBtn = document.getElementById('googleSignInBtn');
// (sign out handled via account dropdown menu)
const userPhoto = document.getElementById('userPhoto');
const userName = document.getElementById('userName');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const signInEmailBtn = document.getElementById('signInEmailBtn');
const signUpEmailBtn = document.getElementById('signUpEmailBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const authError = document.getElementById('authError');

// Prevents onAuthStateChanged(null) from hiding the app when
// the null event is caused by account deletion rather than a real sign-out
let _suppressNextSignOut = false;
const verificationMessage = document.getElementById('verificationMessage');
const verificationEmail = document.getElementById('verificationEmail');
const resendVerificationBtn = document.getElementById('resendVerificationBtn');
const backToSignInBtn = document.getElementById('backToSignInBtn');
const emailAuthForm = document.getElementById('emailAuthForm');


// ==============================
// GOOGLE SIGN-IN
// ==============================
googleSignInBtn.addEventListener('click', async () => {
    try {
        googleSignInBtn.classList.add('loading');
        googleSignInBtn.textContent = 'Signing in...';
        
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ Google sign-in successful:', result.user.uid);
    } catch (error) {
        console.error('❌ Google sign-in error:', error);
        alert('Sign-in failed. Please try again.');
        googleSignInBtn.classList.remove('loading');
        // Reset button text
    }
});

// ==============================
// HELPER: Show Error Message
// ==============================
function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        authError.classList.add('hidden');
    }, 5000);
}

function clearAuthError() {
    authError.classList.add('hidden');
}

// ==============================
// HELPER: Show Verification Message
// ==============================
function showVerificationMessage(email) {
    emailAuthForm.classList.add('hidden');
    verificationMessage.classList.remove('hidden');
    verificationEmail.textContent = email;
}

function hideVerificationMessage() {
    emailAuthForm.classList.remove('hidden');
    verificationMessage.classList.add('hidden');
}

// ==============================
// EMAIL SIGN-UP
// ==============================
signUpEmailBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    
    // Validation
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
    }
    
    try {
        signUpEmailBtn.classList.add('loading');
        signUpEmailBtn.disabled = true;
        clearAuthError();
        
        console.log('📝 Creating account for:', email);
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Account created:', user.uid);
        
        // Send verification email
        await sendEmailVerification(user);
        console.log('📧 Verification email sent');
        
        // Show verification message
        showVerificationMessage(email);
        
        // Sign out until they verify
        await signOut(auth);
        
    } catch (error) {
        console.error('❌ Sign-up error:', error);
        
        // Handle specific errors
        switch (error.code) {
            case 'auth/email-already-in-use':
                showAuthError('This email is already registered. Please sign in instead.');
                break;
            case 'auth/invalid-email':
                showAuthError('Invalid email address');
                break;
            case 'auth/weak-password':
                showAuthError('Password is too weak. Use at least 6 characters.');
                break;
            default:
                showAuthError('Sign-up failed. Please try again.');
        }
    } finally {
        signUpEmailBtn.classList.remove('loading');
        signUpEmailBtn.disabled = false;
    }
});

// ==============================
// EMAIL SIGN-IN
// ==============================
signInEmailBtn.addEventListener('click', async () => {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    
    // Validation
    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }
    
    try {
        signInEmailBtn.classList.add('loading');
        signInEmailBtn.disabled = true;
        clearAuthError();
        
        console.log('🔑 Signing in:', email);
        
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('✅ Signed in:', user.uid);
        
        // Check if email is verified
        if (!user.emailVerified) {
            console.log('⚠️ Email not verified');
            showAuthError('Please verify your email before signing in. Check your inbox.');
            await signOut(auth);
            return;
        }
        
        console.log('✅ Email verified, loading app...');
        
        // onAuthStateChanged will handle the rest
        
    } catch (error) {
        console.error('❌ Sign-in error:', error);
        
        // Handle specific errors
        switch (error.code) {
            case 'auth/user-not-found':
                showAuthError('No account found with this email. Please sign up first.');
                break;
            case 'auth/wrong-password':
                showAuthError('Incorrect password. Please try again.');
                break;
            case 'auth/invalid-email':
                showAuthError('Invalid email address');
                break;
            case 'auth/too-many-requests':
                showAuthError('Too many failed attempts. Please try again later.');
                break;
            default:
                showAuthError('Sign-in failed. Please try again.');
        }
    } finally {
        signInEmailBtn.classList.remove('loading');
        signInEmailBtn.disabled = false;
    }
});

// ==============================
// FORGOT PASSWORD
// ==============================
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = authEmail.value.trim();
    
    if (!email) {
        showAuthError('Please enter your email address first');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthError('Password reset email sent! Check your inbox.');
        authError.style.background = '#f0fdf4';
        authError.style.borderColor = '#86efac';
        authError.style.color = '#166534';
        
        console.log('📧 Password reset email sent to:', email);
    } catch (error) {
        console.error('❌ Password reset error:', error);
        
        switch (error.code) {
            case 'auth/user-not-found':
                showAuthError('No account found with this email');
                break;
            case 'auth/invalid-email':
                showAuthError('Invalid email address');
                break;
            default:
                showAuthError('Failed to send reset email. Please try again.');
        }
    }
});

// ==============================
// RESEND VERIFICATION EMAIL
// ==============================
resendVerificationBtn.addEventListener('click', async () => {
    const email = verificationEmail.textContent;
    
    try {
        resendVerificationBtn.classList.add('loading');
        resendVerificationBtn.disabled = true;
        
        // Need to sign in temporarily to resend
        const password = authPassword.value;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        
        alert('Verification email sent again! Check your inbox.');
        
        console.log('📧 Verification email resent');
    } catch (error) {
        console.error('❌ Resend error:', error);
        alert('Failed to resend email. Please try again.');
    } finally {
        resendVerificationBtn.classList.remove('loading');
        resendVerificationBtn.disabled = false;
    }
});

// ==============================
// BACK TO SIGN IN
// ==============================
backToSignInBtn.addEventListener('click', () => {
    hideVerificationMessage();
    authPassword.value = '';
    clearAuthError();
});

// ==============================
// UPDATE AUTH STATE LISTENER
// Replace your existing onAuthStateChanged with this version
// ==============================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('✅ User signed in:', user.uid);
        console.log('👤 User email:', user.email);
        console.log('📧 Display name:', user.displayName);
        console.log('✉️ Email verified:', user.emailVerified);
        
        // If email user is not verified, sign them out
        if (user.email && !user.emailVerified) {
            console.log('⚠️ Email not verified, blocking access');
            await signOut(auth);
            showAuthError('Please verify your email before signing in');
            return;
        }
        
        // Update UI with user info
        userName.textContent = user.displayName || user.email || 'User';
        userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName.textContent);
        
        // Save user info to state
        state.user.id = user.uid;
        state.user.email = user.email;
        state.user.name = user.displayName;
        state.user.createdAt = new Date().toISOString();
        state.user.lastLogin = new Date().toISOString();
        
        // Load user's data from Firestore
        await loadUserState(user.uid);
        
        // Show app, hide auth screen
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Render the app
        renderApp();
        
        console.log('✅ App ready!');
    } else {
        console.log('❌ No user signed in');
        
        // Show auth screen, hide app
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});
// ==============================
// ACCOUNT DROPDOWN MENU
// ==============================
function toggleAccountMenu() {
    const menu = document.getElementById("accountMenu");
    const overlay = document.getElementById("accountMenuOverlay");
    const isHidden = menu.classList.contains("hidden");

    if (isHidden) {
        // Populate name/email before showing
        document.getElementById("menuPublicName").textContent =
            state.data.publicName || state.user.name || "No public name set";
        document.getElementById("menuEmail").textContent =
            state.user.email || "";
        menu.classList.remove("hidden");
        overlay.classList.remove("hidden");
    } else {
        closeAccountMenu();
    }
}

function closeAccountMenu() {
    document.getElementById("accountMenu").classList.add("hidden");
    document.getElementById("accountMenuOverlay").classList.add("hidden");
}

function signOutFromMenu() {
    closeAccountMenu();
    signOut(auth).then(() => {
        authScreen.classList.remove("hidden");
        mainApp.classList.add("hidden");
    }).catch(err => console.error("❌ Sign-out error:", err));
}

// ==============================
// ACCOUNT SETTINGS MODAL
// ==============================
function openAccountSettings() {
    closeAccountMenu();

    // Populate fields
    document.getElementById("settingsPublicName").value = state.data.publicName || "";
    document.getElementById("settingsEmail").textContent = state.user.email || "—";
    document.getElementById("settingsNameError").classList.add("hidden");
    document.getElementById("settingsNameSuccess").style.display = "none";

    // Populate store dropdown
    const storeSelect = document.getElementById("settingsDefaultStore");
    const allStores = getAllStores();
    storeSelect.innerHTML = allStores.map(s => `
        <option value="${s.name}" ${state.data.defaultStoreName === s.name ? "selected" : ""}>
            ${s.name}
        </option>
    `).join("");

    document.getElementById("accountSettingsModal").classList.remove("hidden");
}

function closeAccountSettings() {
    document.getElementById("accountSettingsModal").classList.add("hidden");
}

async function savePublicName() {
    const input = document.getElementById("settingsPublicName");
    const errorEl = document.getElementById("settingsNameError");
    const successEl = document.getElementById("settingsNameSuccess");
    const name = input.value.trim();

    errorEl.classList.add("hidden");
    successEl.style.display = "none";

    if (!name || name.length < 2) {
        errorEl.textContent = "Name must be at least 2 characters.";
        errorEl.classList.remove("hidden");
        return;
    }
    if (!/^[a-zA-Z0-9 _'-]+$/.test(name)) {
        errorEl.textContent = "Only letters, numbers, spaces, and ' _ - are allowed.";
        errorEl.classList.remove("hidden");
        return;
    }
    if (name === state.data.publicName) {
        successEl.textContent = "✅ That's already your public name!";
        successEl.style.display = "block";
        return;
    }

    // Check uniqueness
    const nameKey = name.toLowerCase().trim();
    const nameRef = doc(db, "publicNames", nameKey);
    const nameSnap = await getDoc(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== state.user.id) {
        errorEl.textContent = `"${name}" is already taken.`;
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        // Release old name
        if (state.data.publicName) {
            const oldKey = state.data.publicName.toLowerCase().trim();
            await deleteDoc(doc(db, "publicNames", oldKey));
        }

        // Claim new name
        await setDoc(nameRef, {
            uid: state.user.id,
            displayName: name,
            createdAt: serverTimestamp()
        });

        state.data.publicName = name;
        await persistState();

        successEl.textContent = "✅ Public name updated!";
        successEl.style.display = "block";

        // Update the top nav display name
        document.getElementById("userName").textContent = name;

    } catch (err) {
        console.error("❌ savePublicName:", err);
        errorEl.textContent = "Something went wrong. Please try again.";
        errorEl.classList.remove("hidden");
    }
}

async function saveDefaultStore(storeName) {
    state.data.defaultStoreName = storeName;
    await persistState();
}

window.toggleAccountMenu = toggleAccountMenu;
window.closeAccountMenu = closeAccountMenu;
window.signOutFromMenu = signOutFromMenu;
window.openAccountSettings = openAccountSettings;
window.closeAccountSettings = closeAccountSettings;
window.savePublicName = savePublicName;
window.saveDefaultStore = saveDefaultStore;

// ==============================
// DELETE ACCOUNT
// ==============================
function deleteAccount() {
    closeAccountMenu();
    document.getElementById("deleteConfirmInput").value = "";
    document.getElementById("deleteInputError").classList.add("hidden");
    document.getElementById("confirmDeleteBtn").disabled = true;
    document.getElementById("confirmDeleteBtn").style.opacity = "0.4";
    document.getElementById("confirmDeleteBtn").style.cursor = "not-allowed";
    document.getElementById("deleteAccountModal").classList.remove("hidden");
}

function closeDeleteAccountModal() {
    document.getElementById("deleteAccountModal").classList.add("hidden");
}

function validateDeleteInput() {
    const val = document.getElementById("deleteConfirmInput").value.trim().toUpperCase();
    const btn = document.getElementById("confirmDeleteBtn");
    const ready = val === "DELETE";
    btn.disabled = !ready;
    btn.style.opacity = ready ? "1" : "0.4";
    btn.style.cursor = ready ? "pointer" : "not-allowed";
}

// All deletion work runs directly from this button click handler —
// no intervening confirm()/prompt() dialogs so Firebase session stays fresh
async function confirmDeleteAccount() {
    const val = document.getElementById("deleteConfirmInput").value.trim().toUpperCase();
    if (val !== "DELETE") return;

    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById("confirmDeleteBtn");
    btn.disabled = true;
    btn.textContent = "Deleting...";

    // Reset in-memory state immediately so if another account signs in
    // during the async deletion steps, it gets a clean slate
    resetState();

    try {
        const provider = user.providerData?.[0]?.providerId;

        // ── Step 1: Firestore cleanup (no re-auth needed) ──────
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            "appState.data.publicName": null,
            deletedAt:    serverTimestamp(),
            isDeleted:    true,
            authProvider: provider || "unknown",
        });
        console.log("✅ Firestore doc soft-deleted");

        if (state.data.publicName) {
            const nameKey = state.data.publicName.toLowerCase().trim();
            await deleteDoc(doc(db, "publicNames", nameKey));
            console.log("✅ Public name released");
        }

        // ── Decrement global recipe counts for this user ───────
        // Mark all their tracking docs inactive and decrement userCount
        // so counts stay accurate when the uid is re-used by a new account
        try {
            const globalRecipesSnap = await getDocs(collection(db, "globalRecipes"));
            for (const globalDoc of globalRecipesSnap.docs) {
                const trackingRef = doc(db, "globalRecipes", globalDoc.id, "users", user.uid);
                const trackingSnap = await getDoc(trackingRef);
                if (trackingSnap.exists() && trackingSnap.data()?.active === true) {
                    await setDoc(trackingRef, { active: false }, { merge: true });
                    const current = globalDoc.data()?.userCount || 0;
                    if (current > 0) {
                        await updateDoc(doc(db, "globalRecipes", globalDoc.id), {
                            userCount: increment(-1)
                        });
                    }
                }
            }
            console.log("✅ Global recipe counts decremented");
        } catch (e) {
            console.warn("⚠️ Could not clean up global recipe counts:", e);
            // Non-fatal — continue with deletion
        }

        // ── Step 2: Delete Firebase Auth account ──────────────
        // Running directly from a button click keeps the session fresh,
        // so requires-recent-login should not occur in normal usage.
        try {
            _suppressNextSignOut = true; // don't let the null event kick out any current user
            await deleteUser(user);
            console.log("✅ Auth account deleted");
        } catch (authErr) {
            if (authErr.code !== "auth/requires-recent-login") throw authErr;

            // Rare edge case: session genuinely too old (hours of inactivity)
            // Firestore is already wiped. Try Google popup re-auth.
            console.log("🔄 Re-auth required (stale session)");
            if (provider === "google.com") {
                localStorage.setItem("pendingAuthDelete", user.uid);
                try {
                    await reauthenticateWithPopup(user, googleProvider);
                    await deleteUser(user);
                    console.log("✅ Auth account deleted after re-auth");
                } catch (popupErr) {
                    if (popupErr.code === "auth/popup-blocked") {
                        localStorage.setItem("pendingAuthDelete", user.uid);
                        await reauthenticateWithRedirect(user, googleProvider);
                        return;
                    }
                    localStorage.removeItem("pendingAuthDelete");
                    // Data is wiped — just sign them out cleanly
                }
            } else {
                localStorage.setItem("pendingAuthDelete", user.uid);
            }
            // Sign out — if pendingAuthDelete is set, next sign-in finishes it
            await signOut(auth);
            document.getElementById("deleteAccountModal").classList.add("hidden");
            if (!auth.currentUser) {
                authScreen.classList.remove("hidden");
                mainApp.classList.add("hidden");
            }
            return;
        }

        document.getElementById("deleteAccountModal").classList.add("hidden");

        // Only redirect to login if no one else has signed in during the async
        // cleanup — if a new account signed in while deletion was running,
        // leave them alone and let onAuthStateChanged handle the UI
        if (!auth.currentUser) {
            alert("Your account has been deleted. Thanks for trying the app.");
            authScreen.classList.remove("hidden");
            mainApp.classList.add("hidden");
        }

    } catch (err) {
        console.error("❌ Account deletion failed:", err.code, err.message);
        btn.disabled = false;
        btn.textContent = "Delete My Account";
        document.getElementById("deleteInputError").textContent = "Something went wrong. Please try again.";
        document.getElementById("deleteInputError").classList.remove("hidden");
    }
}

window.deleteAccount = deleteAccount;
window.closeDeleteAccountModal = closeDeleteAccountModal;
window.validateDeleteInput = validateDeleteInput;
window.confirmDeleteAccount = confirmDeleteAccount;

// ==============================
// AUTH STATE LISTENER (UPDATED WITH EMAIL VERIFICATION)
// ==============================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log('✅ User signed in:', user.uid);
        console.log('👤 User email:', user.email);
        console.log('📧 Display name:', user.displayName);
        console.log('✉️ Email verified:', user.emailVerified);
        
        // ✅ NEW: If email user is not verified, sign them out
        if (user.email && !user.emailVerified) {
            console.log('⚠️ Email not verified, blocking access');
            await signOut(auth);
            showAuthError('Please verify your email before signing in');
            return;
        }
        
        // Update UI with user info
        userName.textContent = user.displayName || user.email || 'User';
        userPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userName.textContent);
        
        // Save user info to state
        state.user.id = user.uid;
        state.user.email = user.email;
        state.user.name = user.displayName;
        state.user.createdAt = new Date().toISOString();
        state.user.lastLogin = new Date().toISOString();
        
        // Load user's data from Firestore
        await loadUserState(user.uid);

        // ── Finish pending Auth deletion after redirect/sign-in ──
        // Check that the flag is for THIS specific uid, not a different account
        if (localStorage.getItem("pendingAuthDelete") === user.uid) {
            localStorage.removeItem("pendingAuthDelete");
            try {
                await getRedirectResult(auth).catch(() => {});
                await deleteUser(user);
                alert("Your account has been fully deleted. Thanks for trying the app.");
            } catch (e) {
                console.error("❌ pendingAuthDelete deleteUser failed:", e);
                alert("Your account data was deleted but we couldn't remove your login. Please contact support.");
            }
            authScreen.classList.remove("hidden");
            mainApp.classList.add("hidden");
            return;
        }

        // ── Resume pending full deletion (Google redirect flow) ──
        if (localStorage.getItem("pendingDeleteAccount") === user.uid) {
            localStorage.removeItem("pendingDeleteAccount");
            try {
                await getRedirectResult(auth).catch(() => {});
                await deleteUser(user);
                alert("Your account has been deleted. Thanks for trying the app.");
            } catch (e) {
                console.error("❌ pendingDeleteAccount deleteUser failed:", e);
            }
            authScreen.classList.remove("hidden");
            mainApp.classList.add("hidden");
            return;
        }
        
        // Show app, hide auth screen
        authScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Render the app
        renderApp();
        
        console.log('✅ App ready!');
    } else {
        console.log('❌ No user signed in');

        // If this null event was caused by deleteUser(), not a real sign-out,
        // skip the redirect — a new user may already be signing in
        if (_suppressNextSignOut) {
            _suppressNextSignOut = false;
            console.log('ℹ️ Sign-out suppressed (caused by account deletion)');
            return;
        }

        resetState(); // clear in-memory data so it never bleeds into a new account
        
        // Show auth screen, hide app
        authScreen.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
});
async function loadUserState(uid) {
    try {
        console.log("📥 Loading user state from Firestore...");
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const data = snap.data();

            // ── Returning deleted account — start fresh ────────
            // The doc is kept for analytics but the user is re-registering.
            // Reset appState so they don't see old recipes/data.
            if (data.isDeleted) {
                console.log("♻️ Previously deleted account re-registering — starting fresh");
                await setDoc(ref, {
                    appState: getCurrentAppState(),
                    createdAt: serverTimestamp(),
                    lastActive: serverTimestamp(),
                    // Preserve analytics fields from the deleted account
                    previousDeletion: {
                        deletedAt: data.deletedAt || null,
                        authProvider: data.authProvider || null,
                        appState: data.appState || null  // keep old data for analytics
                    }
                });
                showOnboarding();
                return;
            }

            console.log("✅ Found existing user data in Firestore");
            
            if (data.appState) {
                restoreAppState(data.appState);
            }

            // ── Backfill publicNames index for existing users ──────
            // Users who set a publicName before the publicNames collection
            // existed never had their name claimed. Claim it now silently
            // to enforce uniqueness going forward.
            if (state.data.publicName) {
                const nameKey = state.data.publicName.toLowerCase().trim();
                const nameRef = doc(db, "publicNames", nameKey);
                const nameSnap = await getDoc(nameRef);

                if (!nameSnap.exists()) {
                    // Name unclaimed — claim it for this user
                    await setDoc(nameRef, {
                        uid,
                        displayName: state.data.publicName,
                        createdAt: serverTimestamp()
                    });
                    console.log("✅ Backfilled publicName claim:", state.data.publicName);
                } else if (nameSnap.data().uid !== uid) {
                    // Name claimed by someone else — force onboarding to pick a new one
                    console.warn("⚠️ Public name conflict detected, clearing name");
                    state.data.publicName = "";
                    state.data.onboardingComplete = false;
                    await persistState();
                }
            }

            // Show onboarding if not yet completed (e.g. returning user before feature existed)
            if (!state.data.onboardingComplete) {
                showOnboarding();
            }
        } else {
            console.log("📝 No existing data - new user, starting onboarding");
            await setDoc(ref, {
                appState: getCurrentAppState(),
                createdAt: serverTimestamp(),
                lastActive: serverTimestamp()
            });
            // Brand new user — show onboarding before app
            showOnboarding();
        }
    } catch (err) {
        console.error("❌ Error loading from Firestore:", err);
        console.log("⚠️ Falling back to localStorage");
        loadState();
    }
}
function getCurrentAppState() {
    return {
        schemaVersion: state.schemaVersion,
        data: state.data,
        ui: state.ui
    };
}

/**
 * Restore app state from Firestore data
 */
function restoreAppState(appState) {
    console.log("🔄 Restoring app state from Firestore...");
    
    // Apply schema migrations if needed
    const migrated = migrateState(appState);
    
    // Merge data into current state
    if (migrated.data) {
        state.data = {
            ...state.data,
            ...migrated.data
        };
    }
    
    // Merge UI state
    if (migrated.ui) {
        state.ui = {
            ...state.ui,
            ...migrated.ui
        };
    }
    
    console.log("✅ State restored successfully");
    console.log("📊 Loaded meals:", state.data.userMeals.length);
    console.log("📊 Selected for planner:", state.ui.plannerMeals.length);
}
// ==============================
// STORAGE KEYS & CONSTANTS
// ==============================
const LS_KEY = "mealPlanner_rebuild_v1";
const CURRENT_SCHEMA_VERSION = 2;

// ... REST OF YOUR EXISTING CODE CONTINUES HERE
// (Keep everything from GLOBAL_CATEGORIES onwards)

function migrateState(loadedState) {
    const v = loadedState.schemaVersion || 1;

    if (v < 2) {
        // meals / stores / categories used to live at the root
        loadedState.data = {
            userMeals: loadedState.userMeals || [],
            userStores: loadedState.userStores || [],
            userCategories: loadedState.userCategories || [],
            defaultStoreName: loadedState.data?.defaultStoreName || ""   // ADD THIS
        };
        delete loadedState.userMeals;
        delete loadedState.userStores;
        delete loadedState.userCategories;

        // old UI fields may or may not exist
        const oldUi = loadedState.ui || {};

       loadedState.ui = {
            plannerMeals: oldUi.plannerMeals || [],
            plannerExtras: oldUi.plannerExtras || [],
            collapsedCategories: oldUi.collapsedCategories || [],
            collapsedMeals: oldUi.collapsedMeals || {},
            plannerIngredientChecks: oldUi.plannerIngredientChecks || {},
            plannerIngredientComments: oldUi.plannerIngredientComments || {},
            plannerSubstituteSelections: oldUi.plannerSubstituteSelections || {},
            plannerMealMultipliers: oldUi.plannerMealMultipliers || {},
            collapsedRecipeCategories: oldUi.collapsedRecipeCategories || [],
            groceryCheckedItems: oldUi.groceryCheckedItems || {}
        };

        loadedState.schemaVersion = 2;
    }

    // if you bump to 3, 4, etc. add more blocks here

    return loadedState;
}


// ==============================
// GLOBAL STORES (Built-in)
// ==============================
const GLOBAL_CATEGORIES = [
    "Low Prep",
    "Medium Prep",
    "High Prep / Longer Cook Times",
    "Grilling",
    "Breakfast",
    "Crock Pot",
    "Sides",
    "Appetizers"
];
const GLOBAL_RECIPES = [];


const GLOBAL_STORES = [
    { id: "aldi", name: "Aldi", affiliateUrl: "https://www.aldi.us/search?q={ITEM}", storeHomeUrl: "https://www.aldi.us/" },
    { id: "walmart", name: "Walmart", affiliateUrl: "https://www.walmart.com/search?q={ITEM}", storeHomeUrl: "https://www.walmart.com/" },
    { id: "amazon", name: "Amazon", affiliateUrl: "https://www.amazon.com/s?k={ITEM}&tag=YOURAFFID", storeHomeUrl: "https://www.amazon.com/" },
    {
        id: "woodmans",
        name: "Woodman's",
        affiliateUrl: "https://shopwoodmans.com/search?q={ITEM}",
        storeHomeUrl: "https://shopwoodmans.com/",
        instacartUrl: "https://www.instacart.com/store/woodmans-food-markets/storefront?actid=b16bcab2-6ce3-41fd-b878-787da78d5f31"
    }
];


// ==============================
// DELIVERY SERVICES (Instacart, DoorDash, etc.)
// ==============================
const DELIVERY_SERVICES = [
    {
        id: "instacart",
        name: "Instacart",
        storeUrl: "https://www.instacart.com/store/{STORE}/storefront",
        itemUrl: "https://www.instacart.com/store/{STORE}/storefront",
        buttonClass: "delivery-btn instacart-btn"
    },
    {
        id: "doordash",
        name: "DoorDash",
        storeUrl: "https://www.doordash.com/search/store/{STORE}",
        itemUrl: "https://www.doordash.com/search/store/{ITEM}",
        buttonClass: "delivery-btn doordash-btn"
    }
];
// ============================================================
// OPTIMIZED INGREDIENT MATCHING SYSTEM
// High-performance categorization with intelligent caching
// ============================================================

// ==============================
// PERFORMANCE OPTIMIZATION STRUCTURES
// ==============================

// Memoization cache for lookups (prevent redundant processing)
const aisleCache = new Map();          // rawName → aisle
const normalizeCache = new Map();      // rawName → normalized

// Pre-built lookup structures (populated on index load)
let tokenToEntries = new Map();        // token → [entry, entry, ...]
let exactMatchMap = new Map();         // normalized → entry
let keywordRules = null;               // Fast keyword-based routing
// Autocomplete state tracking (REQUIRED for UI)
let activeAutocompleteMenu = null;
let activeAutocompleteIndex = -1;

// Performance tracking (optional - can be disabled in production)
const ENABLE_PERF_TRACKING = false;
let perfStats = {
    cacheHits: 0,
    cacheMisses: 0,
    keywordMatches: 0,
    indexLookups: 0
};


// ==============================
// CRITICAL KEYWORDS (Preserve These!)
// ==============================

const CRITICAL_KEYWORDS = {
    // State modifiers (affect categorization)
    state: new Set([
        'fresh', 'frozen', 'canned', 'dried', 'jarred', 
        'bottled', 'refrigerated', 'raw', 'cooked'
    ]),
    
    // Preparation modifiers
    prep: new Set([
        'ground', 'diced', 'chopped', 'sliced', 'whole',
        'shredded', 'grated', 'minced', 'crushed'
    ]),
    
    // Quality/type modifiers
    type: new Set([
        'organic', 'extra virgin', 'dark', 'light', 'heavy',
        'sharp', 'mild', 'sweet', 'unsweetened', 'reduced fat',
        'low fat', 'whole', 'skim', 'part skim'
    ])
};


// ==============================
// SMART TEXT EXTRACTION
// Preserves important keywords while removing noise
// ==============================

function extractSmartIngredientName(rawName) {
    if (!rawName) return "";
    
    // Check cache first
    if (normalizeCache.has(rawName)) {
        return normalizeCache.get(rawName);
    }
    
    let text = rawName.toLowerCase();
    
    // 1️⃣ Remove store suffix (always " - StoreName")
    const storeSplit = text.indexOf(' - ');
    if (storeSplit > 0) {
        text = text.substring(0, storeSplit);
    }
    
    // 2️⃣ Extract keywords FROM parentheses before removing them
    const parenContent = [];
    const parenMatches = text.matchAll(/\(([^)]+)\)/g);
    for (const match of parenMatches) {
        const content = match[1].toLowerCase();
        
        // Check if parentheses contain critical keywords
        for (const category of Object.values(CRITICAL_KEYWORDS)) {
            for (const keyword of category) {
                if (content.includes(keyword)) {
                    parenContent.push(keyword);
                }
            }
        }
        
        // Preserve "canned", "can", "frozen" etc.
        if (/\b(canned|can|cans|frozen|dried|fresh)\b/.test(content)) {
            parenContent.push(content.match(/\b(canned|can|cans|frozen|dried|fresh)\b/)[1]);
        }
    }
    
    // 3️⃣ Remove parentheses and their contents
    text = text.replace(/\([^)]*\)/g, ' ');
    
    // 4️⃣ Re-add critical keywords we extracted
    if (parenContent.length > 0) {
        text += ' ' + parenContent.join(' ');
    }
    
    // 5️⃣ Remove measurements but NOT descriptive numbers
    // Remove: "4 oz", "2 cups", "10 ct"
    // Keep: "00 flour", "2% milk"
    text = text.replace(/\b\d+\s*(oz|lb|g|kg|ml|l|cup|cups|tbsp|tsp|ct|count|pieces?)\b/gi, ' ');
    
    // 6️⃣ Normalize whitespace and punctuation
    text = text
        .replace(/[^a-z0-9\s%]/g, ' ')  // Keep % for "2% milk"
        .replace(/\s+/g, ' ')
        .trim();
    
    // Cache the result
    normalizeCache.set(rawName, text);
    
    return text;
}


// ==============================
// FAST KEYWORD-BASED ROUTING
// Short-circuit for common items (10-20x faster)
// ==============================

function initializeKeywordRules() {
    // These rules are checked BEFORE index lookup
    // Format: [regex, category, priority]
    // Lower priority number = checked first
    
    keywordRules = [
        // ====================================
        // PRIORITY 1: EXACT PHRASES (Highest)
        // ====================================
        
        // Baking supplies
        [/\bbaking soda\b/i, 'Baking', 1],
        [/\bbaking powder\b/i, 'Baking', 1],
        [/\bvanilla extract\b/i, 'Baking', 1],
        [/\bcocoa powder\b/i, 'Baking', 1],
        
        // Sugar (all types) → Baking
        [/\b(powdered|granulated|superfine|brown|white|confectioner'?s?)\s*sugar\b/i, 'Baking', 1],
        [/\bsugar\b/i, 'Baking', 1],
        
        // Salt → Spices
        [/\b(sea salt|kosher salt|table salt|salt)\b/i, 'Spices', 1],
        
        // Chocolate → Snacks (not Drinks!)
        [/\b(semi sweet|dark|milk|white)\s*chocolate\b/i, 'Snacks', 1],
        [/\bchocolate\s*(chip|bar|chunk)s?\b/i, 'Snacks', 1],
        
        // Ground meats
        [/\bground\s+(beef|turkey|chicken|pork|lamb)\b/i, 'Meat', 1],
        
        // Bell peppers
        [/\bbell pepper/i, 'Produce', 1],
        
        // Pepper spices (not produce)
        [/\b(black|white|red)\s+pepper\b/i, 'Spices', 1],
        
        // Garlic/onion powder
        [/\b(garlic|onion)\s+powder\b/i, 'Spices', 1],
        
        // Household items
        [/\bpaper towel/i, 'Household', 1],
        [/\baluminum foil\b/i, 'Household', 1],
        [/\bplastic wrap\b/i, 'Household', 1],
        [/\bparchment paper\b/i, 'Household', 1],
        [/\blaundry\s+detergent\b/i, 'Household', 1],
        
        // Glassware (not drinks!)
        [/\b(wine|beer|cocktail)\s+glass(es)?\b/i, 'Household', 1],
        
       // Tomato products (comprehensive detection)
        [/\bcanned.*tomato/i, 'Canned Goods', 1],
        [/\btomato.*canned/i, 'Canned Goods', 1],
        [/\btomato paste\b/i, 'Canned Goods', 1],
        [/\btomato sauce\b/i, 'Canned Goods', 1],
        [/\b(diced|crushed|stewed|whole)\s+tomato/i, 'Canned Goods', 1],
        
        // Artichoke
        [/\bartichoke hearts?\b/i, 'Canned Goods', 1],
        
        
        // ====================================
        // PRIORITY 2: STRONG INDICATORS
        // ====================================
        
        // Pasta
        [/\b(fettuccine|penne|spaghetti|linguine|rigatoni|macaroni|ziti|rotini)\b/i, 'Dry Goods', 2],
        [/\bpasta\b/i, 'Dry Goods', 2],
        [/\b(ramen|noodles?)\b/i, 'Dry Goods', 2],
        
        // Fresh herbs → Produce (all variations)
        [/\bfresh\s+(basil|cilantro|parsley|mint|dill|thyme|rosemary|oregano|sage)\b/i, 'Produce', 2],
        [/\b(regular|fresh|thai|italian|sweet)?\s*(basil|cilantro|parsley|mint|dill)\s*(bunch)?\b/i, 'Produce', 2],
        [/\b(thai|italian|sweet)\s+(basil|cilantro|mint)\b/i, 'Produce', 2],
        
        // Cheese
        [/\b(sharp|mild|medium|aged|extra sharp)\s+(cheddar|cheese)\b/i, 'Dairy', 2],
        [/\b(cheddar|mozzarella|parmesan|gouda|swiss|brie|feta|provolone|burrata)\s*cheese\b/i, 'Dairy', 2],
        [/\bcheese\b/i, 'Dairy', 2],
        
        // Eggs
        [/\begg\s*(white|yolk)s?\b/i, 'Dairy', 2],
        [/\beggs?\b/i, 'Dairy', 2],
        
        // Meat cuts
        [/\b(chicken|turkey|beef|pork)\s+(breast|thigh|leg|wing|rib)\b/i, 'Meat', 2],
        
        // Rice
        [/\b(jasmine|basmati|arborio|bomba|brown|white|wild)\s+rice\b/i, 'Dry Goods', 2],
        
        // Cream products
        [/\b(heavy|whipping|sour|light)\s+cream\b/i, 'Dairy', 2],
        [/\bcream cheese\b/i, 'Dairy', 2],
        [/\bhalf and half\b/i, 'Dairy', 2],
        
        // Stock/broth
        [/\b(chicken|beef|vegetable|seafood)\s+(stock|broth)\b/i, 'Canned Goods', 2],
        
        
        // ====================================
        // PRIORITY 3: CATEGORY INDICATORS
        // ====================================
        
        // Spices (dried herbs)
        [/\b(cumin|paprika|turmeric|cinnamon|nutmeg|cardamom|coriander)\b/i, 'Spices', 3],
        [/\b(oregano|thyme|rosemary|sage)\b(?!\s+bunch)/i, 'Spices', 3],
        [/\b(bay leaf|bay leaves)\b/i, 'Spices', 3],
        [/\bchili powder\b/i, 'Spices', 3],
        [/\b(curry|taco)\s+(powder|seasoning)\b/i, 'Spices', 3],
        [/\bsaffron\b/i, 'Spices', 3],
        
        // Produce
        [/\b(lettuce|spinach|kale|arugula|chard)\b/i, 'Produce', 3],
        [/\b(tomato|tomatoes|carrot|carrots|onion|onions)\b/i, 'Produce', 3],
        [/\b(broccoli|cauliflower|asparagus|zucchini|eggplant)\b/i, 'Produce', 3],
        [/\b(mushroom|mushrooms|shiitake|cremini|portobello)\b/i, 'Produce', 3],
        [/\b(banana|bananas|apple|apples|orange|oranges|lemon|lemons|lime|limes)\b/i, 'Produce', 3],
        [/\b(berries|strawberry|blueberry|raspberry|blackberry)\b/i, 'Produce', 3],
        [/\b(shallot|shallots|scallion|leek|green onion)\b/i, 'Produce', 3],
        [/\b(garlic|ginger)\b(?!\s+powder)/i, 'Produce', 3],
        
        // Canned goods
        [/\bcanned\b/i, 'Canned Goods', 3],
        [/\bcan\b.*\b(beans|tomato|soup|vegetable)\b/i, 'Canned Goods', 3],
        
        // Beverages (but not glassware!)
        [/\b(wine|beer|coffee|tea)\b(?!\s+glass)/i, 'Drinks', 3],
        [/\b(red wine|white wine|port wine|champagne)\b/i, 'Drinks', 3],
        
        // Condiments
        [/\b(ketchup|mustard|mayo|mayonnaise|bbq sauce|hot sauce)\b/i, 'Condiments', 3],
        [/\b(soy sauce|teriyaki|fish sauce|oyster sauce|hoisin)\b/i, 'Condiments', 3],
        [/\b(honey|maple syrup|agave|molasses)\b/i, 'Condiments', 3],
        [/\b(vinegar|balsamic)\b/i, 'Condiments', 3],
        [/\b(curry|miso)\s+paste\b/i, 'Condiments', 3],
        
        // Oils
        [/\bolive oil\b/i, 'Oils', 3],
        [/\b(coconut|sesame|vegetable|canola|avocado)\s+oil\b/i, 'Oils', 3],
        [/\bextra virgin\b/i, 'Oils', 3],
        
        // Seafood
        [/\b(salmon|tuna|cod|shrimp|scallops|clams|mussels|lobster|crab|fish sauce)\b/i, 'Seafood', 3],
        
        // Tofu
        [/\btofu\b/i, 'Dry Goods', 3],
        
        // Frozen
        [/\bfrozen\b/i, 'Frozen', 3],
    ];
    
    // Sort by priority (lower number = higher priority)
    keywordRules.sort((a, b) => a[2] - b[2]);
}
function checkKeywordRules(text) {
    if (!keywordRules) {
        initializeKeywordRules();
    }
    
    for (const [regex, category, priority] of keywordRules) {
        if (regex.test(text)) {
            if (ENABLE_PERF_TRACKING) perfStats.keywordMatches++;
            return category;
        }
    }
    
    return null;
}


// ==============================
// INDEX OPTIMIZATION
// Pre-build lookup structures for O(1) access
// ==============================

async function loadIngredientIndex() {
    const startTime = performance.now();
    
    try {
        const res = await fetch("ingredient_category_index.json");
        const data = await res.json();
        
        // Store original index
        window.INGREDIENT_INDEX = data;
        
        // Clear optimization structures
        exactMatchMap.clear();
        tokenToEntries.clear();
        aisleCache.clear();
        normalizeCache.clear();
        
        console.log("📦 Building optimized lookup structures...");
        
        // Build exact match map (normalized → entry)
        const entries = Object.values(data);
        for (const entry of entries) {
            if (entry?.usda?.normalized) {
                // Use Map for O(1) lookup
                exactMatchMap.set(entry.usda.normalized, entry);
                
                // Build token → entries index
                const tokens = entry.usda.normalized.split(' ');
                for (const token of tokens) {
                    if (token.length > 2) {  // Skip tiny tokens
                        if (!tokenToEntries.has(token)) {
                            tokenToEntries.set(token, []);
                        }
                        tokenToEntries.get(token).push(entry);
                    }
                }
            }
        }
        
        // Initialize keyword rules
        initializeKeywordRules();
        
        const elapsed = performance.now() - startTime;
        console.log("✅ Ingredient index optimized in", elapsed.toFixed(0), "ms");
        console.log("   - Exact matches:", exactMatchMap.size);
        console.log("   - Token index:", tokenToEntries.size, "unique tokens");
        console.log("   - Keyword rules:", keywordRules.length);
        
    } catch (err) {
        console.error("❌ Failed to load ingredient index:", err);
        window.INGREDIENT_INDEX = {};
        exactMatchMap.clear();
        tokenToEntries.clear();
    }
}


// ==============================
// OPTIMIZED AISLE DETERMINATION
// Multi-tier strategy with caching
// ==============================

function determineAisleForIngredient(rawName) {
    if (!rawName) return "Other";
    
    // 🚀 TIER 0: Cache check (instant return)
    if (aisleCache.has(rawName)) {
        if (ENABLE_PERF_TRACKING) perfStats.cacheHits++;
        return aisleCache.get(rawName);
    }
    
    if (ENABLE_PERF_TRACKING) perfStats.cacheMisses++;
    
    let result = "Other";
    
    // Get smart normalized name (preserves critical keywords)
    const smartName = extractSmartIngredientName(rawName);
    
    // 🚀 TIER 1: Keyword rules (fastest - regex check only)
    const keywordMatch = checkKeywordRules(smartName);
    if (keywordMatch) {
        result = keywordMatch;
        aisleCache.set(rawName, result);
        return result;
    }
    
    // 🚀 TIER 2: Exact match lookup (O(1))
    const exactMatch = exactMatchMap.get(smartName);
    if (exactMatch) {
        result = exactMatch.aisle || "Other";
        aisleCache.set(rawName, result);
        return result;
    }
    
    // 🚀 TIER 3: Token-based lookup (much faster than full scan)
    if (ENABLE_PERF_TRACKING) perfStats.indexLookups++;
    
    const tokens = smartName.split(' ').filter(t => t.length > 2);
    
    if (tokens.length === 0) {
        aisleCache.set(rawName, "Other");
        return "Other";
    }
    
    // Collect candidate entries by token intersection
    const candidateMap = new Map();
    
    for (const token of tokens) {
        const entries = tokenToEntries.get(token);
        if (entries) {
            for (const entry of entries) {
                const id = entry.usda.fdcId;
                if (!candidateMap.has(id)) {
                    candidateMap.set(id, { entry, sharedTokens: 0 });
                }
                candidateMap.get(id).sharedTokens++;
            }
        }
    }
    
    // Score and find best match
    let bestAisle = "Other";
    let bestScore = -Infinity;
    
    for (const { entry, sharedTokens } of candidateMap.values()) {
        if (sharedTokens === 0) continue;
        
        const entryNorm = entry.usda.normalized;
        const entryTokens = entryNorm.split(' ');
        
        // Calculate score (optimized)
        let score = sharedTokens * 20;
        
        if (entry.aisle && entry.aisle !== "Other") {
            score += 30;
        }
        
        score += Math.min(entryTokens.length * 10, 40);
        
        if (entryTokens.length === 1) {
            score -= 25;
        }
        
        score -= Math.abs(entryNorm.length - smartName.length);
        
        if (score > bestScore) {
            bestScore = score;
            bestAisle = entry.aisle || "Other";
        }
    }
    
    result = bestAisle;
    
    // Cache the result
    aisleCache.set(rawName, result);
    
    return result;
}


// ==============================
// OPTIMIZED AUTOCOMPLETE SEARCH
// ==============================

function searchIngredientIndex(query) {
    if (!window.INGREDIENT_INDEX || query.length < 2) return [];
    
    const norm = query.toLowerCase().trim();
    const results = [];
    const seenIds = new Set();
    
    const AUTOCOMPLETE_LIMIT = 8;
    
    // Strategy: Use token index for fast candidate collection
    const tokens = norm.split(/\s+/);
    const primaryToken = tokens[0];
    
    // Get candidates from token index
    let candidates = [];
    
    if (tokenToEntries.has(primaryToken)) {
        candidates = tokenToEntries.get(primaryToken);
    } else {
        // Fallback: find tokens that START with query
        for (const [token, entries] of tokenToEntries) {
            if (token.startsWith(primaryToken)) {
                candidates.push(...entries);
            }
        }
    }
    
    // Score and sort candidates
    for (const entry of candidates) {
        if (seenIds.has(entry.usda.fdcId)) continue;
        
        const candidate = entry.usda.normalized;
        
        let score = 0;
        
        if (candidate.startsWith(norm)) {
            score = 1;  // Best match
        } else if (candidate.includes(norm)) {
            score = 2;  // Good match
        } else {
            continue;  // Skip
        }
        
        results.push({ fdcId: entry.usda.fdcId, entry, score });
        seenIds.add(entry.usda.fdcId);
        
        if (results.length >= AUTOCOMPLETE_LIMIT) break;
    }
    
    return results.sort((a, b) => a.score - b.score);
}


// ==============================
// PERFORMANCE MONITORING
// (Optional - disable in production)
// ==============================

function getPerformanceStats() {
    const total = perfStats.cacheHits + perfStats.cacheMisses;
    const hitRate = total > 0 ? (perfStats.cacheHits / total * 100).toFixed(1) : 0;
    
    return {
        ...perfStats,
        totalLookups: total,
        cacheHitRate: hitRate + '%',
        avgCacheSize: aisleCache.size
    };
}

function resetPerformanceStats() {
    perfStats = {
        cacheHits: 0,
        cacheMisses: 0,
        keywordMatches: 0,
        indexLookups: 0
    };
}

function clearCache() {
    aisleCache.clear();
    normalizeCache.clear();
    console.log("🗑️ Cache cleared");
}


// ==============================
// DEBUG UTILITIES
// ==============================

window.debugIngredient = function(rawName) {
    console.group(`🔍 Debugging: "${rawName}"`);
    
    console.log("Smart extracted:", extractSmartIngredientName(rawName));
    console.log("Keyword match:", checkKeywordRules(rawName));
    console.log("Final aisle:", determineAisleForIngredient(rawName));
    
    console.log("\nPerformance stats:", getPerformanceStats());
    
    console.groupEnd();
};

window.testIngredients = function(items) {
    console.log("🧪 Testing", items.length, "ingredients...\n");
    
    resetPerformanceStats();
    const startTime = performance.now();
    
    for (const [name, expected] of items) {
        const result = determineAisleForIngredient(name);
        const match = result === expected ? "✅" : "❌";
        console.log(`${match} ${name.padEnd(40)} → ${result.padEnd(15)} (expected: ${expected})`);
    }
    
    const elapsed = performance.now() - startTime;
    console.log(`\n⏱️  Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`⚡ Avg per ingredient: ${(elapsed / items.length).toFixed(2)}ms`);
    console.log("\n📊 Stats:", getPerformanceStats());
};


// ==============================
// LEGACY COMPATIBILITY
// Keep old function names working
// ==============================

// These are kept for compatibility but now use optimized versions
function normalizeIngredientName(name) {
    return extractSmartIngredientName(name);
}

function getSemanticIngredientName(rawName) {
    return extractSmartIngredientName(rawName);
}

function findIngredientInIndex(rawName) {
    const smartName = extractSmartIngredientName(rawName);
    return exactMatchMap.get(smartName) || null;
}


// ==============================
// GLOBAL SCOPE (for inline handlers & console access)
// ==============================

// Make ingredient matcher functions globally accessible
window.loadIngredientIndex = loadIngredientIndex;
window.determineAisleForIngredient = determineAisleForIngredient;
window.searchIngredientIndex = searchIngredientIndex;
window.extractSmartIngredientName = extractSmartIngredientName;
window.normalizeIngredientName = normalizeIngredientName;
window.getSemanticIngredientName = getSemanticIngredientName;
window.findIngredientInIndex = findIngredientInIndex;
window.getPerformanceStats = getPerformanceStats;
window.resetPerformanceStats = resetPerformanceStats;
window.clearCache = clearCache;

console.log("✅ Ingredient matcher functions exposed to global scope");
function closeAutocompleteMenu() {
    if (activeAutocompleteMenu) {
        activeAutocompleteMenu.remove();
        activeAutocompleteMenu = null;
        activeAutocompleteIndex = -1;
    }
}

function openAutocompleteMenu(inputEl, results, ingredientIndex) {
    closeAutocompleteMenu();

    if (!results.length) return;

    const rect = inputEl.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "group-suggest-menu"; 
    menu.style.position = "absolute";
    menu.style.top = rect.bottom + window.scrollY + "px";
    menu.style.left = rect.left + window.scrollX + "px";
    menu.style.width = rect.width + "px";
    menu.style.zIndex = 99999;
    menu.style.maxHeight = "200px";
    menu.style.overflowY = "auto";

    results.forEach((r, idx) => {
        const item = document.createElement("div");
        item.className = "group-suggest-item";
        item.textContent = r.entry.usda.description;
        item.dataset.index = idx;

        item.onclick = () => {
            ingredientRows[ingredientIndex].name = r.entry.usda.description;
            renderIngredientsEditor();
            closeAutocompleteMenu();
            markDirty();
        };

        menu.appendChild(item);
    });

    const modalContent = document.querySelector("#recipeModal .modal-content");
    modalContent.appendChild(menu);

    activeAutocompleteMenu = menu;
}

function handleAutocompleteKey(inputEl, e) {
    if (!activeAutocompleteMenu) return false;

    const items = Array.from(activeAutocompleteMenu.querySelectorAll(".group-suggest-item"));

    if (e.key === "ArrowDown") {
        activeAutocompleteIndex = (activeAutocompleteIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
        activeAutocompleteIndex = (activeAutocompleteIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter") {
        if (activeAutocompleteIndex >= 0) {
            items[activeAutocompleteIndex].click();
            return true;
        }
    } else {
        return false;
    }

    items.forEach((el, idx) => {
        el.style.background = idx === activeAutocompleteIndex ? "#e5e7eb" : "white";
    });

    return true;
}

document.addEventListener("click", (e) => {
    if (activeAutocompleteMenu && !activeAutocompleteMenu.contains(e.target)) {
        closeAutocompleteMenu();
    }
});
// Input handler for ingredient name fields
function handleIngredientNameInput(inputEl, ingredientIndex) {
    const q = inputEl.value.trim();

    if (!q) {
        closeAutocompleteMenu();
        ingredientRows[ingredientIndex].name = "";
        return;
    }

    ingredientRows[ingredientIndex].name = q;

    const results = searchIngredientIndex(q);
    openAutocompleteMenu(inputEl, results, ingredientIndex);
}

// Allow arrow keys & Enter to navigate autocomplete
function handleIngredientInputKey(inputEl, e) {
    if (handleAutocompleteKey(inputEl, e)) {
        e.preventDefault();
    }
}

// ==============================
// AUTO REBUILD GROCERY LIST (DEBOUNCED)
// ==============================
function scheduleGroceryRebuild() {
    clearTimeout(window._groceryDebounce);
    window._groceryDebounce = setTimeout(() => {
        const groceryTab = document.getElementById("groceryTab");
        if (groceryTab && groceryTab.classList.contains("active")) {
            renderGroceryList();
        }
    }, 250);
}

// ==============================
// MERGED MEAL LIST (GLOBAL + USER)
// ==============================
function getAllMeals() {
    const userIds = new Set((state.data.userMeals || []).map(m => m.id));

    // global recipes that are NOT overridden (currently none, but future-safe)
    const filteredGlobals = GLOBAL_RECIPES.filter(m => !userIds.has(m.id));

    return [
        ...filteredGlobals,
        ...(state.data.userMeals || [])
    ];
}

// Return global + user stores together
function getAllStores() {
    return [
        ...GLOBAL_STORES,
        ...(state.data.userStores || [])
    ];
}

// Find a store by its display name (for affiliate links & shop button)
function findStoreByName(name) {
    if (!name) return null;
    return getAllStores().find(s => s.name === name) || null;
}


let state = {
    schemaVersion: 2,
    user: {
        id: null,
        email: null,
        name: null,
        createdAt: null,
        lastLogin: null
    },

    data: {
        userMeals: [],
        userStores: [],
        userCategories: [],
        publicName: "",
        onboardingComplete: false
    },

    ui: {
        plannerMeals: [],
        plannerExtras: [],
        collapsedCategories: [],
        collapsedMeals: {},
        plannerIngredientChecks: {},
        plannerIngredientComments: {},
        groceryCheckedItems: {},
        plannerSubstituteSelections: {},
        plannerMealMultipliers: {},
        collapsedRecipeCategories: []
    },

    dirty: false
};

// Wipe all user data from memory — called on sign-out so stale
// data never bleeds into a new account created in the same session
function resetState() {
    state.user = { id: null, email: null, name: null, createdAt: null, lastLogin: null };
    state.data = { userMeals: [], userStores: [], userCategories: [], publicName: "", onboardingComplete: false };
    state.ui  = {
        plannerMeals: [], plannerExtras: [], collapsedCategories: [],
        collapsedMeals: {}, plannerIngredientChecks: {}, plannerIngredientComments: {},
        groceryCheckedItems: {}, plannerSubstituteSelections: {},
        plannerMealMultipliers: {}, collapsedRecipeCategories: []
    };
    state.dirty = false;
}

// ==============================
// ID HELPER (SAFER THAN crypto.randomUUID DIRECT USE)
// ==============================
function makeId() {
    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // fallback
    return 'id-' + ([1e7]+-1e3+-4e3+-8e3+-1e11)
        .replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
}
// Debounced Firestore save (prevents too many writes)
let saveTimeout = null;
function scheduleSave(userId) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const ref = doc(db, "users", userId);
            await setDoc(ref, {
                appState: getCurrentAppState(),
                lastActive: serverTimestamp()
            }, { merge: true });
            console.log("☁️ Saved to Firestore");
        } catch (err) {
            console.error("❌ Firestore save failed:", err);
        }
    }, 1000); // Wait 1 second before saving
}
async function persistState() {
    try {
        const json = JSON.stringify(state);
        localStorage.setItem(LS_KEY, json);
        console.log("💾 Saved to localStorage");
        
        // Save to Firestore immediately (no debouncing needed with optimized code)
        if (state.user.id) {
            const ref = doc(db, "users", state.user.id);
            await setDoc(ref, {
                appState: getCurrentAppState(),
                lastActive: serverTimestamp()
            }, { merge: true });
            console.log("☁️ Saved to Firestore");
        }
    } catch (err) {
        console.error("❌ Failed to persist state:", err);
    }
}
function markDirty() {
    state.dirty = true;
}

async function toggleMealCollapse(mealId) {
    state.ui.collapsedMeals[mealId] = !state.ui.collapsedMeals[mealId];
    await persistState();
    renderPlanner();
}
function getAllCategories() {
    return [...GLOBAL_CATEGORIES, ...(state.data.userCategories || [])];
}


// for the recipe modal
let ingredientRows = [];
let editingMealId = null;
let selectedRecipePhotoFile = null;   // pending File object, not yet uploaded
let currentRecipePhotoUrl = null;     // existing photo URL when editing
let currentStep = 1;
let subModalMealId = null;
let subModalGroupName = null;
let subModalIngredientIndex = null;

// ==============================
// SUBSTITUTE GROUP SUGGESTIONS
// ==============================
function getExistingGroups() {
    const groups = new Set();

    // include groups already typed in this modal
    ingredientRows.forEach(r => {
        if (r.group && r.group.trim() !== "") {
            groups.add(r.group.trim());
        }
    });

    // also include groups from all saved meals
    getAllMeals().forEach(meal => {
        (meal.ingredients || []).forEach(ing => {
            if (ing.group && ing.group.trim() !== "") {
                groups.add(ing.group.trim());
            }
        });
    });

    return Array.from(groups);
}
    
function exportAppData() {
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

async function importAppData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // ✅ make the callback async
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            // BASIC VALIDATION
            if (typeof imported !== "object") {
                alert("Invalid backup file.");
                return;
            }

            // If meals existed in the old schema, map them into userMeals
            if (imported.meals && !imported.userMeals) {
                imported.userMeals = imported.meals;
            }

            // APPLY IMPORTED DATA
            state.data.userMeals = imported.userMeals || [];
            state.data.userStores = imported.userStores || [];
            state.data.userCategories = imported.userCategories || [];

            state.ui.plannerMeals = imported.plannerMeals || [];
            state.ui.plannerExtras = imported.plannerExtras || [];
            state.ui.collapsedCategories = imported.collapsedCategories || [];
            state.ui.collapsedMeals = imported.collapsedMeals || {};

            state.ui.plannerIngredientChecks = imported.plannerIngredientChecks || {};
            state.ui.plannerIngredientComments = imported.plannerIngredientComments || {};
            state.ui.plannerSubstituteSelections = imported.plannerSubstituteSelections || {};
            state.ui.plannerMealMultipliers = imported.plannerMealMultipliers || {};

            // SAVE + RENDER
            await persistState();
            renderApp();

            alert("Data imported successfully!");
        } catch (err) {
            console.error(err);
            alert("There was an error importing the file.");
        }
    };

    reader.readAsText(file);
}

function showGroupSuggestions(inputEl, index) {
    // remove old menu if any
    const oldMenu = document.querySelector(".group-suggest-menu");
    if (oldMenu) oldMenu.remove();

    const groups = getExistingGroups().filter(g =>
        g.toLowerCase().includes(inputEl.value.toLowerCase())
    );

    if (groups.length === 0) return;

    const menu = document.createElement("div");
    menu.className = "group-suggest-menu";

    groups.forEach(g => {
        const item = document.createElement("div");
        item.className = "group-suggest-item";
        item.textContent = g;
        // pointerdown fires BEFORE blur on mobile + desktop
       item.onpointerdown = (e) => {
            e.preventDefault();
            window.__clickedGroupItem = g;

            inputEl.value = g;
            ingredientRows[index].group = g;

            // Force popup ALWAYS when picking a suggestion
            handleGroupFinished(index, g);

            if (menu) menu.remove();
        };


        menu.appendChild(item);
    });

   // Position inside the modal so the menu stays aligned
// Position the dropdown precisely under the input, relative to modal-content
const contentEl = document.querySelector("#recipeModal .modal-content");

const inputRect = inputEl.getBoundingClientRect();
const contentRect = contentEl.getBoundingClientRect();

// Exact alignment inside modal-content
menu.style.position = "absolute";
menu.style.left = (inputRect.left - contentRect.left) + "px";
menu.style.top = (inputRect.bottom - contentRect.top) + "px";
menu.style.width = inputRect.width + "px";
menu.style.zIndex = 9999;

// Attach menu inside modal-content, NOT whole modal
contentEl.appendChild(menu);


}

document.addEventListener("mousedown", (e) => {
    const menu = document.querySelector(".group-suggest-menu");
    if (!menu) return;

    const clickedInsideMenu = menu.contains(e.target);
    const clickedInput = e.target.classList.contains("ingGroup");

    // If click is on menu or input, do nothing
    if (clickedInsideMenu || clickedInput) return;

    // Otherwise: close it
    menu.remove();
});
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Meal Planner app starting...");
    
    // Load ingredient index
    await loadIngredientIndex();
    console.log("✅ Ingredient index loaded");
    
    // Auth state listener will handle showing auth screen or app
});



function loadState() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;

        let loaded = JSON.parse(raw);
        loaded = migrateState(loaded);

        // Merge shallow properties
        state = {
            ...state,
            ...loaded,

            // Merge nested data structures correctly
            data: {
                ...state.data,
                ...(loaded.data || {})
            },

            ui: {
                ...state.ui,
                ...(loaded.ui || {})
            }
        };

    } catch (err) {
        console.error("Failed to load state:", err);
    }
}


// ==============================
// TABS
// ==============================
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPages = document.querySelectorAll(".tab-page");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabId = btn.dataset.tab;
        switchTab(tabId);
    });
});
function renderCategoriesTab() {
    const globalDiv = document.getElementById("globalCategoryList");
    const userDiv = document.getElementById("userCategoryList");

    if (!globalDiv || !userDiv) return;

    // Render global categories (read-only)
    globalDiv.innerHTML = GLOBAL_CATEGORIES
        .map(cat => `<div class="store-row">${cat}</div>`)
        .join("");


    // Render user categories (editable)
    userDiv.innerHTML = (state.data.userCategories || [])
        .map((cat, idx) => `
            <div class="store-row" style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${cat}</span>
                <button class="danger" onclick="removeUserCategory(${idx})">Remove</button>
            </div>
        `)
        .join("");
}
async function addUserCategory() {
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userCategories) state.data.userCategories = [];

    // Prevent duplicates (global or user)
    if (GLOBAL_CATEGORIES.includes(name) || state.data.userCategories.includes(name)) {
        alert("Category already exists.");
        return;
    }

    state.data.userCategories.push(name);

    await persistState();
    input.value = "";
    renderCategoriesTab();
}
async function removeUserCategory(index) {
    if (!state.data.userCategories) return;

    state.data.userCategories.splice(index, 1);

    await persistState();
    renderCategoriesTab();
}

function switchTab(tabId) {
    tabPages.forEach(page => {
        page.classList.toggle("active", page.id === tabId);
    });

    tabButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    if (tabId === "groceryTab") {
        renderGroceryList();
    }
    if (tabId === "storesTab") renderStoresTab();
    if (tabId === "categoriesTab") renderCategoriesTab();
    if (tabId === "globalRecipesTab") renderGlobalRecipesTab();

}



function renderApp() {
    const activeTab = document.querySelector(".tab-page.active")?.id;

    // Wire up globalRecipes module with app's shared dependencies
    initGlobalRecipes({
        state,
        makeId,
        persistState,
        getAllStores,
        renderRecipes,
        renderPlanner
    });

    renderRecipes();
    renderPlanner();

    // Only render grocery list IF the grocery tab is active
    if (activeTab === "groceryTab") {
        renderGroceryList();
    }
}

// ==============================
// ONBOARDING
// ==============================
let onboardingStep = 1;

function showOnboarding() {
    const modal = document.getElementById("onboardingModal");
    if (!modal) return;
    onboardingStep = 1;
    renderOnboardingStep();
    modal.classList.remove("hidden");
}

function renderOnboardingStep() {
    const step1 = document.getElementById("onboardStep1");
    const step2 = document.getElementById("onboardStep2");
    const dots = document.querySelectorAll(".onboard-dot");

    step1.classList.toggle("hidden", onboardingStep !== 1);
    step2.classList.toggle("hidden", onboardingStep !== 2);

    dots.forEach((dot, i) => {
        dot.classList.toggle("active", i + 1 === onboardingStep);
    });
}

async function onboardNextStep() {
    // Validate step 1 — public name required + unique
    if (onboardingStep === 1) {
        const nameInput = document.getElementById("onboardPublicName");
        const errorEl = document.getElementById("onboardNameError");
        const nextBtn = document.getElementById("onboardNextBtn");
        const name = nameInput.value.trim();

        // Basic validation
        if (!name) {
            errorEl.textContent = "Please enter a public name.";
            errorEl.classList.remove("hidden");
            return;
        }
        if (name.length < 2) {
            errorEl.textContent = "Name must be at least 2 characters.";
            errorEl.classList.remove("hidden");
            return;
        }
        if (!/^[a-zA-Z0-9 _'-]+$/.test(name)) {
            errorEl.textContent = "Only letters, numbers, spaces, and ' _ - are allowed.";
            errorEl.classList.remove("hidden");
            return;
        }

        // Check uniqueness against publicNames collection
        errorEl.classList.add("hidden");
        nextBtn.disabled = true;
        nextBtn.textContent = "Checking...";

        try {
            const nameKey = name.toLowerCase().trim();
            const nameRef = doc(db, "publicNames", nameKey);
            const nameSnap = await getDoc(nameRef);

            if (nameSnap.exists() && nameSnap.data().uid !== state.user.id) {
                // Taken by someone else
                errorEl.textContent = `"${name}" is already taken. Please choose a different name.`;
                errorEl.classList.remove("hidden");
                nextBtn.disabled = false;
                nextBtn.textContent = "Next →";
                return;
            }
        } catch (err) {
            console.error("❌ Name check failed:", err);
            errorEl.textContent = "Couldn't verify name availability. Please try again.";
            errorEl.classList.remove("hidden");
            nextBtn.disabled = false;
            nextBtn.textContent = "Next →";
            return;
        }

        nextBtn.disabled = false;
        nextBtn.textContent = "Next →";

        state.data.publicName = name;

        // Populate the store list in step 2
        renderOnboardingStoreList();

        onboardingStep = 2;
        renderOnboardingStep();
    }
}

function renderOnboardingStoreList() {
    const list = document.getElementById("onboardStoreList");
    if (!list) return;

    const currentDefault = state.data.defaultStoreName || "";
    const allStores = getAllStores();

    // Add any user-added stores during onboarding too
    const onboardUserStores = state.data.userStores || [];

    list.innerHTML = allStores.map(store => {
        const safeName = store.name.replace(/'/g, "\\'");
        return `
        <div class="onboard-store-option ${currentDefault === store.name ? "selected" : ""}"
             onclick="selectOnboardStore('${safeName}')"
             id="onboardStore_${store.name.replace(/[^a-z0-9]/gi, '_')}">
            ${store.name}
            ${currentDefault === store.name ? `<span style="float:right;">⭐</span>` : ""}
        </div>`;
    }).join("");
}

function selectOnboardStore(storeName) {
    state.data.defaultStoreName = storeName;
    document.getElementById("onboardStoreError")?.classList.add("hidden");
    renderOnboardingStoreList();
}

async function addOnboardStore() {
    const input = document.getElementById("onboardNewStore");
    const name = input.value.trim();
    if (!name) return;

    const allStores = getAllStores();
    if (allStores.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        alert("That store already exists.");
        return;
    }

    if (!state.data.userStores) state.data.userStores = [];
    state.data.userStores.push({ id: makeId(), name });

    input.value = "";
    // Auto-select the newly added store
    selectOnboardStore(name);
}

async function completeOnboarding() {
    // Require a store to be selected
    if (!state.data.defaultStoreName) {
        const err = document.getElementById("onboardStoreError");
        if (err) {
            err.textContent = "Please select a default store.";
            err.classList.remove("hidden");
        }
        return;
    }

    // Guard: if publicName is missing, send back to step 1
    if (!state.data.publicName || !state.data.publicName.trim()) {
        onboardingStep = 1;
        renderOnboardingStep();
        const err = document.getElementById("onboardNameError");
        if (err) {
            err.textContent = "Please enter a public name.";
            err.classList.remove("hidden");
        }
        return;
    }

    const finishBtn = document.getElementById("onboardFinishBtn");
    if (finishBtn) { finishBtn.disabled = true; finishBtn.textContent = "Saving..."; }

    try {
        const nameKey = state.data.publicName.toLowerCase().trim();
        const nameRef = doc(db, "publicNames", nameKey);

        // Final uniqueness check at save time (race condition guard)
        const nameSnap = await getDoc(nameRef);
        if (nameSnap.exists() && nameSnap.data().uid !== state.user.id) {
            if (finishBtn) { finishBtn.disabled = false; finishBtn.textContent = "Let's go! →"; }
            onboardingStep = 1;
            renderOnboardingStep();
            const err = document.getElementById("onboardNameError");
            if (err) {
                err.textContent = `"${state.data.publicName}" is already taken. Please choose a different name.`;
                err.classList.remove("hidden");
            }
            return;
        }

        // Claim the name in publicNames index
        await setDoc(nameRef, {
            uid: state.user.id,
            displayName: state.data.publicName,
            createdAt: serverTimestamp()
        });

        state.data.onboardingComplete = true;
        await persistState();

    } catch (err) {
        console.error("❌ completeOnboarding:", err);
        // Show error inside modal, not alert() which can hide behind backdrop
        const storeErr = document.getElementById("onboardStoreError");
        if (storeErr) {
            storeErr.textContent = "Something went wrong. Please try again.";
            storeErr.classList.remove("hidden");
        }
        if (finishBtn) { finishBtn.disabled = false; finishBtn.textContent = "Let's go! →"; }
        return;
    }

    // Close modal and go to Global Recipes
    document.getElementById("onboardingModal").classList.add("hidden");
    switchTab("globalRecipesTab");
}

window.onboardNextStep = onboardNextStep;
window.selectOnboardStore = selectOnboardStore;
window.addOnboardStore = addOnboardStore;
window.completeOnboarding = completeOnboarding;



// ==============================
// RECIPES LIST
// ==============================
function renderRecipes() {
    const container = document.getElementById("recipesList");
    if (!container) return;

    container.innerHTML = "";

    const meals = getAllMeals();
    if (!meals.length) {
        container.innerHTML = `<p class="section-note">No recipes yet. Tap + Add Recipe to create one.</p>`;
        return;
    }

    // 1️⃣ GROUP meals by category
    const byCategory = {};
    meals.forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    // 2️⃣ SORT categories alphabetically
    const categories = Object.keys(byCategory).sort();

    categories.forEach(cat => {
        const isCollapsed = state.ui.collapsedRecipeCategories?.includes(cat);

        // CATEGORY HEADER
        const catDiv = document.createElement("div");
        catDiv.className = "planner-category"; // reuse existing styling

        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleRecipeCategory(cat);
        header.innerHTML = `
            <span>${isCollapsed ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;

        catDiv.appendChild(header);

        // If collapsed → do not render meals inside it
        if (!isCollapsed) {
            // 3️⃣ SORT meals A–Z inside category
            byCategory[cat]
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(meal => {
                    const ingredientCount = meal.ingredients?.length || 0;
                    const countText =
                        ingredientCount === 1
                            ? "1 ingredient"
                            : `${ingredientCount} ingredients`;

                   const card = document.createElement("div");
                    card.className = "card";
                    card.style.marginLeft = "1rem";

                    const hasInstructions = !!(meal.instructions && meal.instructions.trim());
                    const ingId  = `recipeIng_${meal.id}`;
                    const instrId = `recipeInstr_${meal.id}`;

                    // Build ingredients HTML for the collapsible panel
                    const ingHTML = (meal.ingredients || []).map(ing => {
                        const qty = ing.qty > 1 ? ` — ${ing.qty} ${ing.unit}` : "";
                        return `<li style="padding:0.1rem 0;">• ${ing.name}${qty}</li>`;
                    }).join("");

                    const recipePhotoHTML = meal.photoUrl
                        ? `<img src="${meal.photoUrl}" alt="${meal.name}"
                               style="width:64px; height:64px; object-fit:cover; border-radius:8px; flex-shrink:0;">`
                        : "";

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:0.6rem;">
                                ${recipePhotoHTML}
                                <div>
                                    <div style="font-weight:600; font-size:1rem;">${meal.name}</div>
                                    <div style="font-size:0.9rem; color:#6b7280;">
                                        ${countText}
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; gap:0.4rem;">
                                <button onclick="publishToGlobal('${meal.id}')" title="Share to Global Recipes" style="font-size:0.8rem;">🌐 Share</button>
                                <button class="primary" onclick="openRecipeModalEdit('${meal.id}')">Edit</button>
                                <button class="danger" onclick="deleteRecipe('${meal.id}')">Delete</button>
                            </div>
                        </div>
                        <div style="margin-top:0.5rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
                            <button onclick="toggleRecipePanel('${ingId}', '${instrId}')"
                                style="font-size:0.8rem; color:#6b7280; background:none; border:1px solid #d1d5db; padding:0.2rem 0.6rem; border-radius:4px; cursor:pointer;">
                                View Ingredients
                            </button>
                            ${hasInstructions ? `
                            <button onclick="toggleRecipePanel('${instrId}', '${ingId}')"
                                style="font-size:0.8rem; color:#6b7280; background:none; border:1px solid #d1d5db; padding:0.2rem 0.6rem; border-radius:4px; cursor:pointer;">
                                📋 Instructions
                            </button>` : ""}
                        </div>
                        <div id="${ingId}" style="display:none; margin-top:0.5rem; padding:0.75rem; background:#f9fafb; border-radius:8px;">
                            <ul style="margin:0; padding-left:0; list-style:none; font-size:0.9rem; color:#374151; line-height:1.8;">
                                ${ingHTML}
                            </ul>
                        </div>
                        ${hasInstructions ? `
                        <div id="${instrId}" style="display:none; margin-top:0.5rem; padding:0.75rem; background:#f9fafb; border-radius:8px; font-size:0.9rem; white-space:pre-line; color:#374151;">
                            ${meal.instructions.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                        </div>` : ""}
                    `;
                    catDiv.appendChild(card);
                });
        }

        container.appendChild(catDiv);
    });
}

async function deleteRecipe(id) {
    const isUser = state.data.userMeals.some(m => m.id === id);

    if (!isUser) {
        alert("You can't delete starter recipes, but you CAN edit them.");
        return;
    }

    const meal = state.data.userMeals.find(m => m.id === id);
    const isGlobal = !!meal?.globalRecipeId;

    const confirmMsg = isGlobal
        ? `Remove "${meal.name}" from your personal library?\n\nThis will NOT delete it from Global Recipes.`
        : `Delete "${meal.name}"?`;

    if (!confirm(confirmMsg)) return;

    state.data.userMeals = state.data.userMeals.filter(m => m.id !== id);

    await persistState();
    renderRecipes();
    renderPlanner();
}



// ==============================
// RECIPE MODAL: OPEN / CLOSE
// ==============================
function openRecipeModalNew() {
    selectedRecipePhotoFile = null;
    currentRecipePhotoUrl = null;
    document.getElementById("recipePhotoPreviewWrap").classList.add("hidden");
    document.getElementById("recipePhotoPreview").src = "";
    document.getElementById("recipePhotoFileInput").value = "";
    document.getElementById("recipePhotoAddBtn").style.display = "inline-block";
    editingMealId = null;
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Add Recipe";
    document.getElementById("modalRecipeName").value = "";
    document.getElementById("modalInstructions").value = "";

    populateCategoryDropdown("");

    // start with no ingredients
    ingredientRows = [];
    renderIngredientsEditor();

    updateReview();
    showModal(true);
    updateStepUI();
}

async function openRecipeModalEdit(mealId) {
    let meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    const isGlobal = GLOBAL_RECIPES.some(m => m.id === mealId);

    // If the user tries to edit a global recipe, clone it into userMeals
    if (isGlobal) {
        meal = JSON.parse(JSON.stringify(meal)); // deep clone
        state.data.userMeals.push(meal);
        await persistState();
    }

    editingMealId = meal.id;
  selectedRecipePhotoFile = null;
    currentRecipePhotoUrl = meal.photoUrl || null;
 
    const photoWrap = document.getElementById("recipePhotoPreviewWrap");
    const photoPreview = document.getElementById("recipePhotoPreview");
    const photoAddBtn = document.getElementById("recipePhotoAddBtn");
 
    if (currentRecipePhotoUrl) {
        photoPreview.src = currentRecipePhotoUrl;
        photoWrap.classList.remove("hidden");
        photoAddBtn.style.display = "none";
    } else {
        photoWrap.classList.add("hidden");
        photoAddBtn.style.display = "inline-block";
    }
    currentStep = 1;

    document.getElementById("recipeModalTitle").textContent = "Edit Recipe";
    document.getElementById("modalRecipeName").value = meal.name || "";
    document.getElementById("modalInstructions").value = meal.instructions || "";

    populateCategoryDropdown(meal.category || "");

    ingredientRows = (meal.ingredients || []).map(ing => ({ ...ing }));
    renderIngredientsEditor();

    updateReview();
    showModal(true);
    updateStepUI();
}

// ==============================
// OPEN RECIPE MODAL FROM PHOTO
// Receives parsed recipe data, auto-saves immediately so the
// recipe is never lost if the user closes the modal, then
// opens in edit mode so any changes update the same record.
// ==============================
async function openRecipeModalFromPhoto(recipeData) {
    try {
        // ── Step 1: Auto-save immediately ─────────────────────
        // Build ingredient rows first so we can save them.
        const allStores = getAllStores();
        const defaultStore = state.data.defaultStoreName || allStores[0]?.name || "";

        ingredientRows = (recipeData.ingredients || []).map(ing => ({
            id: makeId(),
            name: ing.name || "",
            qty: Number(ing.qty) || 1,
            unit: ing.unit || "CT",
            store: defaultStore,
            group: "",
            isDefault: false
        }));

        const newMeal = {
            id: makeId(),
            name: recipeData.name || "Imported Recipe",
            category: recipeData.category || "Medium Prep",
            ingredients: ingredientRows.map(ing => ({ ...ing })),
            instructions: recipeData.instructions || ""
        };

        // Save to state + Firestore before opening modal.
        // If the user closes the modal, the recipe is already saved.
        state.data.userMeals.push(newMeal);
        await persistState();

        // Only update the recipe list — don't call renderApp() here
        // as renderPlanner() can throw on some datasets and would
        // silently abort this function before the modal opens.
        renderRecipes();

        // ── Step 2: Open modal ─────────────────────────────────
        editingMealId = newMeal.id;

        document.getElementById("recipeModalTitle").textContent = "Review Imported Recipe";
        document.getElementById("modalRecipeName").value = recipeData.name || "";
        populateCategoryDropdown(recipeData.category || "");

        const instrEl = document.getElementById("modalInstructions");
        if (instrEl) instrEl.value = recipeData.instructions || "";

        renderIngredientsEditor();
        updateReview();

        // Scroll modal content to top before showing (important on mobile)
        const modalContent = document.querySelector("#recipeModal .modal-content");
        if (modalContent) modalContent.scrollTop = 0;

        showModal(true);

        // Set step AFTER showModal so updateStepUI works on visible elements
        currentStep = 2;
        updateStepUI();

    } catch (err) {
        console.error("❌ openRecipeModalFromPhoto failed:", err);
        alert("Recipe was saved but there was a display error. Find it in your Recipes list and tap Edit to review.");
    }
}


function closeRecipeModal() {
    showModal(false);
}

function showModal(show) {
    const modal = document.getElementById("recipeModal");
    if (!modal) return;
    if (show) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
    }
}

// allow ESC to close
document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeRecipeModal();
});

// ==============================
// CATEGORY DROPDOWN (STEP 1)
// ==============================
function populateCategoryDropdown(selected) {
    const sel = document.getElementById("modalRecipeCategory");
    if (!sel) return;

    sel.innerHTML = "";
    getAllCategories().forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === selected) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ==============================
// MODAL STEPS
// ==============================
function goToStep(stepNumber) {
    // basic validation when moving forward
    if (stepNumber === 2 || stepNumber === 3) {
        const name = document.getElementById("modalRecipeName").value.trim();
        const category = document.getElementById("modalRecipeCategory").value.trim();

        if (!name) {
            alert("Please enter a meal name.");
            currentStep = 1;
            updateStepUI();
            return;
        }
        if (!category) {
            alert("Please select a category.");
            currentStep = 1;
            updateStepUI();
            return;
        }
    }

    if (stepNumber === 3) {
        syncIngredientsFromDOM();
        updateReview();
    }

    currentStep = stepNumber;
    updateStepUI();
}

function updateStepUI() {
    const step1 = document.getElementById("modalStep1");
    const step2 = document.getElementById("modalStep2");
    const step3 = document.getElementById("modalStep3");
    const step4 = document.getElementById("modalStep4");

    [step1, step2, step3, step4].forEach(s => { if (s) s.classList.add("hidden"); });
    if (currentStep === 1 && step1) step1.classList.remove("hidden");
    if (currentStep === 2 && step2) step2.classList.remove("hidden");
    if (currentStep === 3 && step3) step3.classList.remove("hidden");
    if (currentStep === 4 && step4) step4.classList.remove("hidden");

    // update dots
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`stepDot${i}`);
        if (!dot) continue;
        dot.classList.toggle("active", i === currentStep);
    }
}

// ==============================
// INGREDIENT EDITOR (STEP 2)
// ==============================
function renderIngredientsEditor() {
    const container = document.getElementById("ingredientsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!ingredientRows.length) {
        const note = document.createElement("p");
        note.className = "section-note";
        note.textContent = "No ingredients yet. Tap + Add Ingredient to add some.";
        container.appendChild(note);
        return;
    }

    ingredientRows.forEach((row, index) => {
        const div = document.createElement("div");
        div.className = "ingredient-row";
        div.dataset.id = row.id;   // <-- ADD THIS LINE


        const storeOptions = getAllStores()
            .map(s => {
                const selected = row.store === s.name ? "selected" : "";
                return `<option ${selected}>${s.name}</option>`;
            })
            .join("");


        div.innerHTML = `
            <input
                type="text"
                class="ingName"
                value="${row.name || ""}"
                oninput="handleIngredientNameInput(this, ${index})"
                onkeydown="handleIngredientInputKey(this, event)"
                autocomplete="off"
            >




            <div style="display:flex; gap:0.5rem;">
                <input class="ingQty" type="number" min="1" placeholder="Qty" value="${row.qty || 1}">
                <input class="ingUnit" placeholder="Unit" value="${row.unit || "CT"}">
                <select class="ingStore">${storeOptions}</select>
            </div>

                  <div style="display:flex; gap:0.5rem; align-items:center; margin-top:0.3rem;">
                <input class="ingGroup" 
                   style="flex:1;" 
                   value="${row.group || ""}" 
                   placeholder="Substitute group"
                   data-index="${index}"
                   onfocus="showGroupSuggestions(this, ${index})"
                   onblur="setTimeout(() => {
                        const menu = document.querySelector('.group-suggest-menu');
                        const picked = window.__clickedGroupItem;

                        if (picked) {
                            this.value = picked;
                        } else {
                            handleGroupFinished(${index}, this.value);
                        }

                        delete window.__clickedGroupItem;
                        if (menu) menu.remove();
                    }, 120)"
                    >



                <div class="default-toggle ${row.isDefault ? "active" : ""}" onclick="toggleDefault(${index})">
                    ${row.isDefault ? "⭐ Default" : "☆ Make Default"}
                </div>
                <button class="danger" style="margin-left:0.3rem;" onclick="removeIngredientRow(${index})">Remove</button>
            </div>
        `;

        container.appendChild(div);
        
        // ✅ ADD EVENT LISTENER FOR GROUP INPUT (attach after element is in DOM)
        const groupInput = div.querySelector('.ingGroup');
        if (groupInput) {
            groupInput.addEventListener('input', function() {
                const idx = parseInt(this.dataset.index);
                ingredientRows[idx].group = this.value;
                showGroupSuggestions(this, idx);
            });
        }
    });
}


function addIngredientRow() {
    // Sync what the user already typed BEFORE adding a new row
    syncIngredientsFromDOM();

    const allStores = getAllStores();
    const defaultStore = state.data.defaultStoreName || allStores[0]?.name || "";


    ingredientRows.push({
        id: makeId(),   // <-- Correct fixed ID assignment
        name: "",
        qty: 1,
        unit: "CT",
        store: defaultStore,
        group: "",
        isDefault: false
    });

    renderIngredientsEditor();
}



function removeIngredientRow(idx) {
    ingredientRows.splice(idx, 1);
    renderIngredientsEditor();
}
function toggleDefault(idx) {
    // Sync first so nothing gets erased
    syncIngredientsFromDOM();

    const group = ingredientRows[idx].group.trim();

    if (!group) {
        alert("Set a substitute group name first.");
        return;
    }

    // Clear defaults for this group
    ingredientRows.forEach(r => {
        if (r.group === group) r.isDefault = false;
    });

    // Set this one as default
    ingredientRows[idx].isDefault = true;

    // Re-render UI
    renderIngredientsEditor();
}



// read latest values from DOM into ingredientRows before review/save
function syncIngredientsFromDOM() {
    const container = document.getElementById("ingredientsContainer");
    if (!container) return;

    const rows = container.querySelectorAll(".ingredient-row");

    ingredientRows = Array.from(rows).map(rowEl => {
        const id = rowEl.dataset.id || makeId();

        return {
            id,
            name: rowEl.querySelector(".ingName").value.trim(),
            qty: Number(rowEl.querySelector(".ingQty").value) || 1,
            unit: (rowEl.querySelector(".ingUnit").value || "CT").trim(),
            store: rowEl.querySelector(".ingStore").value,
            group: rowEl.querySelector(".ingGroup").value.trim(),
            isDefault: rowEl.querySelector(".default-toggle").classList.contains("active")
        };
    });
}

// Return the list of "active" ingredients for a meal:
//  - all non-grouped ingredients
//  - exactly 1 ingredient per substitute group, default or user-selected
function getActiveIngredientsForMeal(meal) {
    if (!meal || !Array.isArray(meal.ingredients)) {
        console.warn("[ING] Meal has no valid ingredients:", meal);
        return [];
    }

    const ingredients = meal.ingredients;
    const groupsMap = {};
    const ungrouped = [];

    // Separate grouped vs ungrouped
    ingredients.forEach(ing => {
        if (!ing || !ing.id) return; // ignore corrupt ingredient objects

        if (ing.group) {
            if (!groupsMap[ing.group]) groupsMap[ing.group] = [];
            groupsMap[ing.group].push(ing);
        } else {
            ungrouped.push(ing);
        }
    });

    const result = [...ungrouped];

    // Load user's selected substitutes
    const selectionsForMeal =
        state.ui.plannerSubstituteSelections?.[meal.id] || {};

    // Handle groups safely
    Object.keys(groupsMap).forEach(groupName => {
        const groupIngs = groupsMap[groupName];
        if (!groupIngs.length) return;

        const defaultIng =
            groupIngs.find(i => i.isDefault) || groupIngs[0];

        const selectedId =
            selectionsForMeal[groupName] || defaultIng.id;

        const activeIng =
            groupIngs.find(i => i.id === selectedId) || defaultIng;

        if (activeIng) result.push(activeIng);
    });

    return result;
}

function openSubstituteModal(mealId, groupName) {

    // 🔥 SAFETY CHECK:
    // If the recipe editor is using the modal, do NOT open the planner modal.
    // handleGroupFinished() uses "__recipe_edit__" as the indicator.
    if (mealId === "__recipe_edit__") return;

    // Store modal context
    subModalMealId = mealId;
    subModalGroupName = groupName;

    const meal = getAllMeals().find(m => m.id === mealId);
    if (!meal) return;

    // ---------------------------------------------------------
    // 1. Collect ALL ingredients across all meals for this group
    // ---------------------------------------------------------
    const options = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                options.push({ ...ing, _mealId: m.id });
            }
        });
    });

    if (!options.length) return; // should never happen

    // ---------------------------------------------------------
    // 2. Determine THIS recipe's default ingredient for this group
    // ---------------------------------------------------------
    const recipeDefaults = (meal.ingredients || []).filter(
        ing => ing.group === groupName && ing.isDefault
    );

    const recipeDefaultId =
        recipeDefaults.length ? recipeDefaults[0].id : null;

    // ---------------------------------------------------------
    // 3. Determine CURRENT selected ingredient (user override)
    // ---------------------------------------------------------
    const selectionsForMeal = state.ui.plannerSubstituteSelections[mealId] || {};

    const selectedId =
        selectionsForMeal[groupName] ||      // user selection
        recipeDefaultId ||                   // recipe default
        options[0].id;                       // fallback

    // ---------------------------------------------------------
    // 4. Render the modal UI
    // ---------------------------------------------------------
    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

    options.forEach(ing => {
        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

        // Only show "default" label if default for THIS recipe
        const isDefaultLabel =
            recipeDefaultId && ing.id === recipeDefaultId
                ? " ⭐ default"
                : "";

        const row = document.createElement("label");
        row.style.display = "block";
        row.style.marginBottom = "0.4rem";
        row.innerHTML = `
            <input 
                type="radio" 
                name="subChoice" 
                value="${ing.id}"
                ${ing.id === selectedId ? "checked" : ""}
            >
            ${ing.name}${qtyPart}${isDefaultLabel}
        `;
        body.appendChild(row);
    });

    // Open modal
    const modal = document.getElementById("subModal");
    if (modal) modal.classList.remove("hidden");
}

// When user finishes typing a group name in recipe editor
function handleGroupFinished(index, groupName) {
    groupName = groupName.trim();
    if (!groupName) return;

    // Build list of ALL ingredients across ALL meals that belong to this group
    const matches = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                matches.push(ing);
            }
        });
    });

    // NEW RULE:
    // If group exists 0 times → do nothing
    if (matches.length === 0) return;

    // Load modal body
    const body = document.getElementById("subModalBody");
    if (!body) return;

    body.innerHTML = "";

    // Show all existing global ingredients (even if only one)
    matches.forEach(ing => {
        const qty = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
        const row = document.createElement("label");
        row.style.display = "block";
        row.style.margin = "0.35rem 0";
        row.innerHTML = `
            <input type="radio" name="reuseChoice" value="${ing.id}">
            ${ing.name}${qty}
        `;
        body.appendChild(row);
    });

    // Always allow creating a brand-new ingredient
    const addNew = document.createElement("label");
    addNew.style.display = "block";
    addNew.style.margin = "0.7rem 0 0.3rem";
    addNew.innerHTML = `
        <input type="radio" name="reuseChoice" value="__new__">
        Add a brand-new ingredient
    `;
    body.appendChild(addNew);

    // Store which ingredient row is being edited
    subModalMealId = "__recipe_edit__";
    subModalGroupName = groupName;
    subModalIngredientIndex = index;

    // Open modal
    document.getElementById("subModal").classList.remove("hidden");
}

function getGlobalGroupIngredients(groupName) {
    const results = [];
    getAllMeals().forEach(m => {
        (m.ingredients || []).forEach(ing => {
            if (ing.group === groupName) {
                results.push({ ...ing, _mealId: m.id });
            }
        });
    });
    return results;
}

function closeSubstituteModal() {
    const modal = document.getElementById("subModal");
    if (modal) modal.classList.add("hidden");

    // 🔥 Reset ALL modal context values
    subModalMealId = null;
    subModalGroupName = null;
    subModalIngredientIndex = null;

    // Also clear modal body so old options never appear again
    const body = document.getElementById("subModalBody");
    if (body) body.innerHTML = "";
}


async function applySubstituteChoice() {
    // ----------------------------------------------------
    // MODE 1: Choosing an ingredient inside the RECIPE EDITOR
    // ----------------------------------------------------
    if (subModalMealId === "__recipe_edit__") {
        const selected = document.querySelector('input[name="reuseChoice"]:checked');
        if (!selected) {
            closeSubstituteModal();
            return;
        }

        const choice = selected.value;

        // If reusing an existing ingredient from another meal
        if (choice !== "__new__") {
            const ing = findIngredientById(choice);
            if (ing) {
                ingredientRows[subModalIngredientIndex].name = ing.name;
                ingredientRows[subModalIngredientIndex].qty = ing.qty;
                ingredientRows[subModalIngredientIndex].unit = ing.unit;
                ingredientRows[subModalIngredientIndex].store = ing.store;

                // ⚠️ Importantly DO NOT copy over defaults or IDs
                // The ingredient still belongs to THIS recipe as a new instance
            }
        }

        renderIngredientsEditor();
        closeSubstituteModal();
        scheduleGroceryRebuild();
        return;
    }

    // ----------------------------------------------------
    // MODE 2: Selecting a substitute for the Planner
    // ----------------------------------------------------
    const selected = document.querySelector('input[name="subChoice"]:checked');
    if (!selected) {
        closeSubstituteModal();
        return;
    }

    const ingId = selected.value;

    // Ensure dictionary entry exists
    if (!state.ui.plannerSubstituteSelections[subModalMealId]) {
        state.ui.plannerSubstituteSelections[subModalMealId] = {};
    }

    // Save selection
    state.ui.plannerSubstituteSelections[subModalMealId][subModalGroupName] = ingId;

    await persistState();
    closeSubstituteModal();
    renderPlanner();
}

function findIngredientById(id) {
    for (const meal of state.data.userMeals) {
        for (const ing of (meal.ingredients || [])) {
            if (ing.id === id) return ing;
        }
    }
    return null;
}



// ==============================
// PLANNER TAB
// ==============================
function renderPlanner() {
    const container = document.getElementById("plannerContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!getAllMeals().length) {
        container.innerHTML = `<p class="section-note">No meals yet. Add recipes first.</p>`;
        renderPlannerExtras();
        return;
    }

    // Group meals by category
    const byCategory = {};
    getAllMeals().forEach(meal => {
        const cat = meal.category || "Uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(meal);
    });

    // Sort categories alphabetically for consistency
    Object.keys(byCategory).sort().forEach(cat => {
        const catWrapper = document.createElement("div");
        catWrapper.className = "planner-category";

        const isCollapsedCategory = state.ui.collapsedCategories.includes(cat);

        // Category header (accordion)
        const header = document.createElement("div");
        header.className = "planner-category-header";
        header.onclick = () => toggleCategory(cat);
        header.innerHTML = `
            <span class="chevron">${isCollapsedCategory ? "▶" : "▼"}</span>
            <span>${cat}</span>
        `;
        catWrapper.appendChild(header);

        // Meals list (only if category is not collapsed)
        if (!isCollapsedCategory) {
            byCategory[cat].forEach(meal => {
                const mealRow = document.createElement("div");
                mealRow.className = "planner-meal-block";

                const isSelected = state.ui.plannerMeals.includes(meal.id);

                // main row container
                const mainRow = document.createElement("label");
                mainRow.className = "planner-meal-row";

                const multiplier = state.ui.plannerMealMultipliers[meal.id] || 1;
                const isMealCollapsed = state.ui.collapsedMeals[meal.id] === true;

                mainRow.innerHTML = `
                    <input 
                        type="checkbox"
                        ${isSelected ? "checked" : ""}
                        onchange="togglePlannerMeal('${meal.id}')"
                        onclick="event.stopPropagation();"
                    >

                    <span 
                        class="meal-collapse-toggle"
                        onclick="event.stopPropagation(); toggleMealCollapse('${meal.id}')"
                        style="cursor:pointer; user-select:none; margin-right:6px;"
                    >
                        ${isMealCollapsed ? "▶" : "▼"}
                    </span>

                    <span>${meal.name}</span>

                    <select 
                        class="meal-multiplier"
                        onchange="updateMealMultiplier('${meal.id}', this.value)"
                        style="margin-left:8px; padding:2px 6px;"
                    >
                        <option value="1" ${multiplier==1 ? "selected" : ""}>1×</option>
                        <option value="2" ${multiplier==2 ? "selected" : ""}>2×</option>
                        <option value="3" ${multiplier==3 ? "selected" : ""}>3×</option>
                        <option value="4" ${multiplier==4 ? "selected" : ""}>4×</option>
                        <option value="5" ${multiplier==5 ? "selected" : ""}>5×</option>
                    </select>
                `;

                mealRow.appendChild(mainRow);

                // If selected & not collapsed at meal or category level, show ingredients
                if (isSelected && !isMealCollapsed && !isCollapsedCategory) {
                    const ingDiv = document.createElement("div");
                    ingDiv.className = "planner-ingredients";

                    let activeIngredients = [];
                    try {
                        activeIngredients = getActiveIngredientsForMeal(meal) || [];
                    } catch (e) {
                        console.error("Error in getActiveIngredientsForMeal (planner) for meal:", meal.id, e);
                        activeIngredients = [];
                    }

                    if (!activeIngredients.length) {
                        const placeholder = document.createElement("div");
                        placeholder.className = "planner-ingredient-check";
                        placeholder.innerHTML = `<span class="muted">(No ingredients)</span>`;
                        ingDiv.appendChild(placeholder);
                        mealRow.appendChild(ingDiv);
                    } else {
                        activeIngredients.forEach(ing => {
                            const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";

                            if (!state.ui.plannerIngredientChecks[meal.id]) {
                                state.ui.plannerIngredientChecks[meal.id] = {};
                            }
                            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
                            }

                            const checked = state.ui.plannerIngredientChecks[meal.id][ing.id];
                            const existingComment =
                                state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

                            const line = document.createElement("div");
                            line.className = "planner-ingredient-check";

                            let inner = `
                                <input 
                                    type="checkbox"
                                    ${checked ? "checked" : ""}
                                    onclick="togglePlannerIngredient('${meal.id}', '${ing.id}')"
                                >
                                <span>${ing.name}${qtyPart} <span class="muted">– ${ing.store}</span></span>

                                <input 
                                    type="text"
                                    class="ing-comment"
                                    placeholder="Comment"
                                    value="${existingComment}"
                                    oninput="updateIngredientComment('${meal.id}', '${ing.id}', this.value)"
                                    style="margin-left:8px; flex:1;"
                                >
                            `;

                            if (ing.group) {
                                inner += `
                                    <button 
                                        class="primary" 
                                        style="margin-left:8px; white-space:nowrap;"
                                        onclick="openSubstituteModal('${meal.id}', '${ing.group}')"
                                    >
                                        Swap
                                    </button>
                                `;
                            }

                            line.innerHTML = inner;
                            ingDiv.appendChild(line);
                        });

                        mealRow.appendChild(ingDiv);
                    }
                }

                catWrapper.appendChild(mealRow);
            });
        }

        container.appendChild(catWrapper);
    });

    // Render extras under planner
    renderPlannerExtras();
}


async function updateMealMultiplier(mealId, value) {
    state.ui.plannerMealMultipliers[mealId] = Number(value);
    await persistState();
    renderPlanner(); // optional: re-render preview
    scheduleGroceryRebuild();
}

async function toggleCategory(cat) {
    const idx = state.ui.collapsedCategories.indexOf(cat);
    if (idx === -1) {
        state.ui.collapsedCategories.push(cat);
    } else {
        state.ui.collapsedCategories.splice(idx, 1);
    }
    await persistState();
    renderPlanner();
}
async function expandAllPlannerCategories() {
    state.ui.collapsedCategories = [];     // open all categories
    state.ui.collapsedMeals = {};          // open all meals too (optional)
    await persistState();
    renderPlanner();
}

async function collapseAllPlannerCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedCategories = [...categories];  // collapse all categories

    // Optional: also collapse all meals
    state.ui.collapsedMeals = {};
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });

    await persistState();
    renderPlanner();
}
async function selectAllPlannerMeals() {
    // Add every meal ID to plannerMeals
    state.ui.plannerMeals = getAllMeals().map(m => m.id);

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();
}

async function unselectAllPlannerMeals() {
    // Empty selected meals list
    state.ui.plannerMeals = [];

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();

}
async function showAllIngredients() {
    // Expand ALL categories
    state.ui.collapsedCategories = [];

    // Expand ALL meals
    Object.keys(state.ui.collapsedMeals).forEach(id => {
        state.ui.collapsedMeals[id] = false;
    });

    // Make sure all meals have entries
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = false;
    });

    await persistState();
    renderPlanner();
}
async function collapseAllIngredients() {
    // Collapse ALL meals (ingredients hidden)
    getAllMeals().forEach(m => {
        state.ui.collapsedMeals[m.id] = true;
    });

    await persistState();
    renderPlanner();
}

async function toggleRecipeCategory(cat) {
    const list = state.ui.collapsedRecipeCategories || [];
    const idx = list.indexOf(cat);

    if (idx === -1) list.push(cat);
    else list.splice(idx, 1);

    state.ui.collapsedRecipeCategories = list;
    await persistState();
    renderRecipes();
}
async function expandAllRecipeCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedRecipeCategories = []; // expand everything
    await persistState();
    renderRecipes();
}

async function collapseAllRecipeCategories() {
    const categories = Object.keys(
        getAllMeals().reduce((acc, meal) => {
            acc[meal.category || "Uncategorized"] = true;
            return acc;
        }, {})
    );

    state.ui.collapsedRecipeCategories = [...categories]; // collapse all
    await persistState();
    renderRecipes();
}

async function updateIngredientComment(mealId, ingId, text) {
    if (!state.ui.plannerIngredientComments[mealId]) {
        state.ui.plannerIngredientComments[mealId] = {};
    }
    state.ui.plannerIngredientComments[mealId][ingId] = text;
    await persistState();
}


async function togglePlannerMeal(mealId) {
    const idx = state.ui.plannerMeals.indexOf(mealId);
    if (idx === -1) {
        state.ui.plannerMeals.push(mealId);
    } else {
        state.ui.plannerMeals.splice(idx, 1);
    }

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();   // 🔥 auto-refresh grocery
}

async function togglePlannerIngredient(mealId, ingId) {
    if (!state.ui.plannerIngredientChecks[mealId]) {
        state.ui.plannerIngredientChecks[mealId] = {};
    }

    const prev = state.ui.plannerIngredientChecks[mealId][ingId];
    state.ui.plannerIngredientChecks[mealId][ingId] = !prev;

    await persistState();
    renderPlanner();
    scheduleGroceryRebuild();   // 🔥 keep grocery list in sync
}

    
function renderPlannerExtras() {

    // 🔥 Always repopulate store dropdown
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
            <span>${item.name} (${item.qty}) — <em>${item.store}</em></span>
            <button class="danger" onclick="removePlannerExtra(${idx})">Remove</button>
        `;
        list.appendChild(row);
    });
}
function renderStoresTab() {
    const globalDiv = document.getElementById("globalStoresList");
    const userDiv = document.getElementById("userStoresList");
    const currentDefault = state.data.defaultStoreName || "";

    // Render global stores
    globalDiv.innerHTML = GLOBAL_STORES
        .map(store => {
            const safeName = store.name.replace(/'/g, "\\'");
            return `
            <div class="store-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span>${store.name}</span>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${currentDefault === store.name
                        ? `<span style="font-size:0.8rem; color:#555;">⭐ Default</span>`
                        : `<button onclick="setDefaultStore('${safeName}')">Set Default</button>`
                    }
                    <button onclick="openShopForStore('${safeName}')">Shop</button>
                </div>
            </div>`;
        })
        .join("");

    // Render user stores
    userDiv.innerHTML = (state.data.userStores || [])
        .map((s, idx) => {
            const safeName = s.name.replace(/'/g, "\\'");
            return `
            <div class="store-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span>${s.name}</span>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                    ${currentDefault === s.name
                        ? `<span style="font-size:0.8rem; color:#555;">⭐ Default</span>`
                        : `<button onclick="setDefaultStore('${safeName}')">Set Default</button>`
                    }
                    <button class="danger" onclick="removeUserStore(${idx})">Remove</button>
                </div>
            </div>`;
        })
        .join("");
}
async function setDefaultStore(storeName) {
    state.data.defaultStoreName = storeName;
    await persistState();
    renderStoresTab();
}
async function addUserStore() {
    const input = document.getElementById("newStoreName");
    const name = input.value.trim();
    if (!name) return;

    if (!state.data.userStores) state.data.userStores = [];

    // For now we only store name + id; delivery links
    // come from DELIVERY_SERVICES and use the store name.
    state.data.userStores.push({
        id: makeId(),
        name
    });

    await persistState();
    input.value = "";
    renderStoresTab();
}


async function removeUserStore(index) {
    if (!state.data.userStores) return;

    state.data.userStores.splice(index, 1);
    await persistState();
    renderStoresTab();
}


async function addPlannerExtra() {
    const nameEl = document.getElementById("plannerExtraInput");
    const qtyEl = document.getElementById("plannerExtraQty");
    const storeEl = document.getElementById("plannerExtraStore");

    const name = nameEl.value.trim();
    if (!name) return;

    const qty = Number(qtyEl.value) || 1;
    const store = storeEl.value || "";

    // Save as full object
    state.ui.plannerExtras.push({
        id: makeId(),
        name,
        qty,
        unit: "CT",
        store
      });


    await persistState();
    renderPlannerExtras(); // ONLY update the list; do NOT rerender the whole planner
    scheduleGroceryRebuild();


    nameEl.value = "";
    qtyEl.value = 1;
}


async function removePlannerExtra(index) {
    state.ui.plannerExtras.splice(index, 1);
    await persistState();
    renderPlannerExtras();
    scheduleGroceryRebuild();
}

// ==============================
// GROCERY LIST TAB
// ==============================
async function buildGroceryList() {
    const meals = getAllMeals();
    const selectedMeals = state.ui.plannerMeals || [];
    const extras = state.ui.plannerExtras || [];

    // Final structure: aisle → [ items ]
    const grouped = {};

    /* ------------------------------
       1. Gather all ingredients
    ------------------------------ */
    selectedMeals.forEach(mealId => {
        const meal = meals.find(m => m.id === mealId);
        if (!meal || !meal.ingredients) return;

        meal.ingredients.forEach(ing => {
            const storeName = ing.store || "Other";
            const rawName = ing.name || "";

            const aisle = determineAisleForIngredient(rawName);

            if (!grouped[aisle]) grouped[aisle] = [];
            grouped[aisle].push({
                name: rawName,
                qty: ing.qty || 1,
                unit: ing.unit || "",
                store: storeName
            });
        });
    });

    /* ------------------------------
       2. Add planner extras
    ------------------------------ */
    extras.forEach(item => {
        const aisle = determineAisleForIngredient(item.name);

        if (!grouped[aisle]) grouped[aisle] = [];
        grouped[aisle].push({
            name: item.name,
            qty: item.qty,
            unit: "",
            store: item.store
        });
    });

    /* ------------------------------
       3. Render Grocery List
    ------------------------------ */
    const container = document.getElementById("groceryContainer");
    container.innerHTML = "";

    const aisles = Object.keys(grouped).sort();

    aisles.forEach(aisle => {
        const card = document.createElement("div");
        card.className = "grocery-store-card";

        card.innerHTML = `<h3>${aisle}</h3>`;

        grouped[aisle].forEach(item => {
            const div = document.createElement("div");
            div.className = "grocery-item";
            div.textContent = `${item.qty} ${item.unit} ${item.name}`;
            card.appendChild(div);
        });

        container.appendChild(card);
    });

    switchTab("groceryTab");
}
// ==============================
// GROCERY ITEM CHECK-OFF
// ==============================
async function toggleGroceryItem(itemKey) {
    if (!state.ui.groceryCheckedItems) state.ui.groceryCheckedItems = {};
    state.ui.groceryCheckedItems[itemKey] = !state.ui.groceryCheckedItems[itemKey];
    await persistState();
    // Update just the checkbox row visually without full re-render
    const el = document.querySelector(`[data-grocery-key="${CSS.escape(itemKey)}"]`);
    if (el) {
        const isChecked = state.ui.groceryCheckedItems[itemKey];
        el.classList.toggle("grocery-item-checked", isChecked);
        const cb = el.querySelector("input[type=checkbox]");
        if (cb) cb.checked = isChecked;
    }
}
window.toggleGroceryItem = toggleGroceryItem;

// ==============================
// COPY GROCERY LIST
// ==============================
function copyGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) return;

    const lines = [];

    // Walk through store cards
    container.querySelectorAll(".grocery-store-card").forEach(card => {
        const storeName = card.querySelector("h3")?.textContent?.trim();
        if (storeName) lines.push(`\n🛒 ${storeName}`);

        card.querySelectorAll(".grocery-item").forEach(item => {
            const name = item.querySelector(".grocery-item-name")?.textContent?.trim();
            const aisle = item.querySelector(".grocery-item-aisle")?.textContent?.trim();
            const checked = item.classList.contains("grocery-item-checked");
            if (name) {
                const checkMark = checked ? "✓ " : "• ";
                const aisleNote = aisle ? ` (${aisle})` : "";
                lines.push(`${checkMark}${name}`);
            }
        });
    });

    if (!lines.length) {
        alert("Your grocery list is empty.");
        return;
    }

    const text = lines.join("\n").trim();
    navigator.clipboard.writeText(text).then(() => {
        // Show brief toast feedback
        const btn = document.getElementById("copyGroceryBtn");
        if (btn) {
            const original = btn.textContent;
            btn.textContent = "✓ Copied!";
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = original;
                btn.disabled = false;
            }, 2000);
        }
    }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("List copied to clipboard!");
    });
}
window.copyGroceryList = copyGroceryList;

function renderGroceryList() {
    const container = document.getElementById("groceryContainer");
    if (!container) {
        console.warn("[GL] #groceryContainer NOT FOUND");
        return;
    }

    console.group("renderGroceryList");

    container.innerHTML = "";

    const selectedMeals = getAllMeals().filter(m => state.ui.plannerMeals.includes(m.id));

    if (!selectedMeals.length && !state.ui.plannerExtras.length) {
        container.innerHTML = `<p class="section-note">Select meals in the Planner and click "Build Grocery List".</p>`;
        console.groupEnd();
        return;
    }

    const itemsByStore = {};

    function addItem(store, ingObj) {
        const storeKey = store || "Other";
        const aisle = determineAisleForIngredient(ingObj.name);

        if (!itemsByStore[storeKey]) itemsByStore[storeKey] = {};
        if (!itemsByStore[storeKey][aisle]) itemsByStore[storeKey][aisle] = [];

        itemsByStore[storeKey][aisle].push({
            name: ingObj.name,
            qty: ingObj.qty || 1,
            unit: ingObj.unit || "CT",
            comment: ingObj.comment || ""
        });
    }


    // 1. ADD INGREDIENTS FROM SELECTED MEALS
    selectedMeals.forEach(meal => {
        let activeIngredients = [];

        try {
            activeIngredients = getActiveIngredientsForMeal(meal) || [];
        } catch (e) {
            console.error("ING ERROR:", e);
            activeIngredients = [];
        }

        activeIngredients.forEach(ing => {
            if (!ing) return;

            if (!state.ui.plannerIngredientChecks[meal.id]) {
                state.ui.plannerIngredientChecks[meal.id] = {};
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === undefined) {
                state.ui.plannerIngredientChecks[meal.id][ing.id] = true;
            }
            if (state.ui.plannerIngredientChecks[meal.id][ing.id] === false) return;

            const comment =
                state.ui.plannerIngredientComments?.[meal.id]?.[ing.id] || "";

            const mult = state.ui.plannerMealMultipliers[meal.id] || 1;

            addItem(ing.store, {
                name: ing.name,
                qty: ing.qty * mult,
                unit: ing.unit,
                comment
            });

        });
    });

    // 2. ADD PLANNER EXTRAS
    state.ui.plannerExtras.forEach(item => {
        addItem(item.store, {
            name: item.name,
            qty: item.qty,
            unit: item.unit || "CT"
        });
    });

        // 3. MERGE DUPLICATES (per store + aisle)
        for (const storeName of Object.keys(itemsByStore)) {
            const aislesObj = itemsByStore[storeName]; // { aisleName: [items...] }

            Object.keys(aislesObj).forEach(aisleName => {
                const merged = {};

                aislesObj[aisleName].forEach(item => {
                    const name = (item.name || "").trim();
                    const unit = (item.unit || "CT").trim();
                    const qty  = item.qty || 1;

                    const key = name.toLowerCase() + "|" + unit.toLowerCase();

                    if (!merged[key]) {
                        merged[key] = { name, qty, unit };
                    } else {
                        merged[key].qty += qty;
                    }
                });

                aislesObj[aisleName] = Object.values(merged);
            });
        }

        // 4. RENDER GROCERY LIST TO SCREEN (stores → aisles → items)
        const storeKeys = Object.keys(itemsByStore).sort();

        storeKeys.forEach(storeName => {
            const card = document.createElement("div");
            card.className = "grocery-store-card";

            const headerRow = document.createElement("div");
            headerRow.className = "grocery-store-header";
            headerRow.style.display = "flex";
            headerRow.style.alignItems = "center";
            headerRow.style.justifyContent = "space-between";

            const title = document.createElement("h3");
            title.textContent = storeName;

            const storeInfo = findStoreByName(storeName);
            const buttonGroup = document.createElement("div");
            buttonGroup.className = "grocery-store-actions";

            // SHOP button (only for global stores with a home link)
            if (storeInfo && storeInfo.storeHomeUrl) {
                const shopBtn = document.createElement("button");
                shopBtn.className = "primary";
                shopBtn.textContent = "Shop";
                shopBtn.style.marginRight = "6px";
                shopBtn.onclick = () => {
                    window.open(storeInfo.storeHomeUrl, "_blank", "noopener,noreferrer");
                };
                buttonGroup.appendChild(shopBtn);
            }

            // DELIVERY SERVICE BUTTONS (Instacart, DoorDash, etc.)
            DELIVERY_SERVICES.forEach(service => {
                // Check for store-specific override URL first
                const storeSpecificKey = service.id + "Url"; // e.g. "instacartUrl"
                const url = (storeInfo && storeInfo[storeSpecificKey])
                    ? storeInfo[storeSpecificKey]
                    : service.storeUrl.replace("{STORE}", encodeURIComponent(storeName.toLowerCase()));

                const btn = document.createElement("button");
                btn.className = service.buttonClass || "secondary";
                btn.textContent = service.name;
                btn.style.marginLeft = "4px";
                btn.onclick = () => {
                    window.open(url, "_blank", "noopener,noreferrer");
                };

                buttonGroup.appendChild(btn);
            });

            headerRow.appendChild(title);
            headerRow.appendChild(buttonGroup);
            card.appendChild(headerRow);

            // ITEMS, grouped by aisle
            const aislesObj = itemsByStore[storeName];
            const aisleNames = Object.keys(aislesObj).sort();

            // Render items sorted by aisle, but without aisle group headers
            Object.keys(aislesObj).sort().forEach(aisle => {
                aislesObj[aisle].forEach(item => {
                  const qtyPart = item.qty > 1 ? ` (${item.qty} ${item.unit})` : "";

                  // Build a stable key from store + item name for persistence
                  const itemKey = `${storeName}::${item.name}::${aisle}`;
                  const isChecked = !!(state.ui.groceryCheckedItems?.[itemKey]);

                  const row = document.createElement("div");
                  row.className = "grocery-item" + (isChecked ? " grocery-item-checked" : "");
                  row.dataset.groceryKey = itemKey;

                  // CHECKBOX
                  const cb = document.createElement("input");
                  cb.type = "checkbox";
                  cb.checked = isChecked;
                  cb.className = "grocery-checkbox";
                  cb.onchange = () => toggleGroceryItem(itemKey);

                  // LEFT SIDE — item text
                  const left = document.createElement("span");
                  left.className = "grocery-item-name";
                  left.textContent = `${item.name}${qtyPart}`;

                  // RIGHT SIDE — aisle text (grey)
                  const right = document.createElement("span");
                  right.className = "grocery-item-aisle";
                  right.textContent = aisle;

                  row.appendChild(cb);
                  row.appendChild(left);
                  row.appendChild(right);

                  card.appendChild(row);
              });
            });


            container.appendChild(card);
        });

        console.groupEnd();
    }


// ==============================
// REVIEW PANEL (STEP 3)
// ==============================
function updateReview() {
    const name = document.getElementById("modalRecipeName").value.trim();
    const category = document.getElementById("modalRecipeCategory").value.trim();
    const instructions = document.getElementById("modalInstructions").value.trim();

    document.getElementById("reviewName").textContent = name || "(none)";
    document.getElementById("reviewCategory").textContent = category || "(none)";

    const list = document.getElementById("reviewIngredients");
    list.innerHTML = "";

    ingredientRows.forEach(ing => {
        const li = document.createElement("li");
        const qtyPart = ing.qty > 1 ? ` (${ing.qty} ${ing.unit})` : "";
        const groupPart = ing.group ? ` [${ing.group}]` : "";
        li.textContent = `${ing.name}${qtyPart}${groupPart} – ${ing.store}`;
        list.appendChild(li);
    });

    // Show instructions block in review only if there are instructions
    const instrBlock = document.getElementById("reviewInstructionsBlock");
    const instrEl = document.getElementById("reviewInstructions");
    if (instrBlock && instrEl) {
        if (instructions) {
            instrEl.textContent = instructions;
            instrBlock.style.display = "block";
        } else {
            instrBlock.style.display = "none";
        }
    }
}

// ── Recipe cover photo: select / preview ──────────────────
function handleRecipePhotoSelected(input) {
    const file = input.files[0];
    if (!file || !file.type.startsWith("image/")) return;
 
    selectedRecipePhotoFile = file;
 
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("recipePhotoPreview");
        const wrap = document.getElementById("recipePhotoPreviewWrap");
        preview.src = e.target.result;
        wrap.classList.remove("hidden");
        document.getElementById("recipePhotoAddBtn").style.display = "none";
    };
    reader.readAsDataURL(file);
}
 
// ── Recipe cover photo: remove (clears pending file AND any existing URL) ──
function removeRecipePhoto() {
    selectedRecipePhotoFile = null;
    currentRecipePhotoUrl = null;
 
    document.getElementById("recipePhotoPreviewWrap").classList.add("hidden");
    document.getElementById("recipePhotoPreview").src = "";
    document.getElementById("recipePhotoFileInput").value = "";
    document.getElementById("recipePhotoAddBtn").style.display = "inline-block";
}
 
// ── Compress + upload to Firebase Storage, return a download URL ──
// Keeps photo files small (max ~1200px) so Storage costs and load
// times stay low. Returns null if there's no photo to attach.
function compressRecipePhoto(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
 
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
 
            const MAX_DIMENSION = 1200;
            let { width, height } = img;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height / width) * MAX_DIMENSION);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width / height) * MAX_DIMENSION);
                    height = MAX_DIMENSION;
                }
            }
 
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
 
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
                "image/jpeg",
                0.8
            );
        };
 
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image"));
        };
 
        img.src = objectUrl;
    });
}
 
async function uploadRecipePhotoIfNeeded(mealId) {
    // No new file selected — keep whatever URL already exists (or null if removed)
    if (!selectedRecipePhotoFile) {
        return currentRecipePhotoUrl;
    }
 
    const blob = await compressRecipePhoto(selectedRecipePhotoFile);
    const path = `recipePhotos/${state.user.id}/${mealId}.jpg`;
    const fileRef = storageRef(storage, path);
 
    await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(fileRef);
 
    selectedRecipePhotoFile = null;
    currentRecipePhotoUrl = url;
    return url;
}
 
// ==============================
// SAVE RECIPE (FROM STEP 3)
// ==============================
    async function saveRecipe() {
        syncIngredientsFromDOM();
 
        const name = document.getElementById("modalRecipeName").value.trim();
        const category = document.getElementById("modalRecipeCategory").value.trim();
        const instructions = document.getElementById("modalInstructions").value.trim();
 
        const mealId = editingMealId || makeId();
 
        // Upload photo (if a new one was picked) BEFORE building mealData,
        // so the URL is ready to attach in one save.
        let photoUrl = null;
        try {
            photoUrl = await uploadRecipePhotoIfNeeded(mealId);
        } catch (err) {
            console.error("❌ Photo upload failed:", err);
            alert("Recipe will be saved, but the photo couldn't be uploaded. Try again from Edit.");
        }
 
        const mealData = {
            id: mealId,
            name,
            category,
            ingredients: ingredientRows,
            instructions,
            photoUrl: photoUrl || null
        };
 
        const idx = state.data.userMeals.findIndex(m => m.id === editingMealId);
 
        if (idx !== -1) {
            state.data.userMeals[idx] = mealData;
        } else {
            state.data.userMeals.push(mealData);
        }
 
        await persistState();
        closeRecipeModal();
        renderRecipes();
        renderPlanner();
    }
// ============================================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE FOR HTML onclick HANDLERS
// ADD THIS SECTION TO THE END OF YOUR app.js FILE
// ============================================================

// ES modules have their own scope - we need to expose functions
// that are called from HTML inline onclick handlers

// Toggle one recipe panel (ingredients OR instructions) and close the other
function toggleRecipePanel(showId, hideId) {
    const showEl = document.getElementById(showId);
    const hideEl = document.getElementById(hideId);
    if (!showEl) return;
    const isOpen = showEl.style.display !== "none";
    // Close both first, then open the target if it was closed
    if (hideEl) hideEl.style.display = "none";
    showEl.style.display = isOpen ? "none" : "block";
}
window.toggleRecipePanel = toggleRecipePanel;

window.openRecipeModalNew = openRecipeModalNew;
window.openRecipeModalEdit = openRecipeModalEdit;
window.closeRecipeModal = closeRecipeModal;
window.deleteRecipe = deleteRecipe;
window.expandAllRecipeCategories = expandAllRecipeCategories;
window.collapseAllRecipeCategories = collapseAllRecipeCategories;

window.expandAllPlannerCategories = expandAllPlannerCategories;
window.collapseAllPlannerCategories = collapseAllPlannerCategories;
window.showAllIngredients = showAllIngredients;
window.collapseAllIngredients = collapseAllIngredients;
window.selectAllPlannerMeals = selectAllPlannerMeals;
window.unselectAllPlannerMeals = unselectAllPlannerMeals;
window.addPlannerExtra = addPlannerExtra;
window.removePlannerExtra = removePlannerExtra;
window.buildGroceryList = buildGroceryList;
window.exportAppData = exportAppData;
window.importAppData = importAppData;

window.addUserCategory = addUserCategory;
window.removeUserCategory = removeUserCategory;
window.addUserStore = addUserStore;
window.removeUserStore = removeUserStore;
window.setDefaultStore = setDefaultStore;

// Global Recipes (imported from globalRecipes.js)
window.publishToGlobal = publishToGlobal;
window.importGlobalRecipe = importGlobalRecipe;
window.removeGlobalImport = removeGlobalImport;
window.deleteFromGlobal = deleteFromGlobal;
window.toggleGlobalRecipeIngredients = toggleGlobalRecipeIngredients;
window.toggleGlobalRecipeInstructions = toggleGlobalRecipeInstructions;
window.setGlobalRecipesSearch = setGlobalRecipesSearch;
window.setGlobalRecipesSort = setGlobalRecipesSort;
window.refreshGlobalRecipes = refreshGlobalRecipes;

window.togglePlannerMeal = togglePlannerMeal;
window.togglePlannerIngredient = togglePlannerIngredient;
window.toggleMealCollapse = toggleMealCollapse;
window.toggleRecipeCategory = toggleRecipeCategory;
window.updateMealMultiplier = updateMealMultiplier;
window.updateIngredientComment = updateIngredientComment;
window.openSubstituteModal = openSubstituteModal;
window.closeSubstituteModal = closeSubstituteModal;
window.applySubstituteChoice = applySubstituteChoice;

window.goToStep = goToStep;
window.addIngredientRow = addIngredientRow;
window.removeIngredientRow = removeIngredientRow;
window.toggleDefault = toggleDefault;
window.handleRecipePhotoSelected = handleRecipePhotoSelected;
window.removeRecipePhoto = removeRecipePhoto;
window.saveRecipe = saveRecipe;
window.handleGroupFinished = handleGroupFinished;
window.showGroupSuggestions = showGroupSuggestions;
window.handleIngredientNameInput = handleIngredientNameInput;
window.handleIngredientInputKey = handleIngredientInputKey;
window.state = state;
window.makeId = makeId;
window.persistState = persistState;
window.renderApp = renderApp;

// Photo Import (imported from photoImport.js)
window.openRecipeModalFromPhoto = openRecipeModalFromPhoto;
window.openPhotoImportModal  = openPhotoImportModal;
window.closePhotoImportModal = closePhotoImportModal;
window.handleIngredientPhotosSelected = handleIngredientPhotosSelected;
window.handleInstructionPhotosSelected = handleInstructionPhotosSelected;
window.toggleSplitInstructions = toggleSplitInstructions;
window.removePhoto = removePhoto;
window.importRecipeFromPhoto = importRecipeFromPhoto;

console.log("✅ All functions exposed to global scope");
// ============================================================
// DEBUG HELPERS (for console testing)
// ============================================================
window.debugState = () => {
    console.log("Current state:", state);
    console.log("User ID:", state.user.id);
    console.log("Meals:", state.data.userMeals.length);
    console.log("Firestore enabled:", !!state.user.id);
};

window.forceSave = async () => {
    console.log("🔧 Force saving to Firestore...");
    if (state.user.id) {
        const ref = doc(db, "users", state.user.id);
        await setDoc(ref, {
            appState: getCurrentAppState(),
            lastActive: serverTimestamp()
        }, { merge: true });
        console.log("✅ Force save complete");
    } else {
        console.error("❌ No user ID");
    }
};

window.clearFirestore = async () => {
    if (confirm("⚠️ Delete ALL Firestore data for this user?")) {
        const ref = doc(db, "users", state.user.id);
        await setDoc(ref, {
            appState: getCurrentAppState(),
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
        });
        console.log("✅ Firestore cleared and reset");
    }
};

// Use in browser console:
// debugState()     - view current state
// forceSave()      - immediately save to Firestore
// clearFirestore() - reset Firestore data
