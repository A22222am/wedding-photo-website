import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const igFeed = document.getElementById("igFeed");
const q = query(collection(db, "photos"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
  igFeed.innerHTML = "";

  if (snapshot.empty) {
    igFeed.innerHTML = `<p style="margin-top: 30px;">Belum ada gambar yang dimuat naik lagi.</p>`;
    return;
  }

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const photoId = docSnap.id;
    const initialLetter = data.uploaderName ? data.uploaderName.charAt(0).toUpperCase() : "G";
    const likesCount = data.likes || 0;

    const card = document.createElement("div");
    card.className = "ig-card";

    card.innerHTML = `
      <div class="ig-card-header">
        <div class="ig-avatar">${initialLetter}</div>
        <div class="ig-uploader-info">
          <span class="ig-username">${data.uploaderName || "Tetamu Majlis"}</span>
        </div>
      </div>
      
      <a href="${data.imageUrl}" target="_blank">
        <img class="ig-card-img" src="${data.imageUrl}" alt="Gambar oleh ${data.uploaderName}">
      </a>

      <div class="ig-card-actions">
        <button class="like-btn" data-id="${photoId}">❤️</button>
        <div class="like-count"><span id="likes-${photoId}">${likesCount}</span> sukaan</div>
      </div>
    `;

    igFeed.appendChild(card);
  });

  // Tambah event listener untuk butang Like
  document.querySelectorAll(".like-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-id");
      const photoRef = doc(db, "photos", id);

      try {
        await updateDoc(photoRef, {
          likes: increment(1)
        });
      } catch (err) {
        console.error("Ralat kemaskini like:", err);
      }
    });
  });
});