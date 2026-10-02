import { useStatsStore } from './useStatsStore';
import { useTaskStore } from './useTaskStore';
import { useSubscriptionStore } from './useSubscriptionStore';
import { useBossRaidStore, DEFAULT_BOSSES } from './useBossRaidStore';
import { useGamificationStore, INITIAL_BADGES } from './useGamificationStore';
import { useAppStore } from './useAppStore';
import { useTimerStore } from './useTimerStore';
import { FocusSession } from '../types';

export interface UserProfileSnapshot {
  stats: {
    sessions: FocusSession[];
    streakDays: number;
    lastSessionDate: string | null;
  };
  tasks: {
    tasks: any[];
    activeTaskId: string | null;
    sessionIntent: string;
  };
  subscription: {
    isPro: boolean;
    proPlan: any;
    proUntil: number | null;
    selectedCrtTheme: string;
  };
  bossRaid: {
    strikeCharges: number;
    claimedMilestones: Record<string, number[]>;
    personalDamagePerBoss: Record<string, number>;
    totalBossDamageDealt: number;
  };
  gamification: {
    xp: number;
    badges: any[];
    dailyChallenges: any[];
    challengeDate: string;
    mugClickCount: number;
    visitedRooms: string[];
    totalSessionCount: number;
    rainySessionCount: number;
    catPetCount: number;
  };
  settings: {
    activeRoom: string;
    language: string;
    weather: string;
    timeOfDay: string;
    dailyGoalMinutes: number;
  };
}

const STORAGE_PREFIX = 'cozy_profile_v2_';

// Save in-memory stores into an isolated slot for a specific user ID or 'guest'
export function saveProfileSnapshot(profileId: string = 'guest'): void {
  if (!profileId) return;
  try {
    const statsState = useStatsStore.getState();
    const taskState = useTaskStore.getState();
    const subState = useSubscriptionStore.getState();
    const bossState = useBossRaidStore.getState();
    const gameState = useGamificationStore.getState();
    const appState = useAppStore.getState();

    const snapshot: UserProfileSnapshot = {
      stats: {
        sessions: statsState.sessions || [],
        streakDays: statsState.streakDays || 0,
        lastSessionDate: statsState.lastSessionDate || null,
      },
      tasks: {
        tasks: taskState.tasks || [],
        activeTaskId: taskState.activeTaskId || null,
        sessionIntent: taskState.sessionIntent || '',
      },
      subscription: {
        isPro: Boolean(subState.isPro),
        proPlan: subState.plan || null,
        proUntil: subState.expiresAt ? new Date(subState.expiresAt).getTime() : null,
        selectedCrtTheme: subState.selectedCrtTheme || 'classic',
      },
      bossRaid: {
        strikeCharges: bossState.strikeCharges ?? 1,
        claimedMilestones: (bossState.claimedMilestones as any) || {},
        personalDamagePerBoss: bossState.personalDamagePerBoss || {},
        totalBossDamageDealt: bossState.totalBossDamageDealt || 0,
      },
      gamification: {
        xp: gameState.xp || 0,
        badges: gameState.badges || [],
        dailyChallenges: gameState.dailyChallenges || [],
        challengeDate: gameState.challengeDate || '',
        mugClickCount: gameState.mugClickCount || 0,
        visitedRooms: gameState.visitedRooms || ['bedroom'],
        totalSessionCount: gameState.totalSessionCount || 0,
        rainySessionCount: gameState.rainySessionCount || 0,
        catPetCount: gameState.catPetCount || 0,
      },
      settings: {
        activeRoom: appState.activeRoom || 'bedroom',
        language: appState.language || 'tr',
        weather: appState.weather || 'rain',
        timeOfDay: appState.timeOfDay || 'afternoon',
        dailyGoalMinutes: appState.dailyGoalMinutes || 120,
      },
    };

    localStorage.setItem(STORAGE_PREFIX + profileId, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[ProfileManager] Failed to save profile snapshot:', err);
  }
}

// Load a specific user snapshot into all in-memory stores
export function loadProfileSnapshot(profileId: string = 'guest'): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + profileId);
    if (!raw) return false;
    const snapshot: UserProfileSnapshot = JSON.parse(raw);

    if (snapshot.stats) {
      useStatsStore.setState({
        sessions: snapshot.stats.sessions || [],
        streakDays: snapshot.stats.streakDays || 0,
        lastSessionDate: snapshot.stats.lastSessionDate || null,
      });
    }
    if (snapshot.tasks) {
      useTaskStore.setState({
        tasks: snapshot.tasks.tasks || [],
        activeTaskId: snapshot.tasks.activeTaskId || null,
        sessionIntent: snapshot.tasks.sessionIntent || '',
      });
    }
    if (snapshot.subscription) {
      useSubscriptionStore.setState({
        isPro: true,
        plan: 'lifetime',
        selectedCrtTheme: (snapshot.subscription.selectedCrtTheme as any) || 'classic',
      });
    }
    if (snapshot.bossRaid) {
      useBossRaidStore.setState({
        strikeCharges: snapshot.bossRaid.strikeCharges ?? 1,
        claimedMilestones: (snapshot.bossRaid.claimedMilestones as any) || {},
        personalDamagePerBoss: snapshot.bossRaid.personalDamagePerBoss || {},
        totalBossDamageDealt: snapshot.bossRaid.totalBossDamageDealt || 0,
      });
    }
    if (snapshot.gamification) {
      useGamificationStore.setState({
        xp: snapshot.gamification.xp || 0,
        badges: snapshot.gamification.badges || [],
        dailyChallenges: snapshot.gamification.dailyChallenges || [],
        challengeDate: snapshot.gamification.challengeDate || '',
        mugClickCount: snapshot.gamification.mugClickCount || 0,
        visitedRooms: snapshot.gamification.visitedRooms || ['bedroom'],
        totalSessionCount: snapshot.gamification.totalSessionCount || 0,
        rainySessionCount: snapshot.gamification.rainySessionCount || 0,
        catPetCount: snapshot.gamification.catPetCount || 0,
      });
    }
    if (snapshot.settings) {
      useAppStore.setState({
        activeRoom: (snapshot.settings.activeRoom as any) || 'bedroom',
        language: (snapshot.settings.language as any) || 'tr',
        weather: (snapshot.settings.weather as any) || 'rain',
        timeOfDay: (snapshot.settings.timeOfDay as any) || 'afternoon',
        dailyGoalMinutes: snapshot.settings.dailyGoalMinutes || 120,
      });
    }
    return true;
  } catch (err) {
    console.warn('[ProfileManager] Failed to load profile snapshot:', err);
    return false;
  }
}

