import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB2fAp1pNvx0HHpOgpG1tqbKODsn5erD20",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "virtual-setu-7ffe1.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://virtual-setu-7ffe1-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "virtual-setu-7ffe1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "virtual-setu-7ffe1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "776347926207",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:776347926207:web:60de66aa9a87f1e427900a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-75B1DMBZZY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;