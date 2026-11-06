
import { db, functions } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

// ======================================
// IMGBB CONFIGURATION
// ======================================

const IMGBB_API_KEY = "648e8301dd4f0c4c9e6f56fbba55ffd0";
const MAX_SIZE = 10 * 1024 * 1024;

const registerPhotoSecret = httpsCallable(
  functions,
  "registerPhotoSecret"
);

// ======================================
// HTML ELEMENTS
// ======================================

const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

// ======================================
// UPLOAD FUNCTION
// ======================================

uploadForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const uploaderName = document
    .getElementById("uploaderName")
    .value.trim();

  const files = Array.from(
    document.getElementById("photoInput").files
  );

  // Validate input
  if (!uploaderName || files.length === 0) {

    statusMessage.textContent =
      "Sila isi nama dan pilih sekurang-kurangnya satu gambar.";

    statusMessage.style.color = "red";
    return;
  }

  // Validate image size and format
  const invalid = files.find(file =>
    !file.type.startsWith("image/") ||
    file.size > MAX_SIZE
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

        // STEP 1: Upload image to ImgBB

        const body = new FormData();
        body.append("image", file);

        const response = await fetch(
          `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
          {
            method: "POST",
            body: body
          }
        );

        const result = await response.json();

        console.log("ImgBB HTTP Status:", response.status);
        console.log("ImgBB Response:", result);

        if (!response.ok || !result.success || !result.data?.url) {

          throw new Error(
            result.error?.message || "ImgBB gagal menerima gambar."
          );
        }

        // STEP 2: Save image information to Firestore

        const photoRef = await addDoc(
          collection(db, "photos"),
          {
            imageUrl: result.data.url,
            uploaderName: uploaderName,
            timestamp: serverTimestamp(),
            likes: 0
          }
        );

        // STEP 3: Register private delete URL

        if (result.data.delete_url) {

          try {

            await registerPhotoSecret({
              photoId: photoRef.id,
              deleteUrl: result.data.delete_url
            });

          } catch (secretError) {

            console.error(
              "Gagal mendaftarkan maklumat pemadaman:",
              secretError
            );

            deleteSetupFailed++;
          }

        } else {

          deleteSetupFailed++;
        }

        uploaded++;

      } catch (error) {

        console.error(
          `Upload gagal (${file.name}):`,
          error
        );

        failed++;
      }
    }

  } finally {

    submitBtn.disabled = false;
  }

  // ======================================
  // UPLOAD RESULT
  // ======================================

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
