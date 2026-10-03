import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';
import { useGamificationStore } from './useGamificationStore';
import { useAuthStore } from './useAuthStore';
import { 
  syncBossAttackToFirestore, 
  resetBossInFirestore 
} from '../firebase/bossRaidSync';

export type BossId = 'horologium' | 'acedia' | 'cacophony' | 'oblivion';

export interface BossData {
  id: BossId;
  name: string;
  unlockLevel: number;
  titleTr: string;
  titleEn: string;
  subtitleTr: string;
  subtitleEn: string;
  maxHp: number;
  currentHp: number;
  isDefeated: boolean;
  themeColor: string;
  avatar: string;
  descriptionTr: string;
  descriptionEn: string;
  trophyId: string;
  trophyNameTr: string;
  trophyNameEn: string;
  trophyDescTr: string;
  trophyDescEn: string;
  playerTitleTr: string;
  playerTitleEn: string;
  badgeId: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  city: string;
  flag: string;
  damage: number;
  contributionPct: number;
  focusHours: number;
  badge: string;
  isSelf?: boolean;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  bossId: string;
  damage: number;
  isCritical: boolean;
  minutes: number;
  note?: string;
  isCommunity?: boolean;
  userName?: string;
  location?: string;
}

export interface LootReward {
  bossId: BossId;
  milestone: number;
  xp: number;
  charges: number;
  titleTr: string;
  titleEn: string;
}

export const MILESTONE_REWARDS: Record<number, { xp: number; charges: number; titleTr: string; titleEn: string }> = {
  75: {
    xp: 100,
    charges: 1,
    titleTr: 'Zaman Kaşifi',
    titleEn: 'Chrono Scout',
  },
  50: {
    xp: 250,
    charges: 2,
    titleTr: 'Kadim Muhafız',
    titleEn: 'Raid Veteran',
  },
  25: {
    xp: 500,
    charges: 3,
    titleTr: 'Titan Fatihi',
    titleEn: 'Titan Slayer',
  },
  0: {
    xp: 1000,
    charges: 5,
    titleTr: 'Kronos Efsanevi Fatihi',
    titleEn: 'Legendary Conqueror of Chronos',
  },
};

export function getNextSundayMidnight(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysUntilSunday);
  target.setHours(23, 59, 59, 999);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

export function isFrenzyHour(): boolean {
  const hour = new Date().getHours();
  return (hour >= 16 && hour < 18) || (hour >= 21 && hour < 23);
}

export function getFrenzyRemainingMinutes(): number {
  const now = new Date();
  const hour = now.getHours();
  const mins = now.getMinutes();
  if (hour >= 16 && hour < 18) {
    return (17 - hour) * 60 + (60 - mins);
  }
  if (hour >= 21 && hour < 23) {
    return (22 - hour) * 60 + (60 - mins);
  }
  return 0;
}

