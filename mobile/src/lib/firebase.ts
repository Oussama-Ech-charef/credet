import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDJYCvXhZJ6j3wXARMEQXCXJvAlbNQeAuM",
  authDomain: "credet-5da9c.firebaseapp.com",
  projectId: "credet-5da9c",
  storageBucket: "credet-5da9c.firebasestorage.app",
  messagingSenderId: "43571241704",
  appId: "1:43571241704:web:06e7608582674cc5d71f5d",
  measurementId: "G-8FC6P9G64J",
};

let app: FirebaseApp;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp();
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}
