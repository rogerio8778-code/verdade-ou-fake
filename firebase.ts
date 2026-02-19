import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLdjg1K23k8TJixv_xan999MQG3vPcyPE",
  authDomain: "verdade-ou-fake-319d3.firebaseapp.com",
  projectId: "verdade-ou-fake-319d3",
  storageBucket: "verdade-ou-fake-319d3.firebasestorage.app",
  messagingSenderId: "84401130841",
  appId: "1:84401130841:web:a136bc18dfc9ab4cb6d048",
  measurementId: "G-3W167G938M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, serverTimestamp };