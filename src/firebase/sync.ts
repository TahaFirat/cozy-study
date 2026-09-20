import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { FocusSession, RoomId, TimeOfDay, WeatherType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSettings {
  language: 'tr' | 'en';
  activeRoom: RoomId;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  lampOn: boolean;
  crtOverlay: boolean;
  reduceMotion: boolean;
  soundFxEnabled: boolean;
  dailyGoalMinutes: number;
}

export interface UserStats {
  sessions: FocusSession[];
  streakDays: number;
  lastSessionDate: string | null;
}

// ─── Settings Sync ────────────────────────────────────────────────────────────

export async function saveUserSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'users', uid, 'data', 'settings');
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export async function loadUserSettings(uid: string): Promise<Partial<UserSettings> | null> {
  if (!db) return null;
  const ref = doc(db, 'users', uid, 'data', 'settings');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as Partial<UserSettings>) : null;
}

// ─── Stats Sync ───────────────────────────────────────────────────────────────

export async function saveUserStats(uid: string, stats: UserStats): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'users', uid, 'data', 'stats');
  await setDoc(ref, {
    ...stats,
    // Keep only latest 200 sessions in cloud (oldest trimmed)
    sessions: stats.sessions.slice(0, 200),
    updatedAt: serverTimestamp(),
  });
}

export async function loadUserStats(uid: string): Promise<UserStats | null> {
  if (!db) return null;
  const ref = doc(db, 'users', uid, 'data', 'stats');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserStats) : null;
}

// ─── Gamification Sync ────────────────────────────────────────────────────────

export async function saveGamification(uid: string, data: Record<string, unknown>): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'users', uid, 'data', 'gamification');
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function loadGamification(uid: string): Promise<Record<string, unknown> | null> {
  if (!db) return null;
  const ref = doc(db, 'users', uid, 'data', 'gamification');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// ─── Display Name Update ──────────────────────────────────────────────────────

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, 'users', uid), { displayName });
}

// ─── Subscription Sync (Paddle / Billing) ───────────────────────────────────

export interface SubscriptionRecord {
  isPro: boolean;
  plan: string;
  paymentId?: string;
  provider?: 'paddle' | 'iyzico' | 'free' | 'manual';
}

export async function saveSubscriptionToFirestore(
  uid: string,
  data: SubscriptionRecord
): Promise<void> {
  if (!db) return;
  const now = new Date();

  let expiresAt: string | null = null;
  if (data.plan === 'monthly') {
    const exp = new Date(now);
    exp.setMonth(exp.getMonth() + 1);
    expiresAt = exp.toISOString();
  } else if (data.plan === 'yearly') {
    const exp = new Date(now);
    exp.setFullYear(exp.getFullYear() + 1);
    expiresAt = exp.toISOString();
  }
  // lifetime → expiresAt = null

  const ref = doc(db, 'users', uid);
  await setDoc(
    ref,
    {
      subscription: {
        isPro: data.isPro,
        plan: data.plan,
        paymentId: data.paymentId || null,
        provider: data.provider || 'paddle',
        subscribedAt: now.toISOString(),
        expiresAt,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}

export async function loadSubscriptionFromFirestore(
  uid: string
): Promise<SubscriptionRecord | null> {
  if (!db) return null;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.subscription ?? null;
}
