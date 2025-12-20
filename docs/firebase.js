// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Your actual config (already working)
const firebaseConfig = {
  apiKey: "AIzaSyDE1aDCqaUomVzAeQhyLPvFxUTb6Jm5Cp8",
  authDomain: "meal-grocery-planner.firebaseapp.com",
  projectId: "meal-grocery-planner",
  storageBucket: "meal-grocery-planner.appspot.com",
  messagingSenderId: "1064158049824",
  appId: "1:1064158049824:web:e50f951ef3f23cc988ee45"
};

// ✅ Initialize FIRST
export const app = initializeApp(firebaseConfig);

// ✅ THEN services
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Firebase + Firestore initialized");

 
