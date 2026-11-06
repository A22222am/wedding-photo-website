
import { db, functions } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// ImgBB API Configuration
const IMGBB_API_KEY = "c0d7bf7b1c277d44176d7456d24eb3e2";
const MAX_SIZE = 10 * 1024 * 1024;

const registerPhotoSecret = httpsCallable(
  functions,
  "registerPhotoSecret"
);

// HTML Elements
const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

// Upload Function
uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const uploaderName = document
    .getElementById("uploaderName")
    .value.trim();

  const files = Array.from(
    document.getElementById("photoInput").files
  );

  // Validate input
  if (!uploaderName || !files.length) {
    statusMessage.textContent =
      "Sila isi nama dan pilih sekurang-kurangnya satu gambar.";
    statusMessage.style.color = "red";
    return;
  }

  // Validate image files
  const invalid = files.find(file =>
    !file.type.startsWith("image/") || file.size > MAX_SIZE
  );

  if (invalid) {
    statusMessage.textContent =
      "Setiap fail mestilah gambar dan tidak melebihi 10MB.";
    statusMessage.style.color = "red";
    return;
  }

  submitBtn.disabled = true;

  let uploaded = 0;
  let failed = 0;
  let deleteSetupFailed = 0;

  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      statusMessage.textContent =
        `Memuat naik ${index + 1} daripada ${files.length} gambar...`;

      try {
        // Upload image to ImgBB
        const body = new FormData();
        body.append("image", file);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
          {
            method: "POST",
            body
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success || !result.data?.url) {
          throw new Error(
            result.error?.message || "ImgBB gagal menerima gambar."
          );
        }

        // Save image information to Firestore
        const photoRef = await addDoc(
          collection(db, "photos"),
          {
            imageUrl: result.data.url,
            uploaderName: uploaderName,
            timestamp: serverTimestamp(),
            likes: 0
          }
        );

        // Register private delete URL using Cloud Functions
        if (result.data.delete_url) {
          try {
            await registerPhotoSecret({
              photoId: photoRef.id,
              deleteUrl: result.data.delete_url
            });
          } catch (secretError) {
            console.error(
              "Gagal mendaftarkan maklumat pemadaman ImgBB:",
              secretError
            );

            deleteSetupFailed++;
          }
        } else {
          deleteSetupFailed++;
        }

        uploaded++;

      } catch (error) {
        console.error(`Upload gagal (${file.name}):`, error);
        failed++;
      }
    }

  } finally {
    submitBtn.disabled = false;
  }

  // Upload result
  if (failed === 0 && deleteSetupFailed === 0) {
    statusMessage.style.color = "green";

    statusMessage.textContent =
      `${uploaded} gambar berjaya dimuat naik. Membuka galeri...`;

    uploadForm.reset();

    setTimeout(() => {
      window.location.href = "gallery.html";
    }, 1500);

  } else {
    statusMessage.style.color = "#9a5b00";

    statusMessage.textContent =
      `${uploaded} gambar berjaya dimuat naik, ${failed} gagal. ` +
      `${deleteSetupFailed} gambar belum mempunyai rekod pemadaman ImgBB. ` +
      `Hubungi admin jika perlu dipadam dari kedua-dua tempat.`;
  }
});
