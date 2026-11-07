import { db } from "./firebase.js";
import {
  collection, addDoc, setDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const IMGBB_API_KEY = "648e8301dd4f0c4c9e6f56fbba55ffd0";
const MAX_SIZE = 10 * 1024 * 1024;

const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const uploaderName = document.getElementById("uploaderName").value.trim();
  const files = Array.from(document.getElementById("photoInput").files);

  if (!uploaderName || files.length === 0) {
    statusMessage.textContent = "Sila isi nama dan pilih sekurang-kurangnya satu gambar.";
    statusMessage.style.color = "red";
    return;
  }

  const invalid = files.find((f) => !f.type.startsWith("image/") || f.size > MAX_SIZE);
  if (invalid) {
    statusMessage.textContent = "Setiap fail mestilah gambar dan tidak melebihi 10MB.";
    statusMessage.style.color = "red";
    return;
  }

  submitBtn.disabled = true;
  let uploaded = 0;
  let failed = 0;
  let lastError = "";

  try {
    for (let i = 0; i < files.length; i++) {
      statusMessage.style.color = "";
      statusMessage.textContent = `Memuat naik ${i + 1} daripada ${files.length} gambar...`;

      try {
        const body = new FormData();
        body.append("image", files[i]);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
          { method: "POST", body }
        );
        const result = await response.json();

        if (!response.ok || !result.success || !result.data?.url) {
          throw new Error(result.error?.message || "ImgBB gagal menerima gambar.");
        }

        const photoRef = await addDoc(collection(db, "photos"), {
          imageUrl: result.data.url,
          uploaderName,
          timestamp: serverTimestamp(),
          likes: 0
        });

        if (result.data.delete_url) {
          try {
            await setDoc(doc(db, "photoSecrets", photoRef.id), {
              deleteUrl: result.data.delete_url
            });
          } catch (e) {
            console.warn("deleteUrl tak disimpan:", e);
          }
        }

        uploaded++;
      } catch (error) {
        console.error(`Upload gagal (${files[i].name}):`, error);
        lastError = error.message || String(error);
        failed++;
      }
    }
  } finally {
    submitBtn.disabled = false;
  }

  if (failed === 0) {
    statusMessage.style.color = "green";
    statusMessage.textContent = `${uploaded} gambar berjaya dimuat naik. Membuka galeri...`;
    uploadForm.reset();
    setTimeout(() => { window.location.href = "gallery.html"; }, 1500);
  } else {
    statusMessage.style.color = "#9a5b00";
    statusMessage.textContent = `${uploaded} gambar berjaya, ${failed} gagal. Sebab: ${lastError}`;
  }
});