export const DEFAULT_BOSSES: Record<BossId, BossData> = {
  horologium: {
    id: 'horologium',
    name: 'Horologium',
    unlockLevel: 1,
    titleTr: 'Zamanın Mekanik Devi',
    titleEn: 'The Clockwork Titan',
    subtitleTr: 'Tik-tak seslerinin ve başlama kaygısının kadim mekanik devi',
    subtitleEn: 'Ancient clockwork construct of ticking anxiety & procrastination',
    maxHp: 100000,
    currentHp: 96400,
    isDefeated: false,
    themeColor: '#f59e0b',
    avatar: '🕰️',
    descriptionTr: 'Dev pirinç dişlilerden ve sarkaçtan oluşur. Tüm dünyadaki öğrencilerin odaklanmasıyla kolektif olarak zayıflar. 25 dakikalık Pomodoro 100 DMG, hedef sadakati 200 Kritik vurur!',
    descriptionEn: 'Forged of spinning brass cogs and pendulum blades. All global studiers attack together! 25m Pomodoro deals 100 DMG, pledge adds 200 Critical Strike!',
    trophyId: 'trophy_hourglass',
    trophyNameTr: 'Altın Kum Saati & Zaman Sarkacı',
    trophyNameEn: "Horologium's Golden Hourglass",
    trophyDescTr: 'Kitaplığına yerleştirilen 32-bit altın kum saati. Zamanın efendisi olduğunu simgeler.',
    trophyDescEn: 'A tangible 32-bit golden hourglass placed upon your shelf.',
    playerTitleTr: 'Zaman Muhafızı',
    playerTitleEn: 'Time Guardian',
    badgeId: 'boss_slayer_horologium',
  },
  acedia: {
    id: 'acedia',
    name: 'Acedia',
    unlockLevel: 3,
    titleTr: 'Erteleme Hayaleti',
    titleEn: 'The Procrastination Phantom',
    subtitleTr: 'Seni rehavete ve uykuya çeken mor dumanlı gölge varlık',
    subtitleEn: 'Spectral shade whispering snooze excuses and lethargy',
    maxHp: 250000,
    currentHp: 243500,
    isDefeated: false,
    themeColor: '#a855f7',
    avatar: '👻',
    descriptionTr: 'Kırık zincirler ve uyku rünleriyle süzülür. Ertelemeyi aştığın her an dünya çapındaki çalışma dalgasıyla aurası parçalanır.',
    descriptionEn: 'Wraith of heavy inertia. Breaks apart with consistent focused study blocks across the global community.',
    trophyId: 'trophy_censer',
    trophyNameTr: 'Sonsuz Lavanta Buhurdanlığı',
    trophyNameEn: "Acedia's Zen Incense Censer",
    trophyDescTr: 'Masanda hafif lavanta dumanı tüten pixel art tütsülük. Zihnini berrak ve canlı tutar.',
    trophyDescEn: 'A cozy desk censer wafting gentle lavender smoke particles.',
    playerTitleTr: 'Atalet Kıran',
    playerTitleEn: 'Sloth Slayer',
    badgeId: 'boss_slayer_acedia',
  },
  cacophony: {
    id: 'cacophony',
    name: 'Cacophony',
    unlockLevel: 6,
    titleTr: 'Dikkat Dağınıklığı Sireni',
    titleEn: 'The Distraction Siren',
    subtitleTr: 'Bildirim zilleri, telefon bağımlılığı ve gürültünün kaotik canavarı',
    subtitleEn: 'Noisy chimera of notification pings and social media noise',
    maxHp: 500000,
    currentHp: 489000,
    isDefeated: false,
    themeColor: '#06b6d4',
    avatar: '🔔',
    descriptionTr: 'Glitch efektli bildirim simgeleriyle dikkatini dağıtmaya çalışır. Küresel derin odaklanma dalgalarıyla susturulur!',
    descriptionEn: 'Flashes digital glitch alerts and ping icons. Silence it with uninterrupted community deep work!',
    trophyId: 'trophy_prism_crystal',
    trophyNameTr: 'Prizma Odak Kristali & Ambilight Aurası',
    trophyNameEn: 'Prism Focus Crystal & Ambilight Aura',
    trophyDescTr: 'Odanın ambiyansını zenginleştiren parlak kristal ve prizmatik ışık halkası.',
    trophyDescEn: 'Radiant crystal node that unlocks the deep dynamic Ambilight Prism halo.',
    playerTitleTr: 'Sessizliğin Efendisi',
    playerTitleEn: 'Master of Silence',
    badgeId: 'boss_slayer_cacophony',
  },
  oblivion: {
    id: 'oblivion',
    name: 'Oblivion',
    unlockLevel: 10,
    titleTr: 'Tükenmişliğin Kadim Devi',
    titleEn: 'The Burnout Colossus',
    subtitleTr: 'Aşırı yüklenme, yorgunluk ve tükenmişliğin volkanik lav devi',
    subtitleEn: 'Volcanic magma colossus born of exhaustion and chaos',
    maxHp: 1000000,
    currentHp: 994000,
    isDefeated: false,
    themeColor: '#ef4444',
    avatar: '🌋',
    descriptionTr: 'Kızıl lav çatlaklarıyla parıldayan dev titan. Düzenli çalışma ritmi, dengeli molalar ve kolektif dayanışmayla fethedilir.',
    descriptionEn: 'The ultimate boss of burnout. Conquered through balanced community pacing, rest, and true mastery.',
    trophyId: 'trophy_eternal_crown',
    trophyNameTr: 'Ebedi Kronos Tacı & Odak Asası',
    trophyNameEn: 'Eternal Chrono-Crown & Scepter',
    trophyDescTr: 'En yüce odak zaferinin simgesi olan parlak altın kraliyet tacı ve altın oda aurası.',
    trophyDescEn: 'The pinnacle of study mastery: golden crown displayed proudly on your shelf.',
    playerTitleTr: 'Kronos Fatihi',
    playerTitleEn: 'Conqueror of Chronos',
    badgeId: 'boss_slayer_oblivion',
  },
};

