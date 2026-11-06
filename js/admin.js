import { db, auth, functions } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const grid = document.getElementById("photoGrid");
const status = document.getElementById("adminStatus");
const deletePhoto = httpsCallable(functions, "deletePhoto");
let stopListening = null;

function make(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download gagal");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = make("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function showPhotos(snapshot) {
  grid.replaceChildren();
  const senders = new Set();
  let likes = 0;

  snapshot.forEach((photo) => {
    const data = photo.data();
    senders.add(data.uploaderName || "Tetamu Majlis");
    likes += Number(data.likes) || 0;

    const card = make("article", "photo-card");
    const image = make("img");
    image.src = data.imageUrl || "";
    image.alt = `Gambar oleh ${data.uploaderName || "Tetamu Majlis"}`;
    image.loading = "lazy";

    const meta = make("div", "photo-meta");
    meta.append(
      make("p", "", `Pengirim: ${data.uploaderName || "Tetamu Majlis"}`),
      make("p", "", `Like: ${Number(data.likes) || 0}`)
    );

    const actions = make("div", "photo-actions");
    const download = make("button", "download-action", "⬇ Download");
    download.type = "button";
    download.addEventListener("click", () =>
      downloadImage(data.imageUrl, `gambar-majlis-${photo.id}`)
    );

    const remove = make("button", "delete-action", "🗑 Delete");
    remove.type = "button";
    remove.addEventListener("click", async () => {
      const confirmed = confirm(
        `Padam gambar oleh ${data.uploaderName || "Tetamu Majlis"}?\n\n` +
        "Tindakan ini akan cuba memadam gambar di ImgBB dan rekod Firestore."
      );
      if (!confirmed) return;

      remove.disabled = true;
      remove.textContent = "Memadam...";
      try {
        await deletePhoto({ photoId: photo.id });
        status.textContent = "Gambar berjaya dipadam dari ImgBB dan galeri.";
      } catch (error) {
        console.error("Delete gagal:", error);
        status.textContent = `Tidak berjaya memadam: ${error.message}`;
        remove.disabled = false;
        remove.textContent = "🗑 Delete";
      }
    });

    actions.append(download, remove);
    card.append(image, meta, actions);
    grid.appendChild(card);
  });

  document.getElementById("photoTotal").textContent = snapshot.size;
  document.getElementById("senderTotal").textContent = senders.size;
  document.getElementById("likeTotal").textContent = likes;
  if (snapshot.empty) grid.appendChild(make("p", "", "Belum ada gambar."));
}

onAuthStateChanged(auth, async (user) => {
  if (stopListening) {
    stopListening();
    stopListening = null;
  }

  if (!user) {
    location.href = "admin-login.html";
    return;
  }

  try {
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      await signOut(auth);
      location.href = "admin-login.html";
      return;
    }

    status.textContent = `Admin log masuk: ${user.email}`;
    const q = query(collection(db, "photos"), orderBy("timestamp", "desc"));
    stopListening = onSnapshot(q, showPhotos, (error) => {
      console.error(error);
      status.textContent = "Gagal membaca galeri. Semak Firestore Rules.";
    });
  } catch (error) {
    console.error(error);
    status.textContent = "Tidak dapat mengesahkan akses admin.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "admin-login.html";
});
