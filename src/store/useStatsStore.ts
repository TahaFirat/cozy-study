import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FocusSession, ProgressionItem, RoomId } from '../types';
import { useGamificationStore } from './useGamificationStore';
import { useAuthStore } from './useAuthStore';
import { useAppStore } from './useAppStore';

export const PROGRESSION_TIERS: ProgressionItem[] = [
  {
    id: 'bonsai',
    hoursRequired: 5,
    title: 'Yeşil Masa Bonzaisi',
    description: 'El yapımı seramik saksıda küçük bir ardıç bonzaisi, pencerenin yanında sessizce büyüyor.',
    rewardType: 'plant',
    unlocked: false,
  },
  {
    id: 'leather_books',
    hoursRequired: 10,
    title: 'Antika Deri Ciltli Kitaplar',
    description: 'Orta rafa dizilmiş, altın kabartmalı vintage felsefe ve astronomi folio\'ları.',
    rewardType: 'books',
    unlocked: false,
  },
  {
    id: 'walnut_desk',
    hoursRequired: 25,
    title: 'El Yapımı Ceviz Çalışma Masası',
    description: 'Pirinç kalem yuvalı ve kıvrık kablolarıyla sıcak, el rendeli koyu ceviz masa.',
    rewardType: 'desk',
    unlocked: false,
  },
  {
    id: 'wall_art',
    hoursRequired: 50,
    title: 'Peri Işıkları & İlham Posterleri',
    description: 'Duvarları süsleyen çerçeveli stüdyo posterleriyle birlikte yumuşakça titreşen sarı peri ışıkları.',
    rewardType: 'posters',
    unlocked: false,
  },
  {
    id: 'grand_hearth',
    hoursRequired: 100,
    title: 'Büyük Taş Şömine',
    description: 'Kalın meşe rafı ve pirinç şömine aletleriyle el kesen taşlardan örülmüş görkemli bir ocak.',
    rewardType: 'fireplace',
    unlocked: false,
  },
  {
    id: 'golden_calico',
    hoursRequired: 250,
    title: 'Alacalı Kedi Dostu',
    description: 'Çay kupasının yanına kıvrılıp uyuyan tatlı, üç renkli alacalı bir dost.',
    rewardType: 'pet',
    unlocked: false,
  },
  {
    id: 'celestial_telescope',
    hoursRequired: 500,
    title: 'Yıldız Gözlem Teleskobu & Kristal',
    description: 'Pencerenin önüne yerleştirilmiş, takımyıldızlara uzanan parlak pirinç astronomik teleskop.',
    rewardType: 'secret',
    unlocked: false,
  },
];

interface StatsState {
  sessions: FocusSession[];
  streakDays: number;
  lastSessionDate: string | null; // YYYY-MM-DD

  // Actions
  recordSession: (durationMinutes: number, roomId: RoomId, note?: string) => void;
  getTotalFocusMinutes: () => number;
  getTotalFocusHours: () => number;
  getTodayMinutes: () => number;
  getThisWeekMinutes: () => number;
  getStreakDays: () => number;
  getUnlockedProgression: () => ProgressionItem[];
  getHeatmapDays: () => { date: string; minutes: number; intensity: number }[];
  getYearlyHeatmapDays: (locale?: string) => { date: string; minutes: number; intensity: number; month: string; dayOfWeek: number }[];
  deleteSession: (id: string) => void;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      sessions: [
        // Başlangıç oturumları — kullanıcıya günlük ve ısı haritasının güzelliğini hemen gösterir
        {
          id: 'seed-1',
          timestamp: Date.now() - 86400000 * 2,
          durationMinutes: 50,
          roomId: 'bedroom',
          note: 'Mimari desenler üzerine okuma yaptım ve huzurlu oda düzenlerini taslak çıkardım.',
          tag: 'Derin Odak',
        },
        {
          id: 'seed-2',
          timestamp: Date.now() - 86400000,
          durationMinutes: 25,
          roomId: 'bedroom',
          note: 'Cama vuran yağmurla birlikte akşam odak seansı. Çok verimli geçti.',
          tag: 'Okuma',
        }
      ],
      streakDays: 2,
      lastSessionDate: getTodayString(),

