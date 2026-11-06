
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

async function main() {
  const uid = process.argv[2];

  try {
    const user = await getAuth().getUser(uid);

    await getAuth().setCustomUserClaims(uid, {
      admin: true
    });

    console.log("ADMIN BERJAYA!");
    console.log("Email:", user.email);
    console.log("UID:", uid);

  } catch (error) {
    console.log("ERROR:", error);
  }
}

main();
