// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDe1aDCqaUomVzAeQhyLPvFxUTb6Jm5Cp8",
  authDomain: "meal-grocery-planner.firebaseapp.com",
  projectId: "meal-grocery-planner",
  storageBucket: "meal-grocery-planner.firebasestorage.app",
  messagingSenderId: "1064158049824",
  appId: "1:1064158049824:web:e50f951ef3f23cc988ee45",
  measurementId: "G-99D49BLDF7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// ---- AUTH BOOTSTRAP ----
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch(console.error);
    return;
  }

  // User is signed in
  window.currentUser = user;

  console.log("Firebase user:", {
    uid: user.uid,
    isAnonymous: user.isAnonymous
  });

  // Analytics example
  logEvent(analytics, "app_open");
});

export { auth, analytics };
