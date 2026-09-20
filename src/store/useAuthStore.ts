import { create } from 'zustand';
import { AuthUser, subscribeToAuthState, signOutUser } from '../firebase/auth';
import { loadUserStats, saveUserStats, loadUserSettings, saveUserSettings } from '../firebase/sync';
import { useStatsStore } from './useStatsStore';
import { useAppStore } from './useAppStore';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isSyncing: boolean;
  isAuthReady: boolean;  // true once first auth check complete

  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  signOut: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isSyncing: false,
  isAuthReady: false,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSyncing: (isSyncing) => set({ isSyncing }),

  signOut: async () => {
    await signOutUser();
    set({ user: null });
  },

  syncToCloud: async () => {
    const { user } = get();
    if (!user) return;

    set({ isSyncing: true });
    try {
      const stats = useStatsStore.getState();
      const app = useAppStore.getState();

      await Promise.all([
        saveUserStats(user.uid, {
          sessions: stats.sessions,
          streakDays: stats.streakDays,
          lastSessionDate: stats.lastSessionDate,
        }),
        saveUserSettings(user.uid, {
          language: app.language,
          activeRoom: app.activeRoom,
          timeOfDay: app.timeOfDay,
          weather: app.weather,
          lampOn: app.lampOn,
          crtOverlay: app.crtOverlay,
          reduceMotion: app.reduceMotion,
          soundFxEnabled: app.soundFxEnabled,
          dailyGoalMinutes: app.dailyGoalMinutes,
        }),
      ]);
    } catch (err) {
      console.warn('Cloud sync failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  },

  loadFromCloud: async () => {
    const { user } = get();
    if (!user) return;

    set({ isSyncing: true });
    try {
      const [cloudStats, cloudSettings] = await Promise.all([
        loadUserStats(user.uid),
        loadUserSettings(user.uid),
      ]);

      if (cloudStats && cloudStats.sessions && cloudStats.sessions.length > 0) {
        // Merge cloud data with local — take cloud if it has more sessions
        const localSessions = useStatsStore.getState().sessions;
        if (cloudStats.sessions.length >= localSessions.length) {
          useStatsStore.setState({
            sessions: cloudStats.sessions,
            streakDays: cloudStats.streakDays,
            lastSessionDate: cloudStats.lastSessionDate,
          });
        }
      }

      if (cloudSettings && Object.keys(cloudSettings).length > 0) {
        const { language, activeRoom, timeOfDay, weather, lampOn, crtOverlay, reduceMotion, soundFxEnabled, dailyGoalMinutes } = cloudSettings;
        useAppStore.setState({
          ...(language && { language }),
          ...(activeRoom && { activeRoom }),
          ...(timeOfDay && { timeOfDay }),
          ...(weather && { weather }),
          ...(lampOn !== undefined && { lampOn }),
          ...(crtOverlay !== undefined && { crtOverlay }),
          ...(reduceMotion !== undefined && { reduceMotion }),
          ...(soundFxEnabled !== undefined && { soundFxEnabled }),
          ...(dailyGoalMinutes && { dailyGoalMinutes }),
        });
      }
    } catch (err) {
      console.warn('Cloud load failed:', err);
    } finally {
      set({ isSyncing: false });
    }
  },
}));

// Initialize auth listener on module load
let unsubscribe: (() => void) | null = null;

if (typeof window !== 'undefined') {
  unsubscribe = subscribeToAuthState(async (user) => {
    useAuthStore.setState({ user, isLoading: false, isAuthReady: true });
    if (user) {
      // Load user's cloud data on sign-in
      setTimeout(() => {
        useAuthStore.getState().loadFromCloud();
      }, 500);
    }
  });
}

export { unsubscribe };
