import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ImgBB API Key milik kau
const IMGBB_API_KEY = "5d80288dde8c61484840e215389a7334";

const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const uploaderName = document.getElementById("uploaderName").value.trim();
  const files = document.getElementById("photoInput").files;

  if (files.length === 0) {
    statusMessage.style.color = "red";
    statusMessage.innerText = "Sila pilih sekurang-kurangnya 1 gambar.";
    return;
  }

  submitBtn.disabled = true;
  statusMessage.style.color = "#2C221E";
  statusMessage.innerText = `Sedang memuat naik 0 daripada ${files.length} gambar...`;

  try {
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("image", file);

      // Muat naik terus ke ImgBB secara percuma
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const downloadURL = result.data.url;

        // Simpan pautan gambar & nama pengirim ke Firestore
        await addDoc(collection(db, "photos"), {
          imageUrl: downloadURL,
          uploaderName: uploaderName,
          timestamp: serverTimestamp()
        });

        successCount++;
        statusMessage.innerText = `Sedang memuat naik ${successCount} daripada ${files.length} gambar...`;
      } else {
        throw new Error("Gagal muat naik ke server gambar.");
      }
    }

    statusMessage.style.color = "green";
    statusMessage.innerText = "Berjaya dimuat naik! Mengalihkan ke galeri...";
    uploadForm.reset();

    setTimeout(() => {
      window.location.href = "gallery.html";
    }, 1500);

  } catch (error) {
    console.error("Ralat upload:", error);
    statusMessage.style.color = "red";
    statusMessage.innerText = `Gagal upload: ${error.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});