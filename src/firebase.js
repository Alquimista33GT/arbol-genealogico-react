import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbjGT0Id6IEP67hs090FKp8Yh5DAgzmQg",
  authDomain: "arbol-genalogico.firebaseapp.com",
  projectId: "arbol-genalogico",
  storageBucket: "arbol-genalogico.firebasestorage.app",
  messagingSenderId: "825872162433",
  appId: "1:825872162433:web:dc6263f62a0bbaa773b780",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
