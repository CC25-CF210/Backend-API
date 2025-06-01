// firebase.js - Updated configuration
const admin = require('firebase-admin');

let serviceAccount;

if (process.env.NODE_ENV === 'production') {
    // Debug: Log environment variables (remove after fixing)
    console.log('Environment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'NOT SET');
    console.log('FIREBASE_PRIVATE_KEY_ID:', process.env.FIREBASE_PRIVATE_KEY_ID ? 'Set' : 'NOT SET');
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'NOT SET');

    // Validate required environment variables
    const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID', 
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
    }

    serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    // Debug: Verify service account object
    console.log('Service Account Object:');
    console.log('- type:', serviceAccount.type);
    console.log('- project_id:', serviceAccount.project_id ? 'Set' : 'NOT SET');
    console.log('- client_email:', serviceAccount.client_email ? 'Set' : 'NOT SET');
    
} else {
    // Development environment
    try {
        serviceAccount = require('./private/serviceAccount.json');
    } catch (error) {
        console.error('Failed to load serviceAccount.json:', error.message);
        throw new Error('Please add serviceAccount.json file in private/ directory for development');
    }
}

// Initialize Firebase Admin
try {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || "https://kalkulori-api-default-rtdb.asia-southeast2.firebasedatabase.app"
        });
        console.log('Firebase Admin initialized successfully');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };