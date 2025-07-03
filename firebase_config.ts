import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
apiKey: "AIzaSyBvau3FDjtf9pF2bthpWhRw6cPI88Qmv28",
authDomain: "unserepartyapp.firebaseapp.com",
projectId: "unserepartyapp",
storageBucket: "unserepartyapp.firebasestorage.app",
messagingSenderId: "431318278893",
appId: "1:431318278893:web:c5e167d2fa3648190f22e4",
measurementId: "G-4NDFX7RWR2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

// Firestore mit Long Polling
export const db = initializeFirestore(app, {
experimentalForceLongPolling: true,
});


// Export firebaseConfig
export { firebaseConfig };
