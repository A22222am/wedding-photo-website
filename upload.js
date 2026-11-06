import { storage, db } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const uploaderName = document.getElementById("uploaderName").value.trim();
  const files = document.getElementById("photoInput").files;

  if (files.length === 0) {
    statusMessage.style.color = "red";
    statusMessage.innerText = "Sila pilih sekurang-kurangnya satu gambar.";
    return;
  }

  submitBtn.disabled = true;
  statusMessage.style.color = "#2C221E";
  statusMessage.innerText = `Sedang memuat naik 0 daripada ${files.length} gambar...`;

  try {
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name}`;
      const storageRef = ref(storage, `wedding_photos/${uniqueFileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, "photos"), {
        imageUrl: downloadURL,
        uploaderName: uploaderName,
        fileName: uniqueFileName,
        timestamp: serverTimestamp()
      });

      successCount++;
      statusMessage.innerText = `Sedang memuat naik ${successCount} daripada ${files.length} gambar...`;
    }

    statusMessage.style.color = "green";
    statusMessage.innerText = "Berjaya dimuat naik! Terima kasih atas perkongsian anda.";
    uploadForm.reset();

    setTimeout(() => {
      window.location.href = "gallery.html";
    }, 2000);

  } catch (error) {
    console.error("Ralat muat naik:", error);
    statusMessage.style.color = "red";
    statusMessage.innerText = "Gagal memuat naik gambar. Sila cuba lagi.";
  } finally {
    submitBtn.disabled = false;
  }
});