// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
export const db = getFirestore(app);

const firebaseConfig = {
  apiKey: "AIzaSyDE1aDCqaUomVzAeQhyLPvFxUTb6Jm5Cp8",
  authDomain: "meal-grocery-planner.firebaseapp.com",
  projectId: "meal-grocery-planner",
  appId: "1:1064158049824:web:e50f951ef3f23cc988ee45"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => resolve(user));
});

console.log("✅ Firebase initialized once:", app.options.projectId);
