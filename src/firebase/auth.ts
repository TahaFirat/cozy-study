import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './config';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

export function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

// Ensure user document exists in Firestore
async function ensureUserDoc(user: User) {
  if (!db) return;
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Anonim Çalışmacı',
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
    });
  }
}

// Google Sign-In
export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (!auth || !googleProvider) return null;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserDoc(result.user);
    return mapFirebaseUser(result.user);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-closed-by-user') return null;
    throw err;
  }
}

// Email/Password Sign-In
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const result = await signInWithEmailAndPassword(auth, email, password);
  return mapFirebaseUser(result.user);
}

// Email/Password Register
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  if (!auth) throw new Error('Firebase not configured');
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await ensureUserDoc(result.user);
  return mapFirebaseUser(result.user);
}

// Sign Out
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// Password Reset
export async function resetPassword(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase not configured');
  await sendPasswordResetEmail(auth, email);
}

// Auth state listener
export function subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? mapFirebaseUser(user) : null);
  });
}

export { isFirebaseConfigured };
