import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate config
if (typeof window !== "undefined") {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('❌ Missing Firebase config values:', missingFields);
    console.error('Make sure your .env.local file has all NEXT_PUBLIC_FIREBASE_* variables');
  } else {
    console.log('✅ Firebase config loaded successfully');
  }
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    if (firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // Server-side: create dummy objects
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { app, auth, db, storage, analytics };

