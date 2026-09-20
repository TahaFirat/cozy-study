import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  emoji: string;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface DailyChallenge {
  id: string;
  textTr: string;
  textEn: string;
  xpReward: number;
  completed: boolean;
  type: 'focus_minutes' | 'with_music' | 'with_rain' | 'morning' | 'streak' | 'explore_room' | 'two_sessions';
  target?: number;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

const INITIAL_BADGES: Badge[] = [
  {
    id: 'first_step',
    emoji: '🌱',
    nameTr: 'İlk Adım',
    nameEn: 'First Step',
    descTr: 'İlk odak seansını tamamla',
    descEn: 'Complete your first focus session',
    unlocked: false,
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    nameTr: '3 Günlük Seri',
    nameEn: '3-Day Streak',
    descTr: '3 gün üst üste çalış',
    descEn: 'Study 3 days in a row',
    unlocked: false,
  },
  {
    id: 'streak_7',
    emoji: '💎',
    nameTr: '7 Günlük Seri',
    nameEn: '7-Day Streak',
    descTr: '7 gün üst üste çalış',
    descEn: 'Study 7 days in a row',
    unlocked: false,
  },
  {
    id: 'streak_30',
    emoji: '👑',
    nameTr: '30 Günlük Efsane',
    nameEn: '30-Day Legend',
    descTr: '30 gün üst üste çalış',
    descEn: 'Study 30 days in a row',
    unlocked: false,
  },
  {
    id: 'streak_60',
    emoji: '⚡',
    nameTr: '60 Günlük Çelik İrade',
    nameEn: '60-Day Iron Will',
    descTr: '60 gün aralıksız çalışma serisi sürdür',
    descEn: 'Maintain an uninterrupted 60-day streak',
    unlocked: false,
  },
  {
    id: 'streak_100',
    emoji: '🌌',
    nameTr: '100 Günlük Efsane Taç',
    nameEn: '100-Day Mythic Crown',
    descTr: '100 gün aralıksız çalışma serisi',
    descEn: 'Maintain a 100-day focus streak',
    unlocked: false,
  },
  {
    id: 'night_owl',
    emoji: '🦉',
    nameTr: 'Gece Kuşu',
    nameEn: 'Night Owl',
    descTr: "Gece 23:00'dan sonra çalış",
    descEn: 'Study after 23:00',
    unlocked: false,
  },
  {
    id: 'early_bird',
    emoji: '☀️',
    nameTr: 'Sabahçı',
    nameEn: 'Early Bird',
    descTr: "Sabah 06:00'dan önce çalış",
    descEn: 'Study before 06:00',
    unlocked: false,
  },
  {
    id: 'marathoner',
    emoji: '⏱',
    nameTr: 'Maratoner',
    nameEn: 'Marathoner',
    descTr: 'Tek seansta 90+ dakika çalış',
    descEn: '90+ min in one session',
    unlocked: false,
  },
  {
    id: 'flow_master',
    emoji: '🧠',
    nameTr: 'Derin Akış Ustası',
    nameEn: 'Flow State Master',
    descTr: '120+ dakika kesintisiz derin odaklan',
    descEn: 'Focus for 120+ min without disruption',
    unlocked: false,
  },
  {
    id: 'reader_10',
    emoji: '📚',
    nameTr: 'Okuyucu',
    nameEn: 'Reader',
    descTr: '10 seansı tamamla',
    descEn: 'Complete 10 sessions',
    unlocked: false,
  },
  {
    id: 'dedicated_50',
    emoji: '🏆',
    nameTr: 'Adanmış',
    nameEn: 'Dedicated',
    descTr: '50 seansı tamamla',
    descEn: 'Complete 50 sessions',
    unlocked: false,
  },
  {
    id: 'master_100',
    emoji: '🎖️',
    nameTr: 'Usta Odakçı',
    nameEn: 'Centurion Scholar',
    descTr: '100 seansı başarıyla tamamla',
    descEn: 'Complete 100 focus sessions',
    unlocked: false,
  },
  {
    id: 'rainy_days',
    emoji: '🌧',
    nameTr: 'Yağmur Aşığı',
    nameEn: 'Rain Lover',
    descTr: '10 yağmurlu seans tamamla',
    descEn: '10 rainy sessions',
    unlocked: false,
  },
  {
    id: 'storm_chaser',
    emoji: '🌩️',
    nameTr: 'Fırtına Savaşçısı',
    nameEn: 'Storm Chaser',
    descTr: 'Gök gürültülü fırtına modunda odaklan',
    descEn: 'Focus during a thunderstorm',
    unlocked: false,
  },
  {
    id: 'coffee_lover',
    emoji: '☕',
    nameTr: 'Kahveci',
    nameEn: 'Coffee Lover',
    descTr: 'Kupaya 20 kez tıkla',
    descEn: 'Click mug 20 times',
    unlocked: false,
  },
  {
    id: 'cat_whisperer',
    emoji: '🐾',
    nameTr: 'Kedi Fısıldayan',
    nameEn: 'Cat Whisperer',
    descTr: 'Sadık kedini 25 kez sev',
    descEn: 'Pet your companion cat 25 times',
    unlocked: false,
  },
  {
    id: 'sound_artisan',
    emoji: '🎚️',
    nameTr: 'Ses Zanaatkârı',
    nameEn: 'Soundscape Artisan',
    descTr: 'Özel mikser katmanlarıyla ambiyans oluştur',
    descEn: 'Customize dynamic ambient audio channels',
    unlocked: false,
  },
  {
    id: 'explorer',
    emoji: '🔭',
    nameTr: 'Kaşif',
    nameEn: 'Explorer',
    descTr: 'Tüm 7 odayı ziyaret et',
    descEn: 'Visit and study across all 7 rooms',
    unlocked: false,
  },
  {
    id: 'midnight_scholar',
    emoji: '🌙',
    nameTr: 'Gece Bilgesi',
    nameEn: 'Midnight Scholar',
    descTr: 'Gece yarısı modunda çalış',
    descEn: 'Study in midnight mode',
    unlocked: false,
  },
  {
    id: 'zen_master',
    emoji: '🍵',
    nameTr: 'Kyoto Zen Ustası',
    nameEn: 'Kyoto Zen Master',
    descTr: 'Kyoto çay odasında derinleş',
    descEn: 'Achieve serene focus in Kyoto Zen Room',
    unlocked: false,
  },
  {
    id: 'cyber_coder',
    emoji: '💻',
    nameTr: 'Siber Kodlayıcı',
    nameEn: 'Cyberpunk Hacker',
    descTr: 'Cyberpunk loft odasında gece seansı yap',
    descEn: 'Study late in the Cyberpunk Loft',
    unlocked: false,
  },
  {
    id: 'goal_crusher',
    emoji: '🎯',
    nameTr: 'Hedef Avcısı',
    nameEn: 'Goal Crusher',
    descTr: '10 Kuzey Yıldızı hedefini tamamla',
    descEn: 'Complete 10 North Star goal pledges',
    unlocked: false,
  },
  {
    id: 'room_master',
    emoji: '🏠',
    nameTr: 'Oda Ustası',
    nameEn: 'Room Master',
    descTr: 'Tüm oda kilitlerini aç',
    descEn: 'Unlock all room progression',
    unlocked: false,
  },
  {
    id: 'boss_slayer_horologium',
    emoji: '🕰️',
    nameTr: 'Horologium Fatihi',
    nameEn: 'Bane of Horologium',
    descTr: 'Zamanın Mekanik Muhafızını alt et',
    descEn: 'Defeat Horologium, The Clockwork Titan',
    unlocked: false,
  },
  {
    id: 'boss_slayer_acedia',
    emoji: '👻',
    nameTr: 'Acedia Fatihi',
    nameEn: 'Bane of Acedia',
    descTr: 'Erteleme Hayaletini alt et',
    descEn: 'Defeat Acedia, The Procrastination Phantom',
    unlocked: false,
  },
  {
    id: 'boss_slayer_cacophony',
    emoji: '🔔',
    nameTr: 'Cacophony Fatihi',
    nameEn: 'Bane of Cacophony',
    descTr: 'Dikkat Dağınıklığı Sirenini sustur',
    descEn: 'Silence Cacophony, The Distraction Siren',
    unlocked: false,
  },
  {
    id: 'boss_slayer_oblivion',
    emoji: '🌋',
    nameTr: 'Oblivion Fatihi',
    nameEn: 'Bane of Oblivion',
    descTr: 'Tükenmişliğin Kadim Devini alt et',
    descEn: 'Conquer Oblivion, The Burnout Colossus',
    unlocked: false,
  },
  {
    id: 'raid_veteran',
    emoji: '⚔️',
    nameTr: 'Akın Kıdemlisi',
    nameEn: 'Raid Veteran',
    descTr: 'Dünya bosslarına 25.000 hasar ver',
    descEn: 'Deal 25,000 damage to world bosses',
    unlocked: false,
  },
  {
    id: 'raid_champion',
    emoji: '🏆',
    nameTr: 'Akın Şampiyonu',
    nameEn: 'Raid Champion',
    descTr: 'Dünya bosslarına 100.000 hasar ver',
    descEn: 'Deal 100,000 damage to world bosses',
    unlocked: false,
  },
  {
    id: 'legend',
    emoji: '💫',
    nameTr: 'Kronos Efsanesi',
    nameEn: 'Chronos Legend',
    descTr: '500 saat odaklan',
    descEn: '500 hours of focus',
    unlocked: false,
  },
];

// ─── Challenge pool ───────────────────────────────────────────────────────────

const CHALLENGE_POOL: Omit<DailyChallenge, 'completed'>[] = [
  {
    id: 'focus_25',
    textTr: '25 dakika odaklan',
    textEn: 'Focus for 25 minutes',
    xpReward: 30,
    type: 'focus_minutes',
    target: 25,
  },
  {
    id: 'focus_50',
    textTr: '50 dakika odaklan',
    textEn: 'Focus for 50 minutes',
    xpReward: 50,
    type: 'focus_minutes',
    target: 50,
  },
  {
    id: 'with_music',
    textTr: 'Müzikle bir seans tamamla',
    textEn: 'Complete a session with music',
    xpReward: 15,
    type: 'with_music',
  },
  {
    id: 'with_rain',
    textTr: 'Yağmurlu havada çalış',
    textEn: 'Focus during rainy weather',
    xpReward: 20,
    type: 'with_rain',
  },
  {
    id: 'morning_session',
    textTr: 'Sabah seansı tamamla',
    textEn: 'Complete a morning session',
    xpReward: 25,
    type: 'morning',
  },
  {
    id: 'explore_room',
    textTr: 'Yeni bir oda keşfet',
    textEn: 'Explore a new room',
    xpReward: 20,
    type: 'explore_room',
  },
  {
    id: 'two_sessions',
    textTr: 'Bugün 2 seans tamamla',
    textEn: 'Complete 2 sessions today',
    xpReward: 35,
    type: 'two_sessions',
    target: 2,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pickDailyChallenges(dateStr: string): DailyChallenge[] {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash * 31) + dateStr.charCodeAt(i)) >>> 0;
  }

  const picked: DailyChallenge[] = [];
  const usedIds = new Set<string>();

  for (let attempt = 0; picked.length < 3 && attempt < 100; attempt++) {
    const idx = (hash + attempt * 7919) % CHALLENGE_POOL.length;
    const candidate = CHALLENGE_POOL[idx];
    if (candidate && !usedIds.has(candidate.id)) {
      usedIds.add(candidate.id);
      picked.push({ ...candidate, completed: false });
    }
  }

  return picked;
}

