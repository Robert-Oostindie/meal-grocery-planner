// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD1aDCqaUomVzAeQhyLPvFxUTb6Jm5Cp8",
  authDomain: "meal-grocery-planner.firebaseapp.com",
  projectId: "meal-grocery-planner",
  appId: "1:1064158049824:web:e50f951ef3f23cc988ee45"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// HARD proof of correct init
console.log("✅ Firebase initialized:", app.options.projectId);

// Promise that resolves only when auth is ready
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => {
    resolve(user);
  });
});
