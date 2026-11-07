import { db, auth } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const grid = document.getElementById("photoGrid");
const status = document.getElementById("adminStatus");
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

function showImgbbLink(deleteUrl) {
  status.replaceChildren(
    document.createTextNode("Gambar dibuang dari galeri. "),
    Object.assign(make("a", "", "Klik sini untuk padam fail di ImgBB"), {
      href: deleteUrl,
      target: "_blank",
      rel: "noopener noreferrer"
    })
  );
}

function showPhotos(snapshot) {
  grid.replaceChildren();
  const senders = new Set();
  let likes = 0;

  snapshot.forEach((photo) => {
    const data = photo.data();
    const name = data.uploaderName || "Tetamu Majlis";
    senders.add(name);
    likes += Number(data.likes) || 0;

    const card = make("article", "photo-card");
    const image = make("img");
    image.src = data.imageUrl || "";
    image.alt = `Gambar oleh ${name}`;
    image.loading = "lazy";

    const meta = make("div", "photo-meta");
    meta.append(
      make("p", "", `Pengirim: ${name}`),
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
      if (!confirm(`Padam gambar oleh ${name} dari galeri?`)) return;

      remove.disabled = true;
      remove.textContent = "Memadam...";
      try {
        let deleteUrl = null;
        try {
          const secret = await getDoc(doc(db, "photoSecrets", photo.id));
          if (secret.exists()) deleteUrl = secret.data().deleteUrl;
        } catch (e) {
          console.warn("Tak dapat baca deleteUrl:", e);
        }

        await deleteDoc(doc(db, "photos", photo.id));
        try { await deleteDoc(doc(db, "photoSecrets", photo.id)); } catch {}

        if (deleteUrl) {
          showImgbbLink(deleteUrl);
        } else {
          status.textContent = "Gambar dibuang dari galeri. (Tiada pautan ImgBB untuk gambar ini.)";
        }
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