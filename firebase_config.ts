import 'react-native-url-polyfill/auto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBvau…DEIN_KEY…mvc",
    authDomain: "unserepartyapp.firebaseapp.com",
    projectId: "unserepartyapp",
    storageBucket: "unserepartyapp.appspot.com",
    messagingSenderId: "431318278893",
    appId: "1:431318278893:web:c5e167d2fa3648190f22e4",
};

const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Firestore mit Long-Polling (stabil in Expo Go)
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});
