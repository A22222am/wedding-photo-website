const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Akses admin diperlukan.");
  }
}

// Simpan delete_url secara private. Fungsi ini dipanggil selepas upload oleh tetamu.
// Ia hanya membenarkan satu rekod rahsia bagi setiap dokumen foto.
exports.registerPhotoSecret = onCall(async (request) => {
  const { photoId, deleteUrl } = request.data || {};

  if (typeof photoId !== "string" || !/^[A-Za-z0-9_-]{10,100}$/.test(photoId)) {
    throw new HttpsError("invalid-argument", "ID gambar tidak sah.");
  }
  if (typeof deleteUrl !== "string") {
    throw new HttpsError("invalid-argument", "delete_url ImgBB tiada.");
  }

  let parsed;
  try {
    parsed = new URL(deleteUrl);
  } catch {
    throw new HttpsError("invalid-argument", "URL pemadaman tidak sah.");
  }

  if (
    parsed.protocol !== "https:" ||
    !["ibb.co", "www.ibb.co"].includes(parsed.hostname) ||
    parsed.pathname.split("/").filter(Boolean).length !== 2
  ) {
    throw new HttpsError("invalid-argument", "URL pemadaman ImgBB tidak diterima.");
  }

  const photoRef = db.collection("photos").doc(photoId);
  const photoSnap = await photoRef.get();
  if (!photoSnap.exists) {
    throw new HttpsError("not-found", "Rekod gambar tidak ditemui.");
  }

  const secretRef = db.collection("photoSecrets").doc(photoId);
  try {
    await secretRef.create({
      deleteUrl: parsed.toString(),
      createdAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Jangan benarkan overwrite rahsia pemadaman yang sudah didaftarkan.
    if (error.code === 6 || error.code === "already-exists") {
      throw new HttpsError("already-exists", "Rekod pemadaman sudah wujud.");
    }
    throw new HttpsError("internal", "Tidak dapat menyimpan rekod pemadaman.");
  }

  return { ok: true };
});

exports.deletePhoto = onCall(async (request) => {
  requireAdmin(request);

  const { photoId } = request.data || {};
  if (typeof photoId !== "string" || !/^[A-Za-z0-9_-]{10,100}$/.test(photoId)) {
    throw new HttpsError("invalid-argument", "ID gambar tidak sah.");
  }

  const photoRef = db.collection("photos").doc(photoId);
  const secretRef = db.collection("photoSecrets").doc(photoId);

  const [photoSnap, secretSnap] = await Promise.all([
    photoRef.get(),
    secretRef.get()
  ]);

  if (!photoSnap.exists) {
    throw new HttpsError("not-found", "Gambar tidak ditemui dalam galeri.");
  }
  if (!secretSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Tiada delete_url ImgBB untuk gambar ini. Gambar tidak dipadam; rekod lama perlu diurus secara manual."
    );
  }

  const deleteUrl = secretSnap.data().deleteUrl;
  const parsed = new URL(deleteUrl);
  if (
    parsed.protocol !== "https:" ||
    !["ibb.co", "www.ibb.co"].includes(parsed.hostname)
  ) {
    throw new HttpsError("failed-precondition", "URL ImgBB dalam rekod rahsia tidak sah.");
  }

  // PERHATIAN: ImgBB menerbitkan API upload, tetapi bukan API delete awam yang didokumenkan.
  // Ini menggunakan endpoint laman web ImgBB yang tidak rasmi/reverse-engineered.
  // Jika ImgBB mengubah endpoint atau format respons, fungsi ini akan gagal dengan selamat.
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length !== 2) {
    throw new HttpsError("failed-precondition", "Format delete_url ImgBB tidak dikenali.");
  }

  const pathname = `/${parts[0]}/${parts[1]}`;
  const form = new FormData();
  form.append("pathname", pathname);
  form.append("action", "delete");
  form.append("delete", "image");
  form.append("from", "resource");
  form.append("deleting[id]", parts[0]);
  form.append("deleting[hash]", parts[1]);

  let response;
  let responseText = "";
  try {
    response = await fetch("https://ibb.co/json", {
      method: "POST",
      body: form,
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    responseText = await response.text();
  } catch (error) {
    throw new HttpsError("unavailable", "Tidak dapat menghubungi ImgBB. Rekod galeri dikekalkan.");
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = null;
  }

  // Jangan padam Firestore jika ImgBB tidak memberikan pengesahan kejayaan.
  if (!response.ok || !result || result.success !== true) {
    throw new HttpsError(
      "failed-precondition",
      "ImgBB tidak mengesahkan pemadaman. Rekod galeri dikekalkan. Semak endpoint ImgBB."
    );
  }

  await db.runTransaction(async (transaction) => {
    const latestPhoto = await transaction.get(photoRef);
    const latestSecret = await transaction.get(secretRef);
    if (latestPhoto.exists) transaction.delete(photoRef);
    if (latestSecret.exists) transaction.delete(secretRef);
  });

  return { ok: true, imgbbDeleted: true, firestoreDeleted: true };
});
