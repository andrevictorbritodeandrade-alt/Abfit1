import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCZIP1JUTVXjVd6dMnd_DRTD1CLvQpqslc",
  authDomain: "abfit-d5bff.firebaseapp.com",
  projectId: "abfit-d5bff",
  storageBucket: "abfit-d5bff.firebasestorage.app",
  messagingSenderId: "565295481649",
  appId: "1:565295481649:web:cdfe52ef679b85ab362610",
  measurementId: "G-X2PK4MPTP9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
