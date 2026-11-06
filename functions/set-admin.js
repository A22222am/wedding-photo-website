// Jalankan sekali sahaja selepas cipta akaun admin di Firebase Authentication.
// Pastikan GOOGLE_APPLICATION_CREDENTIALS menunjuk kepada service-account JSON
// yang dimuat turun daripada Firebase Console > Project Settings > Service Accounts.
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

async function main() {
  const email = process.argv[2];
  if (!email) {
    throw new Error("Cara guna: node set-admin.js admin@example.com");
  }

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims || {}), admin: true };

  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`Akses admin diberikan kepada ${email}. Log keluar dan log masuk semula.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
