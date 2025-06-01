const admin = require('firebase-admin');

// Ganti dengan path ke file JSON kunci akun layanan Anda
const serviceAccount = require('./src/config/private/');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sekarang Anda bisa menggunakan 'db' untuk mengakses Firestore
console.log("Firestore Admin SDK initialized!");