      recordSession: (durationMinutes, roomId, note) => {
        const today = getTodayString();
        const lastDate = get().lastSessionDate;
        let newStreak = get().streakDays;

        if (!lastDate) {
          newStreak = 1;
        } else if (lastDate === today) {
          // Already continued today, streak stays intact
        } else {
          const yDate = new Date();
          yDate.setDate(yDate.getDate() - 1);
          const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;
          if (lastDate === yesterdayStr) {
            newStreak += 1;
          } else {
            // Streak reset to 1
            newStreak = 1;
          }
        }

        const newSession: FocusSession = {
          id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          durationMinutes,
          roomId,
          note: note || '',
          tag: 'Focus Session',
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          streakDays: newStreak,
          lastSessionDate: today,
        }));

        // Trigger gamification updates (XP & badges)
        const gam = useGamificationStore.getState();
        const now = new Date();
        const currentLiveWeather = useAppStore.getState().weather;
        gam.checkBadgesAfterSession({
          durationMinutes,
          roomId,
          weather: currentLiveWeather,
          hour: now.getHours(),
        });
        gam.checkStreakBadges(newStreak);
        gam.checkLegendBadge(get().getTotalFocusHours());

        // Auto-sync to cloud if signed in
        useAuthStore.getState().syncToCloud();
      },

      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },

      getTotalFocusMinutes: () => {
        return get().sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      },

      getTotalFocusHours: () => {
        return Number((get().getTotalFocusMinutes() / 60).toFixed(1));
      },

      getTodayMinutes: () => {
        const today = getTodayString();
        return get().sessions
          .filter((s) => {
            const d = new Date(s.timestamp);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return dateStr === today;
          })
          .reduce((acc, s) => acc + s.durationMinutes, 0);
      },

      getThisWeekMinutes: () => {
        const weekAgo = Date.now() - 7 * 86400000;
        return get().sessions
          .filter((s) => s.timestamp >= weekAgo)
          .reduce((acc, s) => acc + s.durationMinutes, 0);
      },

      getStreakDays: () => get().streakDays,

      getUnlockedProgression: () => {
        const totalHours = get().getTotalFocusHours();
        return PROGRESSION_TIERS.map((tier) => ({
          ...tier,
          unlocked: totalHours >= tier.hoursRequired,
        }));
      },

      getHeatmapDays: () => {
        const days = [];
        const now = new Date();
        const map = new Map<string, number>();

        get().sessions.forEach((s) => {
          const d = new Date(s.timestamp);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          map.set(key, (map.get(key) || 0) + s.durationMinutes);
        });

        // Last 21 days
        for (let i = 20; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const mins = map.get(key) || 0;
          let intensity = 0;
          if (mins > 0) intensity = 1;
          if (mins >= 25) intensity = 2;
          if (mins >= 60) intensity = 3;
          if (mins >= 120) intensity = 4;
          days.push({ date: key, minutes: mins, intensity });
        }
        return days;
      },

      getYearlyHeatmapDays: (locale) => {
        const days = [];
        const now = new Date();
        const map = new Map<string, number>();
        const targetLocale = locale || (useAppStore.getState().language === 'tr' ? 'tr-TR' : 'en-US');

        get().sessions.forEach((s) => {
          const d = new Date(s.timestamp);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          map.set(key, (map.get(key) || 0) + s.durationMinutes);
        });

        // 52 weeks = 364 days
        for (let i = 363; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const mins = map.get(key) || 0;
          let intensity = 0;
          if (mins > 0) intensity = 1;
          if (mins >= 25) intensity = 2;
          if (mins >= 60) intensity = 3;
          if (mins >= 120) intensity = 4;
          const month = d.toLocaleString(targetLocale, { month: 'short' });
          const dayOfWeek = d.getDay();
          days.push({ date: key, minutes: mins, intensity, month, dayOfWeek });
        }
        return days;
      },
    }),
    {
      name: 'cozy_room_study_stats',
    }
  )
);
