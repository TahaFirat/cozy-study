// src/firebase/bossRaidSync.ts
// Real-time synchronization of Boss HP, attacks, and live global leaderboards via Firestore

import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { BossId, LeaderboardEntry } from '../store/useBossRaidStore';

const BOSS_COLLECTION = 'boss_raids';
const BOSS_LEADERBOARDS_COLLECTION = 'boss_leaderboards';

export interface BossSyncData {
  bossId: BossId;
  currentHp: number;
  maxHp: number;
  isDefeated: boolean;
  lastDamage: number;
  lastAttackerName: string;
  lastAttackedAt: number;
}

/**
 * Record a boss attack in Firestore and update the real-time leaderboard
 */
export async function syncBossAttackToFirestore(
  bossId: BossId,
  payload: {
    userId: string;
    userName: string;
    damage: number;
    isCritical: boolean;
    city?: string;
    flag?: string;
    minutes?: number;
    newHp: number;
    maxHp: number;
    defeated: boolean;
  }
): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    // 1. Update the Boss Global State document
    const bossDocRef = doc(db, BOSS_COLLECTION, bossId);
    await setDoc(
      bossDocRef,
      {
        bossId,
        currentHp: payload.newHp,
        maxHp: payload.maxHp,
        isDefeated: payload.defeated,
        lastDamage: payload.damage,
        lastAttackerName: payload.userName,
        lastAttackedAt: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Update the Player's Leaderboard Record for this Boss
    const playerLbRef = doc(db, BOSS_LEADERBOARDS_COLLECTION, bossId, 'players', payload.userId);
    const existingSnap = await getDoc(playerLbRef);
    let cumulativeDamage = payload.damage;
    let focusMinutes = payload.minutes || 25;

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      cumulativeDamage += (data.damage || 0);
      focusMinutes += (data.focusMinutes || 0);
    }

    const contributionPct = payload.maxHp > 0 ? Number(((cumulativeDamage / payload.maxHp) * 100).toFixed(2)) : 0;
    const focusHours = Number((focusMinutes / 60).toFixed(1));

    await setDoc(
      playerLbRef,
      {
        id: payload.userId,
        name: payload.userName,
        city: payload.city || 'Online',
        flag: payload.flag || '🌍',
        damage: cumulativeDamage,
        contributionPct,
        focusHours,
        focusMinutes,
        badge: cumulativeDamage > 5000 ? '⚔️ Elit Şampiyon' : (cumulativeDamage > 1000 ? '🛡️ Kıdemli Savaşçı' : '🌱 Çaylak Savaşçı'),
        lastAttackedAt: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // Non-blocking catch for intermittent network
  }
}

/**
 * Reset a boss in Firestore so all players can battle the rematched boss
 */
export async function resetBossInFirestore(bossId: BossId, maxHp: number): Promise<void> {
  if (!db || !isFirebaseConfigured) return;

  try {
    const bossDocRef = doc(db, BOSS_COLLECTION, bossId);
    await setDoc(
      bossDocRef,
      {
        bossId,
        currentHp: maxHp,
        maxHp,
        isDefeated: false,
        lastDamage: 0,
        lastAttackerName: '',
        lastAttackedAt: Date.now(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch {}
}

/**
 * Real-time subscription to Boss HP changes from other players
 */
export function subscribeToBossHp(
  bossId: BossId,
  onUpdate: (data: { currentHp: number; isDefeated: boolean; lastDamage: number; lastAttackerName: string }) => void
): Unsubscribe | null {
  if (!db || !isFirebaseConfigured) return null;

  try {
    const bossDocRef = doc(db, BOSS_COLLECTION, bossId);
    return onSnapshot(bossDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.currentHp === 'number') {
          onUpdate({
            currentHp: data.currentHp,
            isDefeated: Boolean(data.isDefeated),
            lastDamage: data.lastDamage || 0,
            lastAttackerName: data.lastAttackerName || '',
          });
        }
      }
    });
  } catch {
    return null;
  }
}

/**
 * Real-time subscription to live leaderboard entries from Firestore
 */
export function subscribeToBossLeaderboard(
  bossId: BossId,
  onUpdate: (entries: LeaderboardEntry[]) => void
): Unsubscribe | null {
  if (!db || !isFirebaseConfigured) return null;

  try {
    const colRef = collection(db, BOSS_LEADERBOARDS_COLLECTION, bossId, 'players');
    const q = query(colRef, orderBy('damage', 'desc'), limit(25));

    return onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      let rank = 1;

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        entries.push({
          id: docSnap.id,
          rank: rank++,
          name: d.name || 'Gizemli Savaşçı',
          city: d.city || 'Online',
          flag: d.flag || '🌍',
          damage: d.damage || 0,
          contributionPct: d.contributionPct || 0,
          focusHours: d.focusHours || 0,
          badge: d.badge || '🛡️ Çevrimiçi Savaşçı',
          isSelf: false,
        });
      });

      onUpdate(entries);
    });
  } catch {
    return null;
  }
}
