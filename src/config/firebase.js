const admin = require('firebase-admin');

let serviceAccount;

if (process.env.NODE_ENV === 'production') {
    serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
} else {
    try {
        serviceAccount = require('./private/serviceAccount.json');
    } catch (error) {
        console.error('Development: serviceAccount.json not found');
        console.log('Please create private/serviceAccount.json for local development');
        process.exit(1);
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://kalkulori-api-default-rtdb.asia-southeast2.firebasedatabase.app"
    });
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };