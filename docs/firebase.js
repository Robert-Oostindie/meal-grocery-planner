// firebase.js
// ✅ Using consistent Firebase SDK version 10.7.1 throughout

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDE1aDCqaUomVzAeQhyLPvFxUTb6Jm5Cp8",
  authDomain: "meal-grocery-planner.firebaseapp.com",
  projectId: "meal-grocery-planner",
  storageBucket: "meal-grocery-planner.appspot.com",
  messagingSenderId: "1064158049824",
  appId: "1:1064158049824:web:e50f951ef3f23cc988ee45"
};

// ✅ Initialize Firebase FIRST
export const app = initializeApp(firebaseConfig);

// ✅ THEN initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Firebase initialized successfully");

 
