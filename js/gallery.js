
import { db } from "./firebase.js";

import {
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const igFeed = document.getElementById("igFeed");

// Ambil gambar daripada Firestore
const q = query(
  collection(db, "photos"),
  orderBy("timestamp", "desc")
);

// Paparkan gambar
onSnapshot(q, (snapshot) => {

  igFeed.replaceChildren();

  // Jika tiada gambar
  if (snapshot.empty) {
    const message = document.createElement("p");

    message.className = "loading-text";
    message.textContent = "Belum ada gambar dimuat naik.";

    igFeed.appendChild(message);
    return;
  }

  snapshot.forEach((photoDoc) => {

    const data = photoDoc.data();

    // Pastikan URL gambar wujud
    if (!data.imageUrl) return;

    // Card gambar
    const card = document.createElement("div");
    card.className = "ig-card";

    // Link untuk buka gambar
    const link = document.createElement("a");

    link.href = data.imageUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    // Image
    const image = document.createElement("img");

    image.className = "ig-card-img";
    image.src = data.imageUrl;
    image.alt = "Gambar majlis";
    image.loading = "lazy";

    // Jika gambar gagal dimuatkan
    image.onerror = () => {
      card.remove();
    };

    link.appendChild(image);
    card.appendChild(link);

    igFeed.appendChild(card);

  });

}, (error) => {

  console.error("Ralat memuatkan galeri:", error);

  igFeed.replaceChildren();

  const message = document.createElement("p");

  message.className = "loading-text";
  message.textContent = "Galeri tidak dapat dimuatkan.";

  igFeed.appendChild(message);

});
