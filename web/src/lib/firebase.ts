import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDJYCvXhZJ6j3wXARMEQXCXJvAlbNQeAuM",
  authDomain: "credet-5da9c.firebaseapp.com",
  projectId: "credet-5da9c",
  storageBucket: "credet-5da9c.firebasestorage.app",
  messagingSenderId: "43571241704",
  appId: "1:43571241704:web:06e7608582674cc5d71f5d",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