// ─── Store types ──────────────────────────────────────────────────────────────

interface GamificationState {
  xp: number;
  badges: Badge[];
  dailyChallenges: DailyChallenge[];
  challengeDate: string;
  mugClickCount: number;
  visitedRooms: string[];
  totalSessionCount: number;
  rainySessionCount: number;
  todaySessionCount: number;
  todaySessionDate: string;

  // Actions
  addXp: (amount: number, reason?: string) => void;
  checkAndUnlockBadge: (badgeId: string) => boolean;
  checkBadgesAfterSession: (session: {
    durationMinutes: number;
    roomId: string;
    weather: string;
    hour: number;
    timeOfDay?: string;
    isPlayingMusic?: boolean;
  }) => void;
  checkStreakBadges: (streakDays: number) => void;
  completeDailyChallenge: (challengeId: string) => void;
  incrementMugClicks: () => void;
  markRoomVisited: (roomId: string) => void;
  markAllProgressionUnlocked: () => void;
  refreshDailyChallengesIfNeeded: () => void;
  checkLegendBadge: (totalFocusHours: number) => void;

  // Computed
  getLevel: () => number;
  getXpToNextLevel: () => number;
  getLevelProgress: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      badges: INITIAL_BADGES,
      dailyChallenges: pickDailyChallenges(getTodayDateStr()),
      challengeDate: getTodayDateStr(),
      mugClickCount: 0,
      visitedRooms: [],
      totalSessionCount: 0,
      rainySessionCount: 0,
      todaySessionCount: 0,
      todaySessionDate: getTodayDateStr(),

