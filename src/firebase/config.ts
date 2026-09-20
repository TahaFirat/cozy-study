import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config — these are loaded from environment variables for security
// Create a .env file (copy .env.example) with your Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if credentials are provided
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: ReturnType<typeof initializeApp> | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
}

export const auth = isFirebaseConfigured ? getAuth(app!) : null;
export const db = isFirebaseConfigured ? getFirestore(app!) : null;
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
}

export { isFirebaseConfigured };
