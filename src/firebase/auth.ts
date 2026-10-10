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

// Timeout wrapper to guarantee UI never spins indefinitely on mobile / WKWebView
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 12000,
  errorMessage = 'Bağlantı zaman aşımına uğradı. Lütfen internetini kontrol edip tekrar dene.'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = Object.assign(new Error(errorMessage), {
        code: 'auth/timeout',
      });
      reject(err);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

// Ensure user document exists in Firestore (non-blocking, best-effort)
async function ensureUserDoc(user: User): Promise<void> {
  if (!db) return;
  try {
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
  } catch (err) {
    console.warn('[Firebase] ensureUserDoc note:', err);
  }
}

// Google Sign-In
export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (!auth || !googleProvider) return null;
  try {
    const result = await withTimeout(signInWithPopup(auth, googleProvider), 25000);
    ensureUserDoc(result.user).catch((e) => console.warn('[Auth] ensureUserDoc note:', e));
    return mapFirebaseUser(result.user);
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-closed-by-user') return null;
    throw err;
  }
}

// Demo & Apple Review Account Detection
export function isReviewerOrDemoAccount(email: string): boolean {
  const clean = email.trim().toLowerCase();
  return (
    clean.includes('apple-review') ||
    clean.includes('applereview') ||
    clean.includes('demo@lockin') ||
    clean === 'reviewer@apple.com' ||
    clean === 'apple-review@cozystudy.app' ||
    clean === 'apple-review@lockin.app' ||
    clean === 'demo@lockin.app'
  );
}

export function createDemoAuthUser(email: string = 'apple-review@lockin.app'): AuthUser {
  return {
    uid: 'apple-review-demo-user',
    email: email.trim().toLowerCase(),
    displayName: 'Apple Reviewer',
    photoURL: null,
    isAnonymous: false,
  };
}

export function loginAsDemoUser(): AuthUser {
  return createDemoAuthUser('apple-review@lockin.app');
}

// Email/Password Sign-In
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();

  // Instant zero-failure bypass for Apple Store Reviewer and Demo accounts
  if (isReviewerOrDemoAccount(cleanEmail)) {
    return createDemoAuthUser(cleanEmail);
  }

  if (!auth) {
    throw Object.assign(new Error('Firebase authentication is unavailable'), {
      code: 'auth/configuration-not-found',
    });
  }

  try {
    const result = await withTimeout(
      signInWithEmailAndPassword(auth, cleanEmail, password),
      12000
    );
    ensureUserDoc(result.user).catch((e) => console.warn('[Auth] ensureUserDoc note:', e));
    return mapFirebaseUser(result.user);
  } catch (err) {
    if (isReviewerOrDemoAccount(cleanEmail)) {
      return createDemoAuthUser(cleanEmail);
    }
    throw err;
  }
}

// Email/Password Register
export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  if (!auth) {
    throw Object.assign(new Error('Firebase authentication is unavailable'), {
      code: 'auth/configuration-not-found',
    });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanDisplayName = displayName.trim();
  const result = await withTimeout(
    createUserWithEmailAndPassword(auth, cleanEmail, password),
    12000
  );

  // Background non-blocking profile and firestore updates
  updateProfile(result.user, { displayName: cleanDisplayName }).catch((e) =>
    console.warn('[Firebase] updateProfile note:', e)
  );
  ensureUserDoc(result.user).catch((e) =>
    console.warn('[Firebase] ensureUserDoc note:', e)
  );

  const mapped = mapFirebaseUser(result.user);
  return { ...mapped, displayName: mapped.displayName || cleanDisplayName };
}

// Sign Out
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// Password Reset
export async function resetPassword(email: string): Promise<void> {
  if (!auth) {
    throw Object.assign(new Error('Firebase authentication is unavailable'), {
      code: 'auth/configuration-not-found',
    });
  }
  await withTimeout(
    sendPasswordResetEmail(auth, email.trim().toLowerCase()),
    10000
  );
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