      // ── Computed ────────────────────────────────────────────────────────────
      getLevel: () => Math.floor(get().xp / 500) + 1,
      getXpToNextLevel: () => 500 - (get().xp % 500),
      getLevelProgress: () => Math.round(((get().xp % 500) / 500) * 100),

      // ── Add XP ──────────────────────────────────────────────────────────────
      addXp: (amount, _reason) => {
        set((state) => ({ xp: state.xp + amount }));
      },

      // ── Badge unlock ────────────────────────────────────────────────────────
      checkAndUnlockBadge: (badgeId) => {
        const state = get();
        const badge = state.badges.find((b) => b.id === badgeId);
        if (!badge || badge.unlocked) return false;

        set((s) => ({
          badges: s.badges.map((b) =>
            b.id === badgeId ? { ...b, unlocked: true, unlockedAt: Date.now() } : b
          ),
        }));

        get().addXp(25, `Badge unlocked: ${badgeId}`);
        return true;
      },

      // ── Session badge checks ────────────────────────────────────────────────
      checkBadgesAfterSession: (session) => {
        get().refreshDailyChallengesIfNeeded();
        const { durationMinutes, weather, hour, timeOfDay, roomId } = session;
        const state = get();
        const isRainy = weather === 'rain' || weather === 'heavy_rain';

        const newTotalSessions = state.totalSessionCount + 1;
        const newRainySessions = isRainy ? state.rainySessionCount + 1 : state.rainySessionCount;

        const todayStr = getTodayDateStr();
        const isSameDay = state.todaySessionDate === todayStr;
        const newTodaySessions = isSameDay ? state.todaySessionCount + 1 : 1;

        set({
          totalSessionCount: newTotalSessions,
          rainySessionCount: newRainySessions,
          todaySessionCount: newTodaySessions,
          todaySessionDate: todayStr,
        });

        const unlock = get().checkAndUnlockBadge;

        if (newTotalSessions >= 1) unlock('first_step');
        if (newTotalSessions >= 10) unlock('reader_10');
        if (newTotalSessions >= 50) unlock('dedicated_50');
        if (durationMinutes >= 90) unlock('marathoner');
        if (hour >= 23) unlock('night_owl');
        if (hour < 6) unlock('early_bird');
        if (timeOfDay === 'midnight') unlock('midnight_scholar');
        if (newRainySessions >= 10) unlock('rainy_days');

        get().markRoomVisited(roomId);

        // Check XP for focus session
        const focusXp = Math.floor(durationMinutes / 5) * 10;
        if (focusXp > 0) get().addXp(focusXp, 'Focus session');

        // Daily challenge checks
        const challenges = get().dailyChallenges;
        challenges.forEach((ch) => {
          if (ch.completed) return;
          if (ch.type === 'focus_minutes' && ch.target !== undefined && durationMinutes >= ch.target) {
            get().completeDailyChallenge(ch.id);
          }
          if (ch.type === 'with_rain' && isRainy) {
            get().completeDailyChallenge(ch.id);
          }
          if (ch.type === 'morning' && hour >= 5 && hour < 12) {
            get().completeDailyChallenge(ch.id);
          }
          if (ch.type === 'two_sessions' && newTodaySessions >= (ch.target ?? 2)) {
            get().completeDailyChallenge(ch.id);
          }
        });
      },

