import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHf1gDDaufUZqOSRs2fgbq4FG7V5m2k98",
  authDomain: "wedding-photo-sharing.firebaseapp.com",
  projectId: "wedding-photo-sharing",
  storageBucket: "wedding-photo-sharing.appspot.com",
  messagingSenderId: "348665006495",
  appId: "1:348665006495:web:b09826ca46fb1163c255aa"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

signInAnonymously(auth).catch((error) => {
  console.error("Ralat Auth Anonim:", error);
});

export { storage, db, auth };