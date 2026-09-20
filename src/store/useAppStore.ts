import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoomId, TimeOfDay, WeatherType, InteractiveObjectId } from '../types';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { useGamificationStore } from './useGamificationStore';
import { useAudioStore } from './useAudioStore';
import { webAudioEngine } from '../audio/WebAudioEngine';

export type ActiveModalType = 
  | 'none' 
  | 'mixer' 
  | 'stats' 
  | 'journal' 
  | 'rooms' 
  | 'settings' 
  | 'timer_custom' 
  | 'progression'
  | 'shortcuts'
  | 'auth'
  | 'gamification'
  | 'subscription'
  | 'break_guide'
  | 'tasks'
  | 'command_palette'
  | 'globe_explorer'
  | 'checkout'
  | 'boss_raid'
  | 'session_share'
  | 'north_star_goal'
  | 'profile';

interface AppState {
  language: Language;
  activeRoom: RoomId;
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  isAutoTime: boolean;
  lampOn: boolean;
  mugHot: boolean;
  fireplaceActive: boolean;
  immersiveMode: boolean;
  crtOverlay: boolean;
  reduceMotion: boolean;
  soundFxEnabled: boolean;
  dailyGoalMinutes: number;
  breakMode: 'none' | 'short' | 'long';
  isFullscreen: boolean;
  activeModal: ActiveModalType;
  hoveredObject: InteractiveObjectId | null;
  toastMessage: string | null;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setActiveRoom: (room: RoomId) => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  setWeather: (weather: WeatherType) => void;
  setAutoTime: (auto: boolean) => void;
  toggleLamp: () => void;
  setLamp: (on: boolean) => void;
  sipMug: () => void;
  toggleFireplace: () => void;
  setFireplace: (active: boolean) => void;
  toggleImmersiveMode: () => void;
  setImmersiveMode: (immersive: boolean) => void;
  toggleCrtOverlay: () => void;
  toggleReduceMotion: () => void;
  toggleSoundFx: () => void;
  setDailyGoalMinutes: (mins: number) => void;
  setBreakMode: (mode: 'none' | 'short' | 'long') => void;
  toggleFullscreen: () => void;
  setActiveModal: (modal: ActiveModalType) => void;
  setHoveredObject: (obj: InteractiveObjectId | null) => void;
  showToast: (msg: string, durationMs?: number) => void;
}

export function getSystemTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'golden_hour';
  if (hour >= 20 && hour < 23) return 'evening';
  return 'midnight';
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      language: 'tr',
      activeRoom: 'bedroom',
      timeOfDay: getSystemTimeOfDay(),
      weather: 'rain',
      isAutoTime: true,
      lampOn: true,
      mugHot: true,
      fireplaceActive: true,
      immersiveMode: false,
      crtOverlay: true,
      reduceMotion: false,
      soundFxEnabled: true,
      dailyGoalMinutes: 120,
      breakMode: 'none',
      isFullscreen: false,
      activeModal: 'none',
      hoveredObject: null,
      toastMessage: null,

      setLanguage: (language) => {
        set({ language });
        get().showToast(language === 'tr' ? 'Türkçe dili etkinleştirildi 🇹🇷' : 'English language enabled 🇬🇧', 2000);
      },
      setActiveRoom: (activeRoom) => set({ activeRoom }),
      setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
      setWeather: (weather) => {
        set({ weather });
        // Automatically adapt soundscape to match weather
        try {
          webAudioEngine.init();
          const audio = useAudioStore.getState();
          if (weather === 'storm') {
            audio.setChannelVolume('rain', 0.85);
            audio.setChannelVolume('wind', 0.45);
            audio.setChannelVolume('thunder', 0.75);
            webAudioEngine.playThunderStrike(0.9);
          } else if (weather === 'heavy_rain') {
            audio.setChannelVolume('rain', 0.85);
            audio.setChannelVolume('wind', 0.25);
            audio.setChannelVolume('thunder', 0.15);
          } else if (weather === 'rain') {
            audio.setChannelVolume('rain', 0.55);
            audio.setChannelVolume('wind', 0.05);
            audio.setChannelVolume('thunder', 0);
          } else if (weather === 'snow') {
            audio.setChannelVolume('rain', 0);
            audio.setChannelVolume('wind', 0.35);
            audio.setChannelVolume('thunder', 0);
          } else if (weather === 'clear') {
            audio.setChannelVolume('rain', 0);
            audio.setChannelVolume('thunder', 0);
          }
        } catch (e) {
          console.warn('Weather audio sync error', e);
        }
      },
      setAutoTime: (isAutoTime) => {
        set({ isAutoTime });
        if (isAutoTime) {
          set({ timeOfDay: getSystemTimeOfDay() });
        }
      },
      toggleLamp: () => set((state) => ({ lampOn: !state.lampOn })),
      setLamp: (lampOn) => set({ lampOn }),
      sipMug: () => {
        set({ mugHot: true });
        const lang = get().language;
        get().showToast(TRANSLATIONS[lang].toasts.coffeeSip, 2500);
        // Track mug click in gamification
        useGamificationStore.getState().incrementMugClicks();
      },
      toggleFireplace: () => set((state) => ({ fireplaceActive: !state.fireplaceActive })),
      setFireplace: (fireplaceActive) => set({ fireplaceActive }),
      toggleImmersiveMode: () => {
        const next = !get().immersiveMode;
        const lang = get().language;
        set({ 
          immersiveMode: next,
          activeModal: 'none'
        });
        if (next) {
          get().showToast(
            lang === 'tr' 
              ? '✨ Zen Odak Modu: Arayüz gizlendi (ESC veya I ile çıkabilirsiniz)' 
              : '✨ Zen Focus Mode: UI hidden (Press ESC or I to exit)', 
            3000
          );
        } else {
          get().showToast(
            lang === 'tr' 
              ? 'Odak modundan çıkıldı' 
              : 'Exited focus mode', 
            2000
          );
        }
      },
      setImmersiveMode: (immersiveMode) => set({ immersiveMode }),
      toggleCrtOverlay: () => set((state) => ({ crtOverlay: !state.crtOverlay })),
      toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
      toggleSoundFx: () => set((state) => ({ soundFxEnabled: !state.soundFxEnabled })),
      setDailyGoalMinutes: (dailyGoalMinutes) => set({ dailyGoalMinutes }),
      setBreakMode: (breakMode) => set({ breakMode }),
      toggleFullscreen: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          set({ isFullscreen: true });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          set({ isFullscreen: false });
        }
      },
      setActiveModal: (activeModal) => set({ activeModal }),
      setHoveredObject: (hoveredObject) => set({ hoveredObject }),
      showToast: (toastMessage, durationMs = 3000) => {
        set({ toastMessage });
        setTimeout(() => {
          if (get().toastMessage === toastMessage) {
            set({ toastMessage: null });
          }
        }, durationMs);
      }
    }),
    {
      name: 'cozy_room_app_settings',
      partialize: (state) => ({
        language: state.language,
        activeRoom: state.activeRoom,
        timeOfDay: state.timeOfDay,
        weather: state.weather,
        isAutoTime: state.isAutoTime,
        lampOn: state.lampOn,
        crtOverlay: state.crtOverlay,
        reduceMotion: state.reduceMotion,
        soundFxEnabled: state.soundFxEnabled,
        dailyGoalMinutes: state.dailyGoalMinutes,
      }),
    }
  )
);