// Reset all stores to factory fresh clean state
export function resetStoresToCleanState(): void {
  useStatsStore.setState({
    sessions: [],
    streakDays: 0,
    lastSessionDate: null,
  });
  useTaskStore.setState({
    tasks: [],
    activeTaskId: null,
    sessionIntent: '',
  });
  useSubscriptionStore.setState({
    isPro: true,
    plan: 'lifetime',
    subscribedAt: null,
    expiresAt: null,
    selectedCrtTheme: 'classic',
  });
  useBossRaidStore.setState({
    currentBossId: 'horologium',
    bosses: { ...DEFAULT_BOSSES },
    unlockedTrophies: [],
    strikeCharges: 1,
    claimedMilestones: {},
    personalDamagePerBoss: {},
    totalBossDamageDealt: 0,
    sessionCombo: 1,
    combatLogs: [],
    lastAttackResult: null,
  });
  useGamificationStore.setState({
    xp: 0,
    badges: INITIAL_BADGES.map((b) => ({ ...b, unlocked: false, unlockedAt: undefined })),
    visitedRooms: ['bedroom'],
    mugClickCount: 0,
    totalSessionCount: 0,
    rainySessionCount: 0,
    todaySessionCount: 0,
    catPetCount: 0,
    recentUnlockedBadge: null,
    badgeQueue: [],
  });
  try {
    useTimerStore.getState().pauseTimer();
    useTimerStore.getState().resetTimer();
  } catch (_) {}
  useAppStore.setState({
    activeRoom: 'bedroom',
    dailyGoalMinutes: 120,
    activeModal: 'none',
  });
}

