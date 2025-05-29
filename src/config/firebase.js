const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Anda perlu mendownload service account key dari Firebase Console
// dan menyimpannya sebagai serviceAccountKey.json
const serviceAccount = require('./private/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://kalkulori-api-default-rtdb.asia-southeast2.firebasedatabase.app"
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };