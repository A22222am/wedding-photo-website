import { db } from "./firebase.js";
import {
  collection, query, orderBy, onSnapshot, doc, updateDoc, increment
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const igFeed = document.getElementById("igFeed");
const q = query(collection(db, "photos"), orderBy("timestamp", "desc"));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Download tidak tersedia");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    // Fallback: buka imej asal; pengguna boleh simpan melalui menu browser.
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

onSnapshot(q, (snapshot) => {
  igFeed.replaceChildren();

  if (snapshot.empty) {
    igFeed.appendChild(el("p", "", "Belum ada gambar yang dimuat naik lagi."));
    return;
  }

  snapshot.forEach((photoDoc) => {
    const data = photoDoc.data();
    const name = typeof data.uploaderName === "string" ? data.uploaderName : "Tetamu Majlis";
    const url = typeof data.imageUrl === "string" ? data.imageUrl : "";
    const card = el("div", "ig-card");
    const header = el("div", "ig-card-header");
    header.append(
      el("div", "ig-avatar", name.charAt(0).toUpperCase()),
      el("div", "ig-uploader-info", "")
    );
    header.lastChild.appendChild(el("span", "ig-username", name));

    const image = el("img", "ig-card-img");
    image.alt = `Gambar oleh ${name}`;
    image.loading = "lazy";
    image.src = url;
    image.addEventListener("error", () => {
      image.alt = "Gambar tidak dapat dipaparkan";
      image.removeAttribute("src");
    }, { once: true });

    const link = el("a", "");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.appendChild(image);

    const actions = el("div", "ig-card-actions");
    const like = el("button", "like-btn", "❤️");
    like.type = "button";
    like.setAttribute("aria-label", "Like gambar");
    const count = el("span", "", String(Number(data.likes) || 0));
    const likeCount = el("div", "like-count");
    likeCount.append(count, document.createTextNode(" sukaan"));

    const download = el("button", "download-btn", "⬇ Download");
    download.type = "button";
    download.addEventListener("click", () =>
      downloadImage(url, `gambar-majlis-${photoDoc.id}`)
    );

    like.addEventListener("click", async () => {
      like.disabled = true;
      try {
        await updateDoc(doc(db, "photos", photoDoc.id), {
          likes: increment(1)
        });
      } catch (error) {
        console.error("Ralat Like:", error);
        alert("Tidak berjaya Like gambar. Sila cuba lagi.");
      } finally {
        like.disabled = false;
      }
    });

    actions.append(like, likeCount, download);
    card.append(header, link, actions);
    igFeed.appendChild(card);
  });
}, (error) => {
  console.error("Ralat memuatkan galeri:", error);
  igFeed.replaceChildren(el("p", "", "Galeri tidak dapat dimuatkan. Sila cuba lagi."));
});
