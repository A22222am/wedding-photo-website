import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHf1gDDaufUZqOSRs2fgbq4FG7V5m2k98",
  authDomain: "wedding-photo-sharing-24d9a.firebaseapp.com",
  projectId: "wedding-photo-sharing-24d9a",
  storageBucket: "wedding-photo-sharing-24d9a.firebasestorage.app",
  messagingSenderId: "348665006495",
  appId: "1:348665006495:web:b09826ca46fb1163c255aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app); // Default region: us-central1

export { app, db, auth, functions };
