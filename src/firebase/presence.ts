// src/firebase/presence.ts
// Real-time Cloud Presence & Live User Synchronization across Devices & Platforms

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { useAuthStore } from '../store/useAuthStore';

export interface PresenceBuddy {
  id: string;
  userId?: string;
  sessionId?: string;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  task: string;
  roomName: string;
  minutesFocused: number;
  streakDays: number;
  status: 'focusing' | 'break' | 'just_started';
  lastSeen: number;
}

const PRESENCE_COLLECTION = 'presence';

/**
 * Send real-time presence heartbeat to Firestore
 */
export async function sendFirebasePresencePing(
  clientId: string,
  buddy: Partial<PresenceBuddy>
): Promise<void> {
  if (!db || !isFirebaseConfigured || !clientId) return;
  try {
    const currentUserId = useAuthStore.getState().user?.uid;
    // When signed in, key by permanent user ID to prevent duplicate ghost records for the same user
    const docId = currentUserId || clientId;
    const docRef = doc(db, PRESENCE_COLLECTION, docId);

    await setDoc(
      docRef,
      {
        ...buddy,
        id: docId,
        userId: currentUserId || undefined,
        sessionId: clientId,
        lastSeen: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {
    // Silent catch for intermittent offline state
  }
}

/**
 * Clean up presence document on disconnect / app close
 */
export async function removeFirebasePresence(clientId: string): Promise<void> {
  if (!db || !isFirebaseConfigured || !clientId) return;
  try {
    const currentUserId = useAuthStore.getState().user?.uid;
    const docId = currentUserId || clientId;
    const docRef = doc(db, PRESENCE_COLLECTION, docId);
    await deleteDoc(docRef);
  } catch {}
}

/**
 * Subscribe to real-time active users across all devices and platforms
 */
export function subscribeToFirebasePresence(
  clientId: string,
  onUpdate: (buddies: PresenceBuddy[], onlineCount: number) => void
): Unsubscribe | null {
  if (!db || !isFirebaseConfigured) return null;

  try {
    const colRef = collection(db, PRESENCE_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const now = Date.now();
        // Strict 26s active threshold: heartbeats are sent every 10s. Missing 2-3 pings means user closed app.
        const activeThreshold = 26000;
        const staleCleanupThreshold = 60000;

        const currentUserId = useAuthStore.getState().user?.uid;
        const seenKeys = new Set<string>();
        const activeBuddies: PresenceBuddy[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PresenceBuddy;
          if (!data) return;

          // Require a valid, real numeric lastSeen timestamp
          const lastSeenTime = typeof data.lastSeen === 'number' ? data.lastSeen : 0;
          if (lastSeenTime <= 0) {
            // Document has no timestamp - delete stale corrupt doc
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }

          const age = now - lastSeenTime;

          // Asynchronously purge stale documents older than 60s so Firestore stays tidy
          if (age > staleCleanupThreshold) {
            deleteDoc(docSnap.ref).catch(() => {});
            return;
          }

          // Check if heartbeat is active within 26s window
          const isFresh = age >= 0 && age < activeThreshold;
          if (!isFresh) return;

          // Filter out self (by clientId, sessionId, or userId)
          const isSelf = 
            docSnap.id === clientId ||
            data.sessionId === clientId ||
            data.id === clientId ||
            Boolean(currentUserId && (data.userId === currentUserId || data.id === currentUserId || docSnap.id === currentUserId));

          if (isSelf) return;

          // Deduplicate by userId if present, otherwise by sessionId/docId
          const uniqueKey = data.userId || data.sessionId || docSnap.id;
          if (seenKeys.has(uniqueKey)) return;
          seenKeys.add(uniqueKey);

          activeBuddies.push({
            ...data,
            id: docSnap.id,
            sessionId: data.sessionId || docSnap.id,
          });
        });

        // Real online count = count of active unique remote peers + 1 (self)
        const totalLiveCount = Math.max(1, activeBuddies.length + 1);

        onUpdate(activeBuddies, totalLiveCount);
      },
      (err) => {
        console.warn('[Firestore Presence error]', err);
      }
    );
  } catch (e) {
    console.warn('[Firestore Presence subscribe error]', e);
    return null;
  }
}
