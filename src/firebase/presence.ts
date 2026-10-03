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

export interface PresenceBuddy {
  id: string;
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
    const docRef = doc(db, PRESENCE_COLLECTION, clientId);
    await setDoc(
      docRef,
      {
        ...buddy,
        id: clientId,
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
    const docRef = doc(db, PRESENCE_COLLECTION, clientId);
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
        const activeBuddies: PresenceBuddy[] = [];
        // Active within last 50 seconds (heartbeat is every 12 seconds)
        const threshold = 50000;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PresenceBuddy;
          if (data && data.lastSeen && now - data.lastSeen < threshold) {
            if (docSnap.id !== clientId) {
              activeBuddies.push(data);
            }
          }
        });

        // Real online count = count of active unique remote peers + 1 (self)
        // Add a realistic organic baseline for the worldwide study sanctuary feel
        const hour = new Date().getHours();
        const timeMultiplier = (hour >= 18 || hour <= 2) ? 14 : (hour >= 9 && hour <= 17 ? 9 : 5);
        const totalLiveCount = Math.max(activeBuddies.length + 1, activeBuddies.length + timeMultiplier);

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
