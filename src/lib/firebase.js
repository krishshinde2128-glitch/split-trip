import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMyrM80Ngk7R_SR5knrFsSS88K5tCMhhk",
  authDomain: "splitwise-be244.firebaseapp.com",
  projectId: "splitwise-be244",
  storageBucket: "splitwise-be244.firebasestorage.app",
  messagingSenderId: "235737949948",
  appId: "1:235737949948:web:e2d785b0ff7c4404345979"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
