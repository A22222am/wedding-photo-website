import { db, functions } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js";

const IMGBB_API_KEY = "GANTI_DENGAN_API_KEY_IMGBB_YANG_BAHARU";
const MAX_SIZE = 10 * 1024 * 1024;
const registerPhotoSecret = httpsCallable(functions, "registerPhotoSecret");

const uploadForm = document.getElementById("uploadForm");
const statusMessage = document.getElementById("statusMessage");
const submitBtn = document.getElementById("submitBtn");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const uploaderName = document.getElementById("uploaderName").value.trim();
  const files = Array.from(document.getElementById("photoInput").files);

  if (!uploaderName || !files.length) {
    statusMessage.textContent = "Sila isi nama dan pilih sekurang-kurangnya satu gambar.";
    statusMessage.style.color = "red";
    return;
  }

  const invalid = files.find(file =>
    !file.type.startsWith("image/") || file.size > MAX_SIZE
  );
  if (invalid) {
    statusMessage.textContent = "Setiap fail mestilah gambar dan tidak melebihi 10MB.";
    statusMessage.style.color = "red";
    return;
  }

  submitBtn.disabled = true;
  let uploaded = 0;
  let failed = 0;
  let deleteSetupFailed = 0;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    statusMessage.textContent = `Memuat naik ${index + 1} daripada ${files.length} gambar...`;

    try {
      const body = new FormData();
      body.append("image", file);

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

      // Simpan delete_url di koleksi sulit dicapai; bukan dalam dokumen galeri awam.
      if (result.data.delete_url) {
        try {
          await registerPhotoSecret({
            photoId: photoRef.id,
            deleteUrl: result.data.delete_url
          });
        } catch (secretError) {
          console.error("Gagal mendaftarkan maklumat pemadaman ImgBB:", secretError);
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

  submitBtn.disabled = false;

  if (failed === 0 && deleteSetupFailed === 0) {
    statusMessage.style.color = "green";
    statusMessage.textContent = `${uploaded} gambar berjaya dimuat naik. Membuka galeri...`;
    uploadForm.reset();
    setTimeout(() => window.location.href = "gallery.html", 1500);
  } else {
    statusMessage.style.color = "#9a5b00";
    statusMessage.textContent =
      `${uploaded} gambar berjaya dimuat naik, ${failed} gagal. ` +
      `${deleteSetupFailed} gambar belum mempunyai rekod pemadaman ImgBB. ` +
      `Hubungi admin jika perlu dipadam dari kedua-dua tempat.`;
  }
});
