import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAngwkqrQELdlGYmJ8zYus0unjwMkVjM8M",
  authDomain: "ondriveegypt.firebaseapp.com",
  projectId: "ondriveegypt",
  storageBucket: "ondriveegypt.firebasestorage.app",
  messagingSenderId: "335606668239",
  appId: "1:335606668239:web:1153c4aacc38a3cfc210ba"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); 