export const DEFAULT_LEADERBOARDS: Record<BossId, LeaderboardEntry[]> = {
  horologium: [
    { id: 'lb-h1', rank: 1, name: 'Aoi Takahashi', city: 'Kyoto', flag: '🇯🇵', damage: 8450, contributionPct: 8.45, focusHours: 35.2, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-h2', rank: 2, name: 'Lucas Petit', city: 'Paris', flag: '🇫🇷', damage: 6200, contributionPct: 6.20, focusHours: 25.8, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-h3', rank: 3, name: 'Defne Kaya', city: 'Istanbul', flag: '🇹🇷', damage: 5800, contributionPct: 5.80, focusHours: 24.1, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-h4', rank: 4, name: 'David Miller', city: 'London', flag: '🇬🇧', damage: 4100, contributionPct: 4.10, focusHours: 17.0, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-h5', rank: 5, name: 'Hana Song', city: 'Seoul', flag: '🇰🇷', damage: 3450, contributionPct: 3.45, focusHours: 14.3, badge: '🌱 Çaylak Savaşçı' },
    { id: 'lb-h6', rank: 6, name: 'Mateo Rossi', city: 'Milan', flag: '🇮🇹', damage: 2900, contributionPct: 2.90, focusHours: 12.0, badge: '🌱 Çaylak Savaşçı' },
  ],
  acedia: [
    { id: 'lb-a1', rank: 1, name: 'Elena Voronina', city: 'Berlin', flag: '🇩🇪', damage: 14200, contributionPct: 5.68, focusHours: 59.1, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-a2', rank: 2, name: 'Kenji Sato', city: 'Tokyo', flag: '🇯🇵', damage: 11800, contributionPct: 4.72, focusHours: 49.1, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-a3', rank: 3, name: 'Emre Demir', city: 'Ankara', flag: '🇹🇷', damage: 9400, contributionPct: 3.76, focusHours: 39.1, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-a4', rank: 4, name: 'Sarah Jenkins', city: 'Boston', flag: '🇺🇸', damage: 7600, contributionPct: 3.04, focusHours: 31.6, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-a5', rank: 5, name: 'Lars Lindqvist', city: 'Stockholm', flag: '🇸🇪', damage: 5200, contributionPct: 2.08, focusHours: 21.6, badge: '🌱 Çaylak Savaşçı' },
  ],
  cacophony: [
    { id: 'lb-c1', rank: 1, name: 'Sophie Bernard', city: 'Lyon', flag: '🇫🇷', damage: 22500, contributionPct: 4.50, focusHours: 93.7, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-c2', rank: 2, name: 'Burak Yılmaz', city: 'Izmir', flag: '🇹🇷', damage: 18400, contributionPct: 3.68, focusHours: 76.6, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-c3', rank: 3, name: 'Oliver Schmidt', city: 'Munich', flag: '🇩🇪', damage: 14900, contributionPct: 2.98, focusHours: 62.0, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-c4', rank: 4, name: 'Yuki Tanaka', city: 'Osaka', flag: '🇯🇵', damage: 11200, contributionPct: 2.24, focusHours: 46.6, badge: '🛡️ Kıdemli Savaşçı' },
  ],
  oblivion: [
    { id: 'lb-o1', rank: 1, name: 'Alexander Wright', city: 'Oxford', flag: '🇬🇧', damage: 38000, contributionPct: 3.80, focusHours: 158.3, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-o2', rank: 2, name: 'Zeynep Öztürk', city: 'Istanbul', flag: '🇹🇷', damage: 31500, contributionPct: 3.15, focusHours: 131.2, badge: '⚔️ Elit Şampiyon' },
    { id: 'lb-o3', rank: 3, name: 'Liam Keller', city: 'Toronto', flag: '🇨🇦', damage: 26800, contributionPct: 2.68, focusHours: 111.6, badge: '🛡️ Kıdemli Savaşçı' },
    { id: 'lb-o4', rank: 4, name: 'Min-jun Park', city: 'Busan', flag: '🇰🇷', damage: 21400, contributionPct: 2.14, focusHours: 89.1, badge: '🛡️ Kıdemli Savaşçı' },
  ],
};

interface BossRaidState {
  currentBossId: BossId;
  bosses: Record<BossId, BossData>;
  unlockedTrophies: string[];
  totalBossDamageDealt: number;
  personalDamagePerBoss: Record<string, number>;
  combatLogs: CombatLogEntry[];
  globalRaidersCount: number;
  strikeCharges: number;
  lastAttackResult: {
    damage: number;
    isCritical: boolean;
    bossName: string;
    defeated: boolean;
    timestamp: number;
  } | null;

  // New Progression & Habit Gamification Fields
  seasonExpiresAt: number;
  sessionCombo: number;
  lastSessionCompletedAt: number;
  hasWellRestedBuff: boolean;
  catMoraleBuffUntil: number;
  lastDailyBonusDate: string;
  claimedMilestones: Record<string, number[]>;
  activeLootReward: LootReward | null;
  leaderboards: Record<BossId, LeaderboardEntry[]>;

  // Actions
  setCurrentBoss: (bossId: BossId) => void;
  addStrikeCharges: (charges: number) => void;
  executeStrike: (chargeCost: number, isCritical?: boolean) => { damage: number; isCritical: boolean; defeated: boolean; success: boolean };
  attackCurrentBoss: (focusMinutes: number, hasGoalPledge: boolean) => { damage: number; isCritical: boolean; defeated: boolean };
  quickPracticeStrike: () => { damage: number; isCritical: boolean; defeated: boolean };
  simulateCommunityAttack: () => void;
  resetBoss: (bossId: string) => void;
  unlockTrophy: (trophyId: string) => void;
  isTrophyUnlocked: (trophyId: string) => boolean;
  getLeaderboard: (bossId: BossId) => LeaderboardEntry[];

  // Advanced Gamification Actions
  checkSeasonReset: () => void;
  grantWellRestedBuff: () => void;
  grantCatMoraleBuff: () => void;
  hasCatMoraleBuff: () => boolean;
  recordSessionCompleted: (minutes: number) => { bonusCharges: number; isComboIncreased: boolean; comboCount: number; isDawnBonus: boolean };
  claimMilestoneChest: (bossId: BossId, milestone: number) => boolean;
  dismissLootReward: () => void;
  handleRemoteBossAttack: (data: any) => void;
  getComboMultiplier: () => number;
}

let raidBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    raidBroadcastChannel = new BroadcastChannel('chronos_global_boss_raid');
  } catch (e) {
    console.warn('BroadcastChannel error', e);
  }
}

