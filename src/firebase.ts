// Firebase Configuration for DMIEC Events
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDDUwWp9baesLhEVEuw9RSSlp26JQH2qrA",
  authDomain: "dmiec-events.firebaseapp.com",
  projectId: "dmiec-events",
  storageBucket: "dmiec-events.firebasestorage.app",
  messagingSenderId: "448130391292",
  appId: "1:448130391292:web:b0e2ca562cedd95f3bcb79",
  measurementId: "G-KE6HT3ETV2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
