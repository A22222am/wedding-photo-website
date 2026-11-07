import { db } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const igFeed = document.getElementById("igFeed");
const STORAGE_KEY = "likedPhotos";

function getLiked() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}
function saveLiked(set) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

function make(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function millis(data) {
  return data.timestamp && data.timestamp.toMillis ? data.timestamp.toMillis() : Date.now();
}

const q = query(collection(db, "photos"), orderBy("timestamp", "desc"));

onSnapshot(q, (snapshot) => {
  igFeed.replaceChildren();

  if (snapshot.empty) {
    igFeed.appendChild(make("p", "loading-text", "Belum ada gambar dimuat naik."));
    return;
  }

  const liked = getLiked();

  // Like tertinggi di atas; kalau sama, yang terbaru dulu
  const photos = snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.imageUrl)
    .sort((a, b) => {
      const diff = (Number(b.likes) || 0) - (Number(a.likes) || 0);
      return diff !== 0 ? diff : millis(b) - millis(a);
    });

  photos.forEach((photo, index) => {
    const likes = Number(photo.likes) || 0;

    const card = make("div", "ig-card");

    const link = make("a");
    link.href = photo.imageUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = make("img", "ig-card-img");
    img.src = photo.imageUrl;
    img.alt = "Gambar majlis";
    img.loading = "lazy";
    img.onerror = () => card.remove();

    link.appendChild(img);
    card.appendChild(link);

    if (index < 3 && likes > 0) {
      card.appendChild(make("span", "rank", `#${index + 1}`));
    }

    const isLiked = liked.has(photo.id);
    const btn = make("button", "like-btn" + (isLiked ? " liked" : ""), `${isLiked ? "❤" : "♡"} ${likes}`);
    btn.type = "button";
    btn.setAttribute("aria-label", "Like gambar ini");
    btn.disabled = isLiked;

    btn.addEventListener("click", async () => {
      const set = getLiked();
      if (set.has(photo.id)) return;
      btn.disabled = true;
      try {
        await updateDoc(doc(db, "photos", photo.id), { likes: increment(1) });
        set.add(photo.id);
        saveLiked(set);
      } catch (error) {
        console.error("Like gagal:", error);
        btn.disabled = false;
      }
    });

    card.appendChild(btn);
    igFeed.appendChild(card);
  });
}, (error) => {
  console.error("Ralat memuatkan galeri:", error);
  igFeed.replaceChildren(make("p", "loading-text", "Galeri tidak dapat dimuatkan."));
});