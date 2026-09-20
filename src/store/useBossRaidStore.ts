import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { webAudioEngine } from '../audio/WebAudioEngine';
import { useAppStore } from './useAppStore';

export type BossId = 'horologium' | 'acedia' | 'cacophony' | 'oblivion';

export interface BossData {
  id: BossId;
  name: string;
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

export interface CommunityRaider {
  name: string;
  city: string;
}

const SAMPLE_RAIDERS: CommunityRaider[] = [
  { name: 'Elena V.', city: 'Kyoto' },
  { name: 'Mert Y.', city: 'Istanbul' },
  { name: 'Liam K.', city: 'London' },
  { name: 'Aoi S.', city: 'Tokyo' },
  { name: 'Selin A.', city: 'Berlin' },
  { name: 'David M.', city: 'New York' },
  { name: 'Lucas P.', city: 'Paris' },
  { name: 'Hana T.', city: 'Seoul' },
  { name: 'Zeynep B.', city: 'Ankara' },
  { name: 'Mateo C.', city: 'Madrid' },
  { name: 'Oliver W.', city: 'Stockholm' },
  { name: 'Camila R.', city: 'São Paulo' },
  { name: 'Can E.', city: 'Izmir' },
  { name: 'Nadia F.', city: 'Vienna' },
];

export const DEFAULT_BOSSES: Record<BossId, BossData> = {
  horologium: {
    id: 'horologium',
    name: 'Horologium',
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

interface BossRaidState {
  currentBossId: BossId;
  bosses: Record<BossId, BossData>;
  unlockedTrophies: string[];
  totalBossDamageDealt: number;
  personalDamagePerBoss: Record<string, number>;
  combatLogs: CombatLogEntry[];
  globalRaidersCount: number;
  lastAttackResult: {
    damage: number;
    isCritical: boolean;
    bossName: string;
    defeated: boolean;
    timestamp: number;
  } | null;

  // Actions
  setCurrentBoss: (bossId: BossId) => void;
  attackCurrentBoss: (focusMinutes: number, hasGoalPledge: boolean) => { damage: number; isCritical: boolean; defeated: boolean };
  quickPracticeStrike: () => { damage: number; isCritical: boolean; defeated: boolean };
  simulateCommunityAttack: () => void;
  resetBoss: (bossId: string) => void;
  unlockTrophy: (trophyId: string) => void;
  isTrophyUnlocked: (trophyId: string) => boolean;
}

export const useBossRaidStore = create<BossRaidState>()(
  persist(
    (set, get) => ({
      currentBossId: 'horologium',
      bosses: { ...DEFAULT_BOSSES },
      unlockedTrophies: [],
      totalBossDamageDealt: 0,
      personalDamagePerBoss: {},
      globalRaidersCount: 1428,
      combatLogs: [
        {
          id: 'init-1',
          timestamp: Date.now() - 14000,
          bossId: 'horologium',
          damage: 250,
          isCritical: true,
          minutes: 50,
          isCommunity: true,
          userName: 'Elena V.',
          location: 'Kyoto',
        },
        {
          id: 'init-2',
          timestamp: Date.now() - 32000,
          bossId: 'horologium',
          damage: 100,
          isCritical: false,
          minutes: 25,
          isCommunity: true,
          userName: 'Mert Y.',
          location: 'Istanbul',
        },
        {
          id: 'init-3',
          timestamp: Date.now() - 58000,
          bossId: 'acedia',
          damage: 200,
          isCritical: true,
          minutes: 30,
          isCommunity: true,
          userName: 'Liam K.',
          location: 'London',
        },
      ],
      lastAttackResult: null,

      setCurrentBoss: (currentBossId) => set({ currentBossId }),

      attackCurrentBoss: (focusMinutes: number, hasGoalPledge: boolean) => {
        const state = get();
        const boss = state.bosses[state.currentBossId] || state.bosses.horologium;

        // Base damage: 4 DMG per minute (25m = 100 DMG, 50m = 250 DMG with +50 flow bonus)
        let baseDamage = focusMinutes * 4;
        if (focusMinutes >= 50) {
          baseDamage += 50;
        }

        // Critical Strike Multiplier: 2x if North Star goal was pledged and completed!
        const isCritical = hasGoalPledge;
        const totalDamage = Math.round(isCritical ? baseDamage * 2.0 : baseDamage);

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

        // Audio & Toast Feedback
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

        return { damage: totalDamage, isCritical, defeated };
      },

      quickPracticeStrike: () => {
        const state = get();
        const boss = state.bosses[state.currentBossId] || state.bosses.horologium;
        if (boss.isDefeated) return { damage: 0, isCritical: false, defeated: false };

        const isCrit = Math.random() < 0.35;
        const damage = isCrit ? 150 : 80;
        const newHp = Math.max(0, boss.currentHp - damage);
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
          id: `practice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          bossId: boss.id,
          damage,
          isCritical: isCrit,
          minutes: 15,
          note: '⚡ Hızlı Test Vuruşu',
        };

        const currentBossPersonalDmg = (state.personalDamagePerBoss[boss.id] || 0) + damage;

        set({
          bosses: {
            ...state.bosses,
            [boss.id]: updatedBoss,
          },
          unlockedTrophies: newUnlockedTrophies,
          totalBossDamageDealt: state.totalBossDamageDealt + damage,
          personalDamagePerBoss: {
            ...state.personalDamagePerBoss,
            [boss.id]: currentBossPersonalDmg,
          },
          combatLogs: [logEntry, ...state.combatLogs.slice(0, 49)],
          lastAttackResult: {
            damage,
            isCritical: isCrit,
            bossName: boss.name,
            defeated,
            timestamp: Date.now(),
          },
        });

        if (defeated) {
          webAudioEngine.playBossVictory();
        } else if (isCrit) {
          webAudioEngine.playBossCrit();
        } else {
          webAudioEngine.playBossHit();
        }

        return { damage, isCritical: isCrit, defeated };
      },

      simulateCommunityAttack: () => {
        const state = get();
        const boss = state.bosses[state.currentBossId];
        if (!boss || boss.isDefeated) return;

        const raider = SAMPLE_RAIDERS[Math.floor(Math.random() * SAMPLE_RAIDERS.length)];
        const isCrit = Math.random() < 0.35;
        const minutes = Math.random() < 0.6 ? 25 : 50;
        const damage = isCrit ? (minutes === 50 ? 500 : 200) : (minutes === 50 ? 250 : 100);

        const newHp = Math.max(0, boss.currentHp - damage);
        const defeated = newHp === 0 && !boss.isDefeated;

        const logEntry: CombatLogEntry = {
          id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          bossId: boss.id,
          damage,
          isCritical: isCrit,
          minutes,
          isCommunity: true,
          userName: raider.name,
          location: raider.city,
        };

        const delta = Math.floor(Math.random() * 7) - 3;
        const newCount = Math.max(1200, state.globalRaidersCount + delta);

        set({
          bosses: {
            ...state.bosses,
            [boss.id]: {
              ...boss,
              currentHp: newHp,
              isDefeated: boss.isDefeated || defeated,
            },
          },
          globalRaidersCount: newCount,
          combatLogs: [logEntry, ...state.combatLogs.slice(0, 49)],
        });
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
        }));
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
    }),
    {
      name: 'cozy_chronos_boss_raids',
      version: 3,
      migrate: (persistedState: any) => {
        if (!persistedState) return persistedState;
        const validIds: BossId[] = ['horologium', 'acedia', 'cacophony', 'oblivion'];
        if (!validIds.includes(persistedState.currentBossId)) {
          persistedState.currentBossId = 'horologium';
        }
        persistedState.bosses = { ...DEFAULT_BOSSES };
        return persistedState;
      },
    }
  )
);