      // ── Streak badges ────────────────────────────────────────────────────────
      checkStreakBadges: (streakDays) => {
        const unlock = get().checkAndUnlockBadge;
        if (streakDays >= 3) unlock('streak_3');
        if (streakDays >= 7) unlock('streak_7');
        if (streakDays >= 30) unlock('streak_30');
        // Streak XP bonus
        get().addXp(streakDays * 5, 'Streak bonus');
      },

      // ── Daily challenge completion ───────────────────────────────────────────
      completeDailyChallenge: (challengeId) => {
        const state = get();
        const challenge = state.dailyChallenges.find((c) => c.id === challengeId);
        if (!challenge || challenge.completed) return;

        set((s) => ({
          dailyChallenges: s.dailyChallenges.map((c) =>
            c.id === challengeId ? { ...c, completed: true } : c
          ),
        }));

        get().addXp(challenge.xpReward, `Daily challenge: ${challengeId}`);
      },

      // ── Mug clicks ──────────────────────────────────────────────────────────
      incrementMugClicks: () => {
        const newCount = get().mugClickCount + 1;
        set({ mugClickCount: newCount });
        if (newCount >= 20) get().checkAndUnlockBadge('coffee_lover');
      },

      // ── Room visits ──────────────────────────────────────────────────────────
      markRoomVisited: (roomId) => {
        const state = get();
        if (state.visitedRooms.includes(roomId)) return;

        const newVisited = [...state.visitedRooms, roomId];
        set({ visitedRooms: newVisited });

        const ALL_ROOMS = ['bedroom', 'apartment', 'cabin', 'library', 'cafe'];
        if (ALL_ROOMS.every((r) => newVisited.includes(r))) {
          get().checkAndUnlockBadge('explorer');
        }

        // explore_room daily challenge
        const challenges = get().dailyChallenges;
        challenges.forEach((ch) => {
          if (!ch.completed && ch.type === 'explore_room') {
            get().completeDailyChallenge(ch.id);
          }
        });
      },

      // ── Progression unlocked ─────────────────────────────────────────────────
      markAllProgressionUnlocked: () => {
        get().checkAndUnlockBadge('room_master');
      },

      // ── Legend badge (500 hours) ─────────────────────────────────────────────
      checkLegendBadge: (totalFocusHours) => {
        if (totalFocusHours >= 500) get().checkAndUnlockBadge('legend');
      },

      // ── Refresh daily challenges ─────────────────────────────────────────────
      refreshDailyChallengesIfNeeded: () => {
        const today = getTodayDateStr();
        if (get().challengeDate !== today) {
          set({
            dailyChallenges: pickDailyChallenges(today),
            challengeDate: today,
            todaySessionCount: 0,
            todaySessionDate: today,
          });
        }
      },
    }),
    {
      name: 'cozy_gamification_store',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        if (Array.isArray(persistedState.badges)) {
          const existingIds = new Set(persistedState.badges.map((b: any) => b.id));
          INITIAL_BADGES.forEach((b) => {
            if (!existingIds.has(b.id)) {
              persistedState.badges.push({ ...b });
            }
          });
        }
        return persistedState;
      },
    }
  )
);
