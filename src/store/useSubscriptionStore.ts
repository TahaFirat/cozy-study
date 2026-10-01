import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly' | 'lifetime';

export type ProFeature = 
  | 'all_rooms'
  | 'binaural_beats'
  | 'cat_purr'
  | 'all_soundscapes'
  | 'spatial_audio'
  | 'kanban_tasks'
  | 'custom_pomodoro'
  | 'export_csv'
  | 'export_pdf'
  | 'streak_freeze'
  | 'crt_shaders'
  | 'wallpaper_download'
  | 'cat_customization'
  | 'zen_mode'
  | 'ai_focus_coach'
  | 'focus_contract'
  | 'live_weather_sync'
  | 'distraction_shield'
  | 'bio_rhythm_analytics'
  | 'private_study_rooms'
  | 'study_rpg_evolution'
  | 'mindful_journal_pro'
  | 'soundscape_presets'
  | 'chime_variations'
  | 'clock_styles'
  | 'pro_badges';

interface SubscriptionState {
  isPro: boolean;
  plan: SubscriptionPlan;
  subscribedAt: string | null;
  expiresAt: string | null;
  streakFreezesAvailable: number;
  selectedCatBreed: 'tabby' | 'black' | 'white' | 'calico' | 'tuxedo';
  selectedClockStyle: 'flip' | 'digital' | 'nixie' | 'minimal';
  selectedCrtTheme: 'classic' | 'amber' | 'green_matrix' | 'gameboy' | 'cyberpunk';
  weatherIntensity: number; // 0.2 to 2.0
  selectedChime: 'singing_bowl' | 'wood_block' | 'retro_bell' | 'digital' | 'zen_gong';
  activeSoundscapePreset: string | null;

  // Actions
  upgradeToPro: (plan: SubscriptionPlan) => void;
  cancelPro: () => void;
  hasAccess: (feature: ProFeature) => boolean;
  useStreakFreeze: () => boolean;
  addStreakFreeze: (count?: number) => void;
  setCatBreed: (breed: 'tabby' | 'black' | 'white' | 'calico' | 'tuxedo') => void;
  setClockStyle: (style: 'flip' | 'digital' | 'nixie' | 'minimal') => void;
  setCrtTheme: (theme: 'classic' | 'amber' | 'green_matrix' | 'gameboy' | 'cyberpunk') => void;
  setWeatherIntensity: (val: number) => void;
  setSelectedChime: (chime: 'singing_bowl' | 'wood_block' | 'retro_bell' | 'digital' | 'zen_gong') => void;
  setActiveSoundscapePreset: (presetId: string | null) => void;
}

// Ödeme ve Paywall anahtarı (Şimdilik her şey ücretsiz ve açık, kodlar korundu)
export const PAYWALL_ENABLED = false;

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      isPro: true,
      plan: 'lifetime',
      subscribedAt: null,
      expiresAt: null,
      streakFreezesAvailable: 3,
      selectedCatBreed: 'tabby',
      selectedClockStyle: 'flip',
      selectedCrtTheme: 'classic',
      weatherIntensity: 1.0,
      selectedChime: 'singing_bowl',
      activeSoundscapePreset: null,

      upgradeToPro: (plan) => {
        set({
          isPro: true,
          plan,
        });
      },

      cancelPro: () => {
        set({
          isPro: true,
          plan: 'lifetime',
        });
      },

      hasAccess: (_feature) => {
        return true;
      },

      useStreakFreeze: () => {
        const current = get().streakFreezesAvailable;
        if (current > 0) {
          set({ streakFreezesAvailable: current - 1 });
          return true;
        }
        return false;
      },

      addStreakFreeze: (count = 1) => {
        set({ streakFreezesAvailable: get().streakFreezesAvailable + count });
      },

      setCatBreed: (selectedCatBreed) => set({ selectedCatBreed }),
      setClockStyle: (selectedClockStyle) => set({ selectedClockStyle }),
      setCrtTheme: (selectedCrtTheme) => set({ selectedCrtTheme }),
      setWeatherIntensity: (weatherIntensity) => set({ weatherIntensity }),
      setSelectedChime: (selectedChime) => set({ selectedChime }),
      setActiveSoundscapePreset: (activeSoundscapePreset) => set({ activeSoundscapePreset }),
    }),
    {
      name: 'cozy_room_subscription',
      onRehydrateStorage: () => (state) => {
        if (!PAYWALL_ENABLED && state) {
          state.isPro = true;
          state.plan = 'lifetime';
        }
      },
    }
  )
);
