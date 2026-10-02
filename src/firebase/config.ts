import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config — client-side credentials with safe production fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAIgvYJq1aq2hognaUcOE7PcipeURVHIeY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cozypixel-125c7.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cozypixel-125c7',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cozypixel-125c7.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '291796810804',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:291796810804:web:72544796c97ca818dede61',
};

// Initialize Firebase only if credentials are provided
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let app: ReturnType<typeof initializeApp> | null = null;

try {
  if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
  }
} catch (e) {
  console.warn('[Firebase] App init note:', e);
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