export function seedReviewerDemoProfile(): void {
  useStatsStore.setState({
    sessions: [
      {
        id: 'review_s1',
        timestamp: Date.now() - 3600000 * 5,
        durationMinutes: 30,
        roomId: 'bedroom',
        note: 'Deep focus on iOS development & testing'
      },
      {
        id: 'review_s2',
        timestamp: Date.now() - 3600000 * 28,
        durationMinutes: 50,
        roomId: 'cafe',
        note: 'Studying in cozy cafe ambiance'
      },
      {
        id: 'review_s3',
        timestamp: Date.now() - 3600000 * 52,
        durationMinutes: 45,
        roomId: 'cabin',
        note: 'Snow cabin focus session with fireplace'
      },
      {
        id: 'review_s4',
        timestamp: Date.now() - 3600000 * 76,
        durationMinutes: 60,
        roomId: 'library',
        note: 'Research & reading in the grand library'
      }
    ],
    streakDays: 7,
    lastSessionDate: new Date().toISOString(),
  });

  useTaskStore.setState({
    tasks: [
      {
        id: 't_demo_1',
        title: 'Review LockIn App Features & Ambient Audio',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        priority: 'high',
        category: 'work',
        pomodoroEstimate: 4,
        pomodorosCompleted: 2,
      },
      {
        id: 't_demo_2',
        title: 'Test Rain On Glass & Cozy Rooms',
        status: 'todo',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        priority: 'medium',
        category: 'study',
        pomodoroEstimate: 2,
        pomodorosCompleted: 0,
      },
      {
        id: 't_demo_3',
        title: 'Defeat Horologium in Boss Raid',
        status: 'done',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        priority: 'low',
        category: 'goals',
        pomodoroEstimate: 1,
        pomodorosCompleted: 1,
      }
    ],
    activeTaskId: 't_demo_1',
    sessionIntent: 'Review LockIn app completeness & focus experience',
  });

  useSubscriptionStore.setState({
    isPro: true,
    plan: 'lifetime',
    subscribedAt: new Date().toISOString(),
    expiresAt: null,
    selectedCrtTheme: 'classic',
  });

  useGamificationStore.setState({
    xp: 1850,
    visitedRooms: ['bedroom', 'cafe', 'cabin', 'library', 'apartment', 'kyoto', 'cyberpunk'],
    mugClickCount: 14,
    totalSessionCount: 18,
    rainySessionCount: 12,
    todaySessionCount: 2,
    catPetCount: 9,
    badges: INITIAL_BADGES.map((b, i) => i < 5 ? { ...b, unlocked: true, unlockedAt: Date.now() - i * 86400000 } : b),
  });

  useBossRaidStore.setState({
    currentBossId: 'horologium',
    strikeCharges: 2,
    personalDamagePerBoss: { horologium: 640 },
    totalBossDamageDealt: 640,
    unlockedTrophies: ['trophy_hourglass'],
  });
}

// Global Profile Switcher
let activeProfileId: string | null = null;
let autoSaveInterval: number | null = null;

export function getActiveProfileId(): string {
  return activeProfileId || 'guest';
}

export function switchUserProfile(newProfileId: string | null): void {
  const targetId = newProfileId || 'guest';
  if (targetId === activeProfileId) return;

  console.log(`[ProfileManager] Switching profile from "${activeProfileId || 'none'}" to "${targetId}"`);

  // 1. Save state of current profile before leaving
  if (activeProfileId) {
    saveProfileSnapshot(activeProfileId);
  }

  // 2. Wipe memory stores completely to prevent ANY data cross-contamination
  resetStoresToCleanState();

  // 3. Set new active profile ID
  activeProfileId = targetId;

  // 4. Try to load saved profile for new user
  const loaded = loadProfileSnapshot(targetId);
  if (!loaded) {
    if (targetId.includes('apple-review') || targetId.includes('demo')) {
      seedReviewerDemoProfile();
      saveProfileSnapshot(targetId);
      console.log(`[ProfileManager] Initialized rich demo state for "${targetId}".`);
    } else {
      console.log(`[ProfileManager] Initialized fresh clean state for "${targetId}".`);
    }
  }

  // 5. Setup periodic autosave
  if (typeof window !== 'undefined' && !autoSaveInterval) {
    autoSaveInterval = window.setInterval(() => {
      if (activeProfileId) {
        saveProfileSnapshot(activeProfileId);
      }
    }, 8000);
  }
}