function broadcastAttackOverNetwork(payload: any) {
  if (raidBroadcastChannel) {
    try {
      raidBroadcastChannel.postMessage({ type: 'BOSS_ATTACK', ...payload });
    } catch {}
  }
  if (typeof window !== 'undefined') {
    fetch('/api/boss-attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attack: payload }),
    }).catch(() => {});
  }
}

export const useBossRaidStore = create<BossRaidState>()(
  persist(
    (set, get) => ({
      currentBossId: 'horologium',
      bosses: { ...DEFAULT_BOSSES },
      unlockedTrophies: [],
      totalBossDamageDealt: 0,
      personalDamagePerBoss: {},
      globalRaidersCount: 1,
      strikeCharges: 1,
      combatLogs: [],
      lastAttackResult: null,

      // Habit Gamification State
      seasonExpiresAt: getNextSundayMidnight(),
      sessionCombo: 1,
      lastSessionCompletedAt: 0,
      hasWellRestedBuff: false,
      catMoraleBuffUntil: 0,
      lastDailyBonusDate: '',
      claimedMilestones: {},
      activeLootReward: null,
      leaderboards: { ...DEFAULT_LEADERBOARDS },

      setCurrentBoss: (currentBossId) => set({ currentBossId }),

      addStrikeCharges: (charges: number) => {
        set((state) => ({
          strikeCharges: (state.strikeCharges ?? 1) + charges,
        }));
      },

      grantWellRestedBuff: () => {
        set({ hasWellRestedBuff: true });
        const lang = useAppStore.getState().language;
        useAppStore.getState().showToast(
          lang === 'tr'
            ? '☕ Mola İntizamı Bonusu: Dinlendin ve zihnin tazelendi! Sıradaki boss vuruşun GARANTİLİ KRİTİK olacak!'
            : '☕ Well Rested Buff: Mind refreshed! Your next boss strike will be a GUARANTEED CRITICAL!',
          5000
        );
      },

      grantCatMoraleBuff: () => {
        set({ catMoraleBuffUntil: Date.now() + 30 * 60 * 1000 });
      },

      hasCatMoraleBuff: () => (get().catMoraleBuffUntil || 0) > Date.now(),

      getComboMultiplier: () => {
        const combo = get().sessionCombo || 1;
        if (combo >= 4) return 1.75;
        if (combo === 3) return 1.5;
        if (combo === 2) return 1.25;
        return 1.0;
      },

      recordSessionCompleted: (minutes: number) => {
        const state = get();
        const now = Date.now();
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Dawn Bonus (First session of the day)
        let isDawnBonus = false;
        let bonusCharges = 0;
        if (state.lastDailyBonusDate !== todayStr) {
          isDawnBonus = true;
          bonusCharges += 1;
          try {
            useGamificationStore.getState().addXp(50, 'Dawn Awakening');
          } catch {}
          const lang = useAppStore.getState().language;
          setTimeout(() => {
            useAppStore.getState().showToast(
              lang === 'tr'
                ? '🌅 Şafak Vakti Bonusu: Günün ilk odak seansını tamamladın! (+50 XP & +1 Ekstra Odak Yükü)'
                : '🌅 Dawn Awakening Bonus: First session of the day completed! (+50 XP & +1 Bonus Strike Charge)',
              6000
            );
          }, 1500);
        }

        // 2. Combo Meter (within 45 min of last session)
        const isComboActive = state.lastSessionCompletedAt > 0 && (now - state.lastSessionCompletedAt) <= 45 * 60 * 1000;
        const newCombo = isComboActive ? Math.min(5, (state.sessionCombo || 1) + 1) : 1;

        set({
          sessionCombo: newCombo,
          lastSessionCompletedAt: now,
          lastDailyBonusDate: todayStr,
          strikeCharges: (state.strikeCharges ?? 1) + bonusCharges,
        });

        return {
          bonusCharges,
          isComboIncreased: newCombo > 1,
          comboCount: newCombo,
          isDawnBonus,
        };
      },

      checkSeasonReset: () => {
        const state = get();
        const now = Date.now();
        if (state.seasonExpiresAt && now < state.seasonExpiresAt) return;

        const nextSunday = getNextSundayMidnight();
        const resetBosses: Record<BossId, BossData> = { ...DEFAULT_BOSSES };
        for (const key of Object.keys(DEFAULT_BOSSES) as BossId[]) {
          resetBosses[key] = {
            ...DEFAULT_BOSSES[key],
            currentHp: DEFAULT_BOSSES[key].maxHp,
            isDefeated: false,
          };
        }

        set({
          seasonExpiresAt: nextSunday,
          bosses: resetBosses,
          claimedMilestones: {},
        });
      },

      claimMilestoneChest: (bossId: BossId, milestone: number) => {
        const state = get();
        const boss = state.bosses[bossId];
        if (!boss) return false;

        const currentClaimed = state.claimedMilestones?.[bossId] || [];
        if (currentClaimed.includes(milestone)) return false;

        const hpPct = boss.maxHp > 0 ? Math.round((boss.currentHp / boss.maxHp) * 100) : 0;
        if (milestone === 0 ? (!boss.isDefeated && hpPct > 0) : hpPct > milestone) {
          return false;
        }

        const reward = MILESTONE_REWARDS[milestone] || { xp: 100, charges: 1, titleTr: 'Akıncı', titleEn: 'Raider' };

        try {
          useGamificationStore.getState().addXp(reward.xp, `Boss Milestone %${milestone}`);
        } catch {}

        const newCharges = (state.strikeCharges ?? 1) + reward.charges;
        const newClaimed = {
          ...state.claimedMilestones,
          [bossId]: [...currentClaimed, milestone],
        };

        set({
          strikeCharges: newCharges,
          claimedMilestones: newClaimed,
          activeLootReward: {
            bossId,
            milestone,
            xp: reward.xp,
            charges: reward.charges,
            titleTr: reward.titleTr,
            titleEn: reward.titleEn,
          },
        });

        try {
          webAudioEngine.playBossVictory();
        } catch {}

        const lang = useAppStore.getState().language;
        useAppStore.getState().showToast(
          lang === 'tr'
            ? `🎁 Ganimet Sandığı Açıldı! +${reward.xp} XP ve +${reward.charges} Yük kazandın!`
            : `🎁 Milestone Chest Opened! +${reward.xp} XP and +${reward.charges} Charges earned!`,
          4000
        );

        return true;
      },

      dismissLootReward: () => set({ activeLootReward: null }),

      executeStrike: (chargeCost: number, isCritical = false) => {
        const state = get();
        const currentCharges = state.strikeCharges ?? 1;
        if (currentCharges < chargeCost) {
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `⚡ Yetersiz Odak Yükü! (Gereken: ${chargeCost}, Mevcut: ${currentCharges}) 25 dk odaklanarak yük kazan.`
            : `⚡ Insufficient Strike Charges! (Needs: ${chargeCost}, You have: ${currentCharges}) Study 25m to earn charges.`;
          useAppStore.getState().showToast(msg, 3500);
          return { damage: 0, isCritical: false, defeated: false, success: false };
        }

        const boss = state.bosses[state.currentBossId] || state.bosses.horologium;
        if (boss.isDefeated) {
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr' ? 'Bu boss zaten mağlup edildi! Yeniden meydan oku.' : 'Boss already defeated! Rematch to fight again.';
          useAppStore.getState().showToast(msg, 3000);
          return { damage: 0, isCritical: false, defeated: false, success: false };
        }

        // Deduct strike charges
        const newCharges = currentCharges - chargeCost;

        // Frenzy & Combo Multipliers
        const isFrenzy = isFrenzyHour();
        const frenzyMult = isFrenzy ? 1.5 : 1.0;
        const comboCount = state.sessionCombo || 1;
        const comboMult = comboCount >= 4 ? 1.75 : comboCount === 3 ? 1.5 : comboCount === 2 ? 1.25 : 1.0;

        // Well Rested Buff guarantees critical strike
        const hasWellRested = state.hasWellRestedBuff;
        const critRoll = hasWellRested || isCritical || (chargeCost >= 2 ? Math.random() < 0.6 : Math.random() < 0.25);

        let baseDmg = chargeCost === 1 ? 250 : 650;
        if (critRoll && chargeCost === 1) baseDmg = 350;
        if (critRoll && chargeCost >= 2) baseDmg = 800;

        // Cat Morale Buff (+10% DMG from petting cat)
        const hasCatMorale = (state.catMoraleBuffUntil || 0) > Date.now();
        const catMult = hasCatMorale ? 1.10 : 1.0;

        const totalDamage = Math.round(baseDmg * frenzyMult * comboMult * catMult);
        const newHp = Math.max(0, boss.currentHp - totalDamage);
        const defeated = newHp === 0 && !boss.isDefeated;

        const updatedBoss: BossData = {
          ...boss,
          currentHp: newHp,
          isDefeated: boss.isDefeated || defeated,
        };

        const newUnlockedTrophies = [...state.unlockedTrophies];
        if (defeated && !newUnlockedTrophies.includes(boss.trophyId)) {
          newUnlockedTrophies.push(boss.trophyId);
        }

        // Build rich note
        const noteParts: string[] = [critRoll ? `⚡ ${chargeCost} Yük Kritik` : `⚡ ${chargeCost} Yük`];
        if (isFrenzy) noteParts.push('🔥 Altın Saat (+50%)');
        if (comboCount > 1) noteParts.push(`💥 ${comboCount}x Kombo`);
        if (hasWellRested) noteParts.push('☕ Mola İntizamı');
        if (hasCatMorale) noteParts.push('🐾 Kedi Huzur Desteği (+10%)');

        const logEntry: CombatLogEntry = {
          id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          bossId: boss.id,
          damage: totalDamage,
          isCritical: critRoll,
          minutes: chargeCost * 25,
          note: noteParts.join(' • '),
        };

        const currentBossPersonalDmg = (state.personalDamagePerBoss[boss.id] || 0) + totalDamage;

        set({
          strikeCharges: newCharges,
          hasWellRestedBuff: false, // consumed
          bosses: {
            ...state.bosses,
            [boss.id]: updatedBoss,
          },
          unlockedTrophies: newUnlockedTrophies,
          totalBossDamageDealt: state.totalBossDamageDealt + totalDamage,
          personalDamagePerBoss: {
            ...state.personalDamagePerBoss,
            [boss.id]: currentBossPersonalDmg,
          },
          combatLogs: [logEntry, ...state.combatLogs.slice(0, 49)],
          lastAttackResult: {
            damage: totalDamage,
            isCritical: critRoll,
            bossName: boss.name,
            defeated,
            timestamp: Date.now(),
          },
        });

        // Audio & Toast Feedback
        if (defeated) {
          webAudioEngine.playBossVictory();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `👑 KÜRESEL ZAFER! ${boss.name} (${boss.titleTr}) mağlup edildi! "${boss.trophyNameTr}" vitrinine eklendi!`
            : `👑 GLOBAL VICTORY! ${boss.name} defeated! "${boss.trophyNameEn}" placed in your profile showcase!`;
          useAppStore.getState().showToast(msg, 7000);
        } else if (critRoll) {
          webAudioEngine.playBossCrit();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `⚡ KRİTİK VURUŞ! ${boss.name}'a ${totalDamage} HASAR verdin! (Kalan Yük: ${newCharges})`
            : `⚡ CRITICAL STRIKE! Dealt ${totalDamage} DMG to ${boss.name}! (Remaining Charges: ${newCharges})`;
          useAppStore.getState().showToast(msg, 4500);
        } else {
          webAudioEngine.playBossHit();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `⚔️ ${boss.name}'a ${totalDamage} hasar verildi! Kalan Can: ${newHp.toLocaleString()}/${boss.maxHp.toLocaleString()} (Kalan Yük: ${newCharges})`
            : `⚔️ Dealt ${totalDamage} DMG to ${boss.name}! Remaining HP: ${newHp.toLocaleString()} (Charges: ${newCharges})`;
          useAppStore.getState().showToast(msg, 3500);
        }

        // Broadcast across network & Firebase Firestore
        try {
          const user = useAuthStore.getState().user;
          syncBossAttackToFirestore(boss.id, {
            userId: user?.uid || 'guest-studier',
            userName: user?.displayName || 'Sen',
            damage: totalDamage,
            isCritical: critRoll,
            city: 'Senin Odan',
            flag: '⭐',
            minutes: chargeCost * 25,
            newHp,
            maxHp: boss.maxHp,
            defeated,
          });
        } catch {}

        broadcastAttackOverNetwork({
          bossId: boss.id,
          damage: totalDamage,
          isCritical: critRoll,
          newHp,
          defeated,
          userName: 'Sen',
          city: 'Senin Odan',
          minutes: chargeCost * 25,
          timestamp: Date.now(),
        });

        return { damage: totalDamage, isCritical: critRoll, defeated, success: true };
      },

      attackCurrentBoss: (focusMinutes: number, hasGoalPledge: boolean) => {
        const state = get();
        const boss = state.bosses[state.currentBossId] || state.bosses.horologium;

        let baseDamage = focusMinutes * 4;
        if (focusMinutes >= 50) {
          baseDamage += 50;
        }

        const isCritical = hasGoalPledge;
        const isFrenzy = isFrenzyHour();
        const frenzyMult = isFrenzy ? 1.5 : 1.0;
        const comboCount = state.sessionCombo || 1;
        const comboMult = comboCount >= 4 ? 1.75 : comboCount === 3 ? 1.5 : comboCount === 2 ? 1.25 : 1.0;

        const hasCatMorale = (state.catMoraleBuffUntil || 0) > Date.now();
        const catMult = hasCatMorale ? 1.10 : 1.0;

        let totalDamage = Math.round(isCritical ? baseDamage * 2.0 : baseDamage);
        totalDamage = Math.round(totalDamage * frenzyMult * comboMult * catMult);

        const newHp = Math.max(0, boss.currentHp - totalDamage);
        const defeated = newHp === 0 && !boss.isDefeated;

        const updatedBoss: BossData = {
          ...boss,
          currentHp: newHp,
          isDefeated: boss.isDefeated || defeated,
        };

        const newUnlockedTrophies = [...state.unlockedTrophies];
        if (defeated && !newUnlockedTrophies.includes(boss.trophyId)) {
          newUnlockedTrophies.push(boss.trophyId);
        }

        const logEntry: CombatLogEntry = {
          id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          bossId: boss.id,
          damage: totalDamage,
          isCritical,
          minutes: focusMinutes,
          note: isCritical ? '🎯 Kuzey Yıldızı Hedefi Tamamlandı (+2x Kritik)' : undefined,
        };

        const currentBossPersonalDmg = (state.personalDamagePerBoss[boss.id] || 0) + totalDamage;

        set({
          bosses: {
            ...state.bosses,
            [boss.id]: updatedBoss,
          },
          unlockedTrophies: newUnlockedTrophies,
          totalBossDamageDealt: state.totalBossDamageDealt + totalDamage,
          personalDamagePerBoss: {
            ...state.personalDamagePerBoss,
            [boss.id]: currentBossPersonalDmg,
          },
          combatLogs: [logEntry, ...state.combatLogs.slice(0, 49)],
          lastAttackResult: {
            damage: totalDamage,
            isCritical,
            bossName: boss.name,
            defeated,
            timestamp: Date.now(),
          },
        });

        if (defeated) {
          webAudioEngine.playBossVictory();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `👑 KÜRESEL ZAFER! ${boss.name} (${boss.titleTr}) mağlup edildi! "${boss.trophyNameTr}" vitrinine eklendi!`
            : `👑 GLOBAL VICTORY! ${boss.name} defeated! "${boss.trophyNameEn}" placed in your profile showcase!`;
          useAppStore.getState().showToast(msg, 7000);
        } else if (isCritical) {
          webAudioEngine.playBossCrit();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `⚡ KRİTİK VURUŞ! Hedefini tamamlayarak ${boss.name}'a ${totalDamage} HASAR verdin!`
            : `⚡ CRITICAL STRIKE! Goal completed! Dealt ${totalDamage} DMG to ${boss.name}!`;
          useAppStore.getState().showToast(msg, 5000);
        } else {
          webAudioEngine.playBossHit();
          const lang = useAppStore.getState().language;
          const msg = lang === 'tr'
            ? `⚔️ ${boss.name}'a ${totalDamage} hasar verildi! Kalan Can: ${newHp.toLocaleString()}/${boss.maxHp.toLocaleString()}`
            : `⚔️ Dealt ${totalDamage} DMG to ${boss.name}! Remaining HP: ${newHp.toLocaleString()}/${boss.maxHp.toLocaleString()}`;
          useAppStore.getState().showToast(msg, 4000);
        }

        // Broadcast across network & Firebase Firestore
        try {
          const user = useAuthStore.getState().user;
          syncBossAttackToFirestore(boss.id, {
            userId: user?.uid || 'guest-studier',
            userName: user?.displayName || 'Sen',
            damage: totalDamage,
            isCritical,
            city: 'Senin Odan',
            flag: '⭐',
            minutes: focusMinutes,
            newHp,
            maxHp: boss.maxHp,
            defeated,
          });
        } catch {}

        broadcastAttackOverNetwork({
          bossId: boss.id,
          damage: totalDamage,
          isCritical,
          newHp,
          defeated,
          userName: 'Sen',
          city: 'Senin Odan',
          minutes: focusMinutes,
          timestamp: Date.now(),
        });

        return { damage: totalDamage, isCritical, defeated };
      },

      handleRemoteBossAttack: (data: any) => {
        if (!data || !data.bossId) return;
        const state = get();
        const currentBoss = state.bosses[data.bossId as BossId];
        if (!currentBoss) return;

        const newHp = Math.max(0, Math.min(currentBoss.currentHp, data.newHp));
        const defeated = data.defeated || (newHp === 0 && !currentBoss.isDefeated);

        const logEntry: CombatLogEntry = {
          id: `net-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: data.timestamp || Date.now(),
          bossId: data.bossId,
          damage: data.damage,
          isCritical: data.isCritical,
          minutes: data.minutes || 25,
          isCommunity: true,
          userName: data.userName || 'Çevrimiçi Akıncı',
          location: data.city || 'Online',
        };

        const currentLb = [...(state.leaderboards?.[data.bossId as BossId] || [])];
        const peerName = data.userName || 'Çevrimiçi Akıncı';
        const existingPeer = currentLb.find((e) => e.name === peerName);
        if (existingPeer) {
          existingPeer.damage += data.damage;
          existingPeer.contributionPct = currentBoss.maxHp > 0 ? Number(((existingPeer.damage / currentBoss.maxHp) * 100).toFixed(2)) : 0;
          existingPeer.focusHours = Number((existingPeer.damage / 240).toFixed(1));
        } else {
          currentLb.push({
            id: `peer-lb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            rank: currentLb.length + 1,
            name: peerName,
            city: data.city || 'Online',
            flag: '🌍',
            damage: data.damage,
            contributionPct: currentBoss.maxHp > 0 ? Number(((data.damage / currentBoss.maxHp) * 100).toFixed(2)) : 0,
            focusHours: Number((data.damage / 240).toFixed(1)),
            badge: '🛡️ Çevrimiçi Akıncı',
            isSelf: false,
          });
        }

        set({
          bosses: {
            ...state.bosses,
            [data.bossId]: {
              ...currentBoss,
              currentHp: newHp,
              isDefeated: currentBoss.isDefeated || defeated,
            },
          },
          leaderboards: {
            ...state.leaderboards,
            [data.bossId]: currentLb,
          },
          combatLogs: [logEntry, ...state.combatLogs.slice(0, 49)],
          lastAttackResult: {
            damage: data.damage,
            isCritical: data.isCritical,
            bossName: currentBoss.name,
            defeated,
            timestamp: Date.now(),
          },
        });
      },

      quickPracticeStrike: () => {
        const state = get();
        const boss = state.bosses[state.currentBossId] || state.bosses.horologium;

        webAudioEngine.playBossHit();
        const lang = useAppStore.getState().language;
        const msg = lang === 'tr'
          ? '🎯 Hedef Tahtası: Test vuruşu yapıldı! (Can eksilmez, yük harcanmaz)'
          : '🎯 Practice Target: Test strike executed! (0 DMG, 0 charges consumed)';
        useAppStore.getState().showToast(msg, 2500);

        set({
          lastAttackResult: {
            damage: 0,
            isCritical: false,
            bossName: boss.name,
            defeated: false,
            timestamp: Date.now(),
          },
        });

        return { damage: 0, isCritical: false, defeated: false };
      },

      simulateCommunityAttack: () => {
        // Disabled: fake bot attacks removed to display true real user interactions
      },

      resetBoss: (bossId: string) => {
        const defaultBoss = DEFAULT_BOSSES[bossId as BossId];
        if (!defaultBoss) return;
        set((state) => ({
          bosses: {
            ...state.bosses,
            [bossId]: {
              ...defaultBoss,
              currentHp: defaultBoss.maxHp,
              isDefeated: false,
            },
          },
          personalDamagePerBoss: {
            ...state.personalDamagePerBoss,
            [bossId]: 0,
          },
        }));
        try {
          resetBossInFirestore(bossId as BossId, defaultBoss.maxHp);
        } catch {}
      },

      unlockTrophy: (trophyId: string) => {
        set((state) => ({
          unlockedTrophies: state.unlockedTrophies.includes(trophyId)
            ? state.unlockedTrophies
            : [...state.unlockedTrophies, trophyId],
        }));
      },

      isTrophyUnlocked: (trophyId: string) => {
        return get().unlockedTrophies.includes(trophyId);
      },

      getLeaderboard: (bossId: BossId) => {
        const state = get();
        const baseEntries = (state.leaderboards?.[bossId] && state.leaderboards[bossId].length > 0)
          ? state.leaderboards[bossId]
          : (DEFAULT_LEADERBOARDS[bossId] || []);
        const myDmg = state.personalDamagePerBoss[bossId] || 0;
        const boss = state.bosses[bossId] || DEFAULT_BOSSES[bossId];
        const myPct = boss.maxHp > 0 ? Number(((myDmg / boss.maxHp) * 100).toFixed(2)) : 0;
        const myHours = Number((myDmg / 240).toFixed(1));

        const entries: LeaderboardEntry[] = [];
        if (myDmg > 0) {
          const user = useAuthStore.getState().user;
          const myName = user?.displayName || 'Sen';
          entries.push({
            id: 'self-entry',
            rank: 1,
            name: myName,
            city: 'Senin Odan',
            flag: '⭐',
            damage: myDmg,
            contributionPct: myPct,
            focusHours: myHours,
            badge: myDmg > 5000 ? '⚔️ Elit Şampiyon' : (myDmg > 1000 ? '🛡️ Kıdemli Savaşçı' : '🌱 Çaylak Savaşçı'),
            isSelf: true,
          });
        }

        const all = [...entries, ...baseEntries.filter((e) => !e.isSelf)].sort((a, b) => b.damage - a.damage);
        return all.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      },
    }),
    {
      name: 'cozy_chronos_boss_raids',
      version: 7,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        persistedState.globalRaidersCount = 1;
        persistedState.seasonExpiresAt = persistedState.seasonExpiresAt || getNextSundayMidnight();
        persistedState.sessionCombo = persistedState.sessionCombo || 1;
        persistedState.claimedMilestones = persistedState.claimedMilestones || {};
        persistedState.hasWellRestedBuff = Boolean(persistedState.hasWellRestedBuff);
        persistedState.catMoraleBuffUntil = persistedState.catMoraleBuffUntil || 0;
        persistedState.leaderboards = persistedState.leaderboards || { ...DEFAULT_LEADERBOARDS };
        persistedState.hasWellRestedBuff = Boolean(persistedState.hasWellRestedBuff);

        const botNames = [
          'Elena V.', 'Mert Y.', 'Liam K.', 'Elena Voronina', 'Liam Keller',
          'Aoi Takahashi', 'David Miller', 'Selin Aydın', 'Lucas Petit', 'Hana Song'
        ];
        if (Array.isArray(persistedState.combatLogs)) {
          persistedState.combatLogs = persistedState.combatLogs.filter(
            (log: any) => !log.userName || log.userName === 'Sen' || !botNames.includes(log.userName)
          );
        }
        const validIds: BossId[] = ['horologium', 'acedia', 'cacophony', 'oblivion'];
        if (!validIds.includes(persistedState.currentBossId)) {
          persistedState.currentBossId = 'horologium';
        }
        if (persistedState.bosses) {
          validIds.forEach((id) => {
            if (persistedState.bosses[id]) {
              persistedState.bosses[id].unlockLevel = DEFAULT_BOSSES[id].unlockLevel;
              persistedState.bosses[id].themeColor = DEFAULT_BOSSES[id].themeColor;
            } else {
              persistedState.bosses[id] = { ...DEFAULT_BOSSES[id] };
            }
          });
        } else {
          persistedState.bosses = { ...DEFAULT_BOSSES };
        }
        return persistedState;
      },
    }
  )
);

// Real-time Incoming BroadcastChannel Listener
if (raidBroadcastChannel) {
  raidBroadcastChannel.onmessage = (event) => {
    const data = event.data;
    if (data && data.type === 'BOSS_ATTACK') {
      useBossRaidStore.getState().handleRemoteBossAttack(data);
    }
  };
